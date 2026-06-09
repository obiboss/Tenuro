import "server-only";

import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError, isAppError } from "@/server/errors/app-error";
import {
  getGatewayPaymentIntentByReference,
  markGatewayPaymentIntentFailed,
  markGatewayPaymentIntentPaid,
} from "@/server/repositories/gateway-payment.repository";
import {
  markGatewayPaymentEventFailed,
  markGatewayPaymentEventIgnored,
  markGatewayPaymentEventProcessed,
  registerGatewayPaymentEvent,
} from "@/server/repositories/gateway-payment-event.repository";
import { recordGatewayRentPaymentViaRpc } from "@/server/repositories/payments.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import {
  getUnitById,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { verifyAgentTenantProcessingFeeReference } from "@/server/services/agent-processing-fee.service";
import { verifyAndPostDeveloperPaymentReference } from "@/server/services/developer-payment.service";
import { verifyTenantApplicationProcessingFeeReference } from "@/server/services/tenant-application-processing-fees.service";
import {
  auditGatewayPaymentReplayIgnored,
  buildPaystackRentPaymentIdempotencyKey,
  completeGatewayPaymentAllocationsSafely,
  findExistingPaystackRentPayment,
  generateGatewayRentReceiptSafely,
  getGatewayPaymentVerificationPhase,
  shouldVerifyGatewayIntentWithPaystack,
} from "@/server/services/gateway-payment-idempotency.service";
import {
  convertKoboToNaira,
  convertNairaToKobo,
  parsePaystackWebhook,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type GatewayPaymentWebhookResult = {
  status: "processed" | "duplicate" | "ignored" | "failed";
  message: string;
  paymentId?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Payment could not be processed.";
}

function isGatewayIntentNotFoundError(error: unknown) {
  return isAppError(error) && error.code === "GATEWAY_INTENT_NOT_FOUND";
}

function assertAmountsMatch(params: {
  verifiedAmountKobo: number;
  expectedTotalNaira: number;
}) {
  const expectedKobo = convertNairaToKobo(params.expectedTotalNaira);
  const difference = Math.abs(params.verifiedAmountKobo - expectedKobo);

  if (difference >= 1) {
    throw new AppError(
      "PAYSTACK_AMOUNT_MISMATCH",
      "Payment amount does not match the initialized payment.",
      400,
    );
  }
}

function mapPaystackStatusToIntentStatus(status: string) {
  if (status === "failed") {
    return "failed" as const;
  }

  if (status === "abandoned") {
    return "abandoned" as const;
  }

  return "failed" as const;
}

function isFirstRentPaymentIntent(metadata: Record<string, unknown>) {
  return (
    metadata.payment_purpose === "new_tenant_first_rent" ||
    metadata.automatic_after_agreement === true
  );
}

function isDeveloperPaymentReference(reference: string) {
  return reference.trim().toUpperCase().startsWith("BPD-");
}

function getWebhookData(rawPayload: Record<string, unknown>) {
  return toRecord(rawPayload.data);
}

function getWebhookMetadata(rawPayload: Record<string, unknown>) {
  return toRecord(getWebhookData(rawPayload).metadata);
}

function isDeveloperInstallmentWebhook(params: {
  reference: string;
  rawPayload?: Record<string, unknown>;
}) {
  if (isDeveloperPaymentReference(params.reference)) {
    return true;
  }

  const metadata = params.rawPayload
    ? getWebhookMetadata(params.rawPayload)
    : {};

  return (
    metadata.product === "boldverse_developer_module" ||
    metadata.payment_type === "developer_installment"
  );
}

async function markUnitOccupiedAfterFirstRentPayment(params: {
  tenancyId: string;
  paymentId: string;
  paystackReference: string;
}) {
  const supabase = createSupabaseAdminClient();
  const tenancy = await getTenancyPaymentContext(supabase, params.tenancyId);
  const unit = await getUnitById(supabase, tenancy.unit_id);

  if (unit.status === "occupied") {
    return;
  }

  if (unit.status !== "reserved" && unit.status !== "vacant") {
    await writeSystemAuditLog({
      landlordId: tenancy.landlord_id,
      tenantId: tenancy.tenant_id,
      tenancyId: tenancy.id,
      unitId: tenancy.unit_id,
      eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
      entityType: AUDIT_ENTITY_TYPES.unit,
      entityId: tenancy.unit_id,
      description:
        "First rent payment confirmed, but unit status was not changed because the unit is not in a reservable state.",
      metadata: {
        payment_id: params.paymentId,
        paystack_reference: params.paystackReference,
        current_unit_status: unit.status,
        expected_statuses: ["reserved", "vacant"],
        reason: "first_rent_payment_unit_status_not_transitionable",
      },
    });

    return;
  }

  const occupiedUnit = await markUnitOccupied(supabase, tenancy.unit_id);

  await writeSystemAuditLog({
    landlordId: tenancy.landlord_id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    unitId: tenancy.unit_id,
    eventType: AUDIT_EVENT_TYPES.unitStatusChanged,
    entityType: AUDIT_ENTITY_TYPES.unit,
    entityId: tenancy.unit_id,
    description: `${occupiedUnit.unit_identifier} was marked occupied after first rent payment.`,
    metadata: {
      payment_id: params.paymentId,
      paystack_reference: params.paystackReference,
      previous_unit_status: unit.status,
      new_unit_status: occupiedUnit.status,
      reason: "first_rent_payment_confirmed",
    },
  });
}

async function markUnitOccupiedAfterFirstRentPaymentSafely(params: {
  tenancyId: string;
  paymentId: string;
  paystackReference: string;
}) {
  try {
    await markUnitOccupiedAfterFirstRentPayment(params);
  } catch (error) {
    console.error(
      "Failed to mark unit occupied after first rent payment:",
      error,
    );
  }
}

async function finalizeGatewayPaymentSettlement(params: {
  intent: Awaited<ReturnType<typeof getGatewayPaymentIntentByReference>>;
  paymentId: string;
  isReplay: boolean;
  replaySource?:
    | "webhook"
    | "verify_page"
    | "landlord_verify"
    | "reconciliation";
}) {
  if (!params.intent) {
    return;
  }

  await completeGatewayPaymentAllocationsSafely({
    gatewayPaymentIntentId: params.intent.id,
    rentPaymentId: params.paymentId,
  });

  if (isFirstRentPaymentIntent(params.intent.metadata)) {
    await markUnitOccupiedAfterFirstRentPaymentSafely({
      tenancyId: params.intent.tenancy_id,
      paymentId: params.paymentId,
      paystackReference: params.intent.paystack_reference,
    });
  }

  await generateGatewayRentReceiptSafely(params.paymentId);

  if (params.isReplay && params.replaySource === "webhook") {
    await auditGatewayPaymentReplayIgnored({
      intent: params.intent,
      paymentId: params.paymentId,
      source: params.replaySource,
      reason: "payment_already_settled",
    });
  }
}

async function returnDuplicateGatewayPaymentResult(params: {
  intent: NonNullable<
    Awaited<ReturnType<typeof getGatewayPaymentIntentByReference>>
  >;
  paymentId: string;
  replaySource?:
    | "webhook"
    | "verify_page"
    | "landlord_verify"
    | "reconciliation";
}) {
  await finalizeGatewayPaymentSettlement({
    intent: params.intent,
    paymentId: params.paymentId,
    isReplay: true,
    replaySource: params.replaySource,
  });

  return {
    status: "duplicate" as const,
    message: "Gateway payment already recorded.",
    paymentId: params.paymentId,
  };
}

export async function processVerifiedGatewayPaymentReference(
  reference: string,
  options?: {
    replaySource?:
      | "webhook"
      | "verify_page"
      | "landlord_verify"
      | "reconciliation";
  },
): Promise<GatewayPaymentWebhookResult> {
  const supabase = createSupabaseAdminClient();

  const intent = await getGatewayPaymentIntentByReference(supabase, reference);

  if (!intent) {
    throw new AppError(
      "GATEWAY_INTENT_NOT_FOUND",
      "Payment reference was not found in BOPA.",
      404,
    );
  }

  const phase = getGatewayPaymentVerificationPhase(intent);

  if (phase === "settled" && intent.processed_payment_id) {
    return returnDuplicateGatewayPaymentResult({
      intent,
      paymentId: intent.processed_payment_id,
      replaySource: options?.replaySource,
    });
  }

  const existingPayment = await findExistingPaystackRentPayment(supabase, {
    landlordId: intent.landlord_id,
    paystackReference: intent.paystack_reference,
  });

  if (existingPayment) {
    if (
      intent.status !== "paid" ||
      intent.processed_payment_id !== existingPayment.id
    ) {
      await markGatewayPaymentIntentPaid(supabase, {
        intentId: intent.id,
        paymentId: existingPayment.id,
        paidAt: intent.paid_at ?? new Date().toISOString(),
        verifiedPayload: intent.verified_payload ?? {},
      });
    }

    return returnDuplicateGatewayPaymentResult({
      intent,
      paymentId: existingPayment.id,
      replaySource: options?.replaySource ?? "reconciliation",
    });
  }

  if (phase === "terminal_unpaid") {
    return {
      status: "ignored",
      message: "Payment intent is no longer eligible for verification.",
    };
  }

  if (!shouldVerifyGatewayIntentWithPaystack(intent)) {
    return {
      status: "ignored",
      message: "Payment intent is not in a verifiable state.",
    };
  }

  const verifiedTransaction = await verifyPaystackTransaction(reference);
  const verifiedPayload = toRecord(verifiedTransaction);

  if (verifiedTransaction.reference !== intent.paystack_reference) {
    throw new AppError(
      "PAYSTACK_REFERENCE_MISMATCH",
      "Payment reference does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.currency !== intent.currency_code) {
    throw new AppError(
      "PAYSTACK_CURRENCY_MISMATCH",
      "Payment currency does not match the initialized payment.",
      400,
    );
  }

  if (verifiedTransaction.status !== "success") {
    const failedStatus = mapPaystackStatusToIntentStatus(
      verifiedTransaction.status,
    );

    await markGatewayPaymentIntentFailed(supabase, {
      intentId: intent.id,
      status: failedStatus,
      reason: `Paystack transaction status: ${verifiedTransaction.status}`,
      verifiedPayload,
    });

    await writeSystemAuditLog({
      landlordId: intent.landlord_id,
      tenantId: intent.tenant_id,
      tenancyId: intent.tenancy_id,
      eventType: AUDIT_EVENT_TYPES.gatewayPaymentFailed,
      entityType: AUDIT_ENTITY_TYPES.payment,
      entityId: intent.id,
      description: "Paystack gateway payment was not successful.",
      metadata: {
        gateway_payment_intent_id: intent.id,
        paystack_reference: intent.paystack_reference,
        paystack_status: verifiedTransaction.status,
        expected_total_amount: intent.total_amount,
        verified_amount_kobo: verifiedTransaction.amount,
        agent_deal: intent.metadata.agent_deal ?? null,
        allocations: intent.metadata.allocations ?? null,
      },
    });

    return {
      status: "ignored",
      message: "Payment was not successful.",
    };
  }

  assertAmountsMatch({
    verifiedAmountKobo: verifiedTransaction.amount,
    expectedTotalNaira: intent.total_amount,
  });

  const idempotencyKey = buildPaystackRentPaymentIdempotencyKey(
    intent.paystack_reference,
  );

  const paymentId = await recordGatewayRentPaymentViaRpc(supabase, {
    tenancyId: intent.tenancy_id,
    amountPaid: intent.rent_amount,
    paymentReference: intent.paystack_reference,
    paymentDate: verifiedTransaction.paid_at ?? new Date().toISOString(),
    periodStart: intent.period_start,
    periodEnd: intent.period_end,
    idempotencyKey,
  });

  await markGatewayPaymentIntentPaid(supabase, {
    intentId: intent.id,
    paymentId,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
  });

  const shouldRecordVerificationAudit =
    intent.status !== "paid" || !intent.processed_payment_id;

  if (shouldRecordVerificationAudit) {
    await writeSystemAuditLog({
      landlordId: intent.landlord_id,
      tenantId: intent.tenant_id,
      tenancyId: intent.tenancy_id,
      eventType: AUDIT_EVENT_TYPES.gatewayPaymentVerified,
      entityType: AUDIT_ENTITY_TYPES.payment,
      entityId: paymentId,
      description: "Paystack gateway payment verified.",
      metadata: {
        payment_id: paymentId,
        gateway_payment_intent_id: intent.id,
        paystack_reference: intent.paystack_reference,
        amount_paid: intent.rent_amount,
        total_amount: intent.total_amount,
        verified_amount_kobo: verifiedTransaction.amount,
        paid_at: verifiedTransaction.paid_at,
        period_start: intent.period_start,
        period_end: intent.period_end,
        agent_deal: intent.metadata.agent_deal ?? null,
        allocations: intent.metadata.allocations ?? null,
      },
    });
  }

  await finalizeGatewayPaymentSettlement({
    intent,
    paymentId,
    isReplay: !shouldRecordVerificationAudit,
    replaySource: options?.replaySource,
  });

  return {
    status: shouldRecordVerificationAudit ? "processed" : "duplicate",
    message: shouldRecordVerificationAudit
      ? `Gateway payment of ₦${convertKoboToNaira(
          verifiedTransaction.amount,
        ).toLocaleString("en-NG")} confirmed.`
      : "Gateway payment already recorded.",
    paymentId,
  };
}

function isProcessingFeeNotFoundError(error: unknown) {
  return (
    isAppError(error) &&
    (error.code === "AGENT_PROCESSING_FEE_NOT_FOUND" ||
      error.code === "TENANT_APPLICATION_PROCESSING_FEE_NOT_FOUND")
  );
}

async function processVerifiedDeveloperPaymentReference(reference: string) {
  const supabase = createSupabaseAdminClient();

  const result = await verifyAndPostDeveloperPaymentReference({
    supabase,
    reference,
  });

  return {
    status: result.status === "duplicate" ? "duplicate" : "processed",
    message:
      result.status === "duplicate"
        ? "Developer payment already recorded."
        : "Developer payment confirmed.",
    paymentId: result.paymentId,
  } satisfies GatewayPaymentWebhookResult;
}

async function processVerifiedPaystackReferenceWithFallback(
  reference: string,
  options?: {
    replaySource?:
      | "webhook"
      | "verify_page"
      | "landlord_verify"
      | "reconciliation";
    rawPayload?: Record<string, unknown>;
  },
) {
  try {
    return await processVerifiedGatewayPaymentReference(reference, options);
  } catch (error) {
    if (!isGatewayIntentNotFoundError(error)) {
      throw error;
    }

    try {
      const processingFeeIntent =
        await verifyAgentTenantProcessingFeeReference(reference);

      return {
        status: "processed" as const,
        message: "Agent tenant processing fee confirmed.",
        paymentId: processingFeeIntent.id,
      };
    } catch (agentError) {
      if (!isProcessingFeeNotFoundError(agentError)) {
        throw agentError;
      }
    }

    try {
      const tenantApplicationProcessingFeeIntent =
        await verifyTenantApplicationProcessingFeeReference(reference);

      return {
        status: "processed" as const,
        message: "Tenant application processing fee confirmed.",
        paymentId: tenantApplicationProcessingFeeIntent.id,
      };
    } catch (tenantApplicationError) {
      if (!isProcessingFeeNotFoundError(tenantApplicationError)) {
        throw tenantApplicationError;
      }

      if (
        isDeveloperInstallmentWebhook({
          reference,
          rawPayload: options?.rawPayload,
        })
      ) {
        return processVerifiedDeveloperPaymentReference(reference);
      }

      throw tenantApplicationError;
    }
  }
}

async function resolveDuplicateWebhookEvent(params: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  registeredEvent: Awaited<ReturnType<typeof registerGatewayPaymentEvent>>;
  paymentReference: string;
}): Promise<GatewayPaymentWebhookResult | null> {
  if (!params.registeredEvent.isDuplicate) {
    return null;
  }

  if (
    params.registeredEvent.event.processing_status === "processed" &&
    params.registeredEvent.event.processed_payment_id
  ) {
    return {
      status: "duplicate",
      message: "Payment webhook already processed.",
      paymentId: params.registeredEvent.event.processed_payment_id,
    };
  }

  if (params.registeredEvent.event.processing_status === "ignored") {
    return {
      status: "duplicate",
      message: "Payment webhook was already ignored.",
    };
  }

  const intent = await getGatewayPaymentIntentByReference(
    params.supabase,
    params.paymentReference,
  );

  if (intent?.status === "paid" && intent.processed_payment_id) {
    await markGatewayPaymentEventProcessed(params.supabase, {
      eventId: params.registeredEvent.event.id,
      gatewayPaymentIntentId: intent.id,
      processedPaymentId: intent.processed_payment_id,
      verifiedPayload: intent.verified_payload ?? {},
    });

    return {
      status: "duplicate",
      message: "Payment webhook already processed.",
      paymentId: intent.processed_payment_id,
    };
  }

  const existingPayment =
    intent &&
    (await findExistingPaystackRentPayment(params.supabase, {
      landlordId: intent.landlord_id,
      paystackReference: intent.paystack_reference,
    }));

  if (existingPayment && intent) {
    await markGatewayPaymentEventProcessed(params.supabase, {
      eventId: params.registeredEvent.event.id,
      gatewayPaymentIntentId: intent.id,
      processedPaymentId: existingPayment.id,
      verifiedPayload: intent.verified_payload ?? {},
    });

    return {
      status: "duplicate",
      message: "Payment webhook already processed.",
      paymentId: existingPayment.id,
    };
  }

  return null;
}

export async function processGatewayPaystackWebhook(params: {
  rawBody: string;
  signature: string | null;
}): Promise<GatewayPaymentWebhookResult> {
  verifyPaystackWebhookSignature({
    rawBody: params.rawBody,
    signature: params.signature,
  });

  const webhook = parsePaystackWebhook(params.rawBody);
  const rawPayload = JSON.parse(params.rawBody) as Record<string, unknown>;
  const supabase = createSupabaseAdminClient();

  const registeredEvent = await registerGatewayPaymentEvent(supabase, {
    eventType: webhook.event,
    paymentReference: webhook.data.reference,
    rawPayload,
    signature: params.signature ?? "",
  });

  const duplicateResult = await resolveDuplicateWebhookEvent({
    supabase,
    registeredEvent,
    paymentReference: webhook.data.reference,
  });

  if (duplicateResult) {
    return duplicateResult;
  }

  try {
    if (webhook.event !== "charge.success") {
      await markGatewayPaymentEventIgnored(supabase, {
        eventId: registeredEvent.event.id,
        reason: `Unsupported Paystack event: ${webhook.event}`,
      });

      const ignoredIntent = await getGatewayPaymentIntentByReference(
        supabase,
        webhook.data.reference,
      );

      await writeSystemAuditLog({
        landlordId: ignoredIntent?.landlord_id ?? null,
        tenantId: ignoredIntent?.tenant_id ?? null,
        tenancyId: ignoredIntent?.tenancy_id ?? null,
        eventType: AUDIT_EVENT_TYPES.gatewayPaymentIgnored,
        entityType: AUDIT_ENTITY_TYPES.payment,
        entityId: ignoredIntent?.id ?? registeredEvent.event.id,
        description: `Unsupported Paystack webhook ignored: ${webhook.event}.`,
        metadata: {
          gateway_payment_intent_id: ignoredIntent?.id ?? null,
          gateway_payment_event_id: registeredEvent.event.id,
          paystack_reference: webhook.data.reference,
          webhook_event: webhook.event,
          agent_deal: ignoredIntent?.metadata.agent_deal ?? null,
          allocations: ignoredIntent?.metadata.allocations ?? null,
        },
      });

      return {
        status: "ignored",
        message: "Webhook ignored.",
      };
    }

    const result = await processVerifiedPaystackReferenceWithFallback(
      webhook.data.reference,
      {
        replaySource: "webhook",
        rawPayload,
      },
    );

    const intent = await getGatewayPaymentIntentByReference(
      supabase,
      webhook.data.reference,
    );

    await markGatewayPaymentEventProcessed(supabase, {
      eventId: registeredEvent.event.id,
      gatewayPaymentIntentId:
        intent?.id ?? result.paymentId ?? registeredEvent.event.id,
      processedPaymentId: result.paymentId ?? "",
      verifiedPayload: intent?.verified_payload ?? rawPayload,
    });

    return result;
  } catch (error) {
    const message = getErrorMessage(error);

    await markGatewayPaymentEventFailed(supabase, {
      eventId: registeredEvent.event.id,
      reason: message,
    });

    const failedIntent = await getGatewayPaymentIntentByReference(
      supabase,
      webhook.data.reference,
    );

    await writeSystemAuditLog({
      landlordId: failedIntent?.landlord_id ?? null,
      tenantId: failedIntent?.tenant_id ?? null,
      tenancyId: failedIntent?.tenancy_id ?? null,
      eventType: AUDIT_EVENT_TYPES.gatewayPaymentFailed,
      entityType: AUDIT_ENTITY_TYPES.payment,
      entityId: failedIntent?.id ?? registeredEvent.event.id,
      description: "Paystack webhook processing failed.",
      metadata: {
        gateway_payment_intent_id: failedIntent?.id ?? null,
        gateway_payment_event_id: registeredEvent.event.id,
        paystack_reference: webhook.data.reference,
        webhook_event: webhook.event,
        failure_reason: message,
        agent_deal: failedIntent?.metadata.agent_deal ?? null,
        allocations: failedIntent?.metadata.allocations ?? null,
      },
    });

    return {
      status: "failed",
      message,
    };
  }
}
