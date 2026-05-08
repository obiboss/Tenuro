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
import {
  findPaymentByIdempotencyKey,
  recordGatewayRentPaymentViaRpc,
} from "@/server/repositories/payments.repository";
import { markPaymentAllocationsPaidForIntent } from "@/server/repositories/payment-allocations.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import {
  getUnitById,
  markUnitOccupied,
} from "@/server/repositories/units.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import {
  convertKoboToNaira,
  convertNairaToKobo,
  parsePaystackWebhook,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from "@/server/services/paystack.service";
import { generateRentReceiptSystem } from "@/server/services/receipts.service";
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

async function generateReceiptSafely(paymentId: string) {
  try {
    await generateRentReceiptSystem(paymentId);
  } catch (error) {
    console.error("Receipt generation failed after gateway payment:", error);
  }
}

async function markPaymentAllocationsPaidSafely(params: {
  gatewayPaymentIntentId: string;
  rentPaymentId: string;
}) {
  try {
    await markPaymentAllocationsPaidForIntent(createSupabaseAdminClient(), {
      gatewayPaymentIntentId: params.gatewayPaymentIntentId,
      rentPaymentId: params.rentPaymentId,
    });
  } catch (error) {
    console.error("Failed to mark payment allocations as paid:", error);
  }
}

export async function processVerifiedGatewayPaymentReference(
  reference: string,
): Promise<GatewayPaymentWebhookResult> {
  const supabase = createSupabaseAdminClient();

  const intent = await getGatewayPaymentIntentByReference(supabase, reference);

  if (!intent) {
    throw new AppError(
      "GATEWAY_INTENT_NOT_FOUND",
      "Payment reference was not found in Tenuro.",
      404,
    );
  }

  if (intent.status === "paid" && intent.processed_payment_id) {
    await markPaymentAllocationsPaidSafely({
      gatewayPaymentIntentId: intent.id,
      rentPaymentId: intent.processed_payment_id,
    });

    await generateReceiptSafely(intent.processed_payment_id);

    if (isFirstRentPaymentIntent(intent.metadata)) {
      await markUnitOccupiedAfterFirstRentPaymentSafely({
        tenancyId: intent.tenancy_id,
        paymentId: intent.processed_payment_id,
        paystackReference: intent.paystack_reference,
      });
    }

    return {
      status: "duplicate",
      message: "Gateway payment already recorded.",
      paymentId: intent.processed_payment_id,
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

  const idempotencyKey = `paystack:${intent.paystack_reference}`;

  const existingPayment = await findPaymentByIdempotencyKey(supabase, {
    landlordId: intent.landlord_id,
    idempotencyKey,
  });

  const paymentId =
    existingPayment?.id ??
    (await recordGatewayRentPaymentViaRpc(supabase, {
      tenancyId: intent.tenancy_id,
      amountPaid: intent.rent_amount,
      paymentReference: intent.paystack_reference,
      paymentDate: verifiedTransaction.paid_at ?? new Date().toISOString(),
      periodStart: intent.period_start,
      periodEnd: intent.period_end,
      idempotencyKey,
    }));

  await markGatewayPaymentIntentPaid(supabase, {
    intentId: intent.id,
    paymentId,
    paidAt: verifiedTransaction.paid_at ?? new Date().toISOString(),
    verifiedPayload,
  });

  await markPaymentAllocationsPaidSafely({
    gatewayPaymentIntentId: intent.id,
    rentPaymentId: paymentId,
  });

  if (isFirstRentPaymentIntent(intent.metadata)) {
    await markUnitOccupiedAfterFirstRentPaymentSafely({
      tenancyId: intent.tenancy_id,
      paymentId,
      paystackReference: intent.paystack_reference,
    });
  }

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

  await generateReceiptSafely(paymentId);

  return {
    status: existingPayment ? "duplicate" : "processed",
    message: existingPayment
      ? "Gateway payment already recorded."
      : `Gateway payment of ₦${convertKoboToNaira(
          verifiedTransaction.amount,
        ).toLocaleString("en-NG")} confirmed.`,
    paymentId,
  };
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

  if (
    registeredEvent.isDuplicate &&
    registeredEvent.event.processing_status === "processed" &&
    registeredEvent.event.processed_payment_id
  ) {
    return {
      status: "duplicate",
      message: "Payment webhook already processed.",
      paymentId: registeredEvent.event.processed_payment_id,
    };
  }

  if (
    registeredEvent.isDuplicate &&
    registeredEvent.event.processing_status === "ignored"
  ) {
    return {
      status: "duplicate",
      message: "Payment webhook was already ignored.",
    };
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

    const result = await processVerifiedGatewayPaymentReference(
      webhook.data.reference,
    );

    const intent = await getGatewayPaymentIntentByReference(
      supabase,
      webhook.data.reference,
    );

    if (!intent) {
      throw new AppError(
        "GATEWAY_INTENT_NOT_FOUND",
        "Payment reference was not found in Tenuro.",
        404,
      );
    }

    await markGatewayPaymentEventProcessed(supabase, {
      eventId: registeredEvent.event.id,
      gatewayPaymentIntentId: intent.id,
      processedPaymentId: result.paymentId ?? intent.processed_payment_id ?? "",
      verifiedPayload: intent.verified_payload ?? {},
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
