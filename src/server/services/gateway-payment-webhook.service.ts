import "server-only";

import { inngest } from "@/server/jobs/inngest.client";
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
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  convertKoboToNaira,
  convertNairaToKobo,
  parsePaystackWebhook,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from "@/server/services/paystack.service";
import { generateRentReceiptSystem } from "@/server/services/receipt.service";

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

async function generateReceiptSafely(paymentId: string) {
  try {
    await generateRentReceiptSystem(paymentId);
  } catch (error) {
    console.error("Receipt generation failed after gateway payment:", error);
  }
}

async function queueReceiptGeneration(params: {
  paymentId: string;
  tenancyId: string;
  tenantId: string;
  landlordId: string;
  paymentReference: string;
}) {
  try {
    await inngest.send({
      name: "tenuro/receipt.generate",
      data: params,
    });
  } catch (error) {
    console.error("Receipt generation event could not be queued:", error);
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

  await generateReceiptSafely(paymentId);

  await queueReceiptGeneration({
    paymentId,
    tenancyId: intent.tenancy_id,
    tenantId: intent.tenant_id,
    landlordId: intent.landlord_id,
    paymentReference: intent.paystack_reference,
  });

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

    return {
      status: "failed",
      message,
    };
  }
}
