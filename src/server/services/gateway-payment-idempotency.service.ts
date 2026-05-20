import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { markPaymentAllocationsPaidForIntent } from "@/server/repositories/payment-allocations.repository";
import { findPaymentByIdempotencyKey } from "@/server/repositories/payments.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { generateRentReceiptSystem } from "@/server/services/receipts.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";

export const PAYSTACK_RENT_PAYMENT_IDEMPOTENCY_PREFIX = "paystack:";

export type GatewayPaymentVerificationPhase =
  | "settled"
  | "verifiable"
  | "terminal_unpaid"
  | "unknown";

export function buildPaystackRentPaymentIdempotencyKey(paystackReference: string) {
  return `${PAYSTACK_RENT_PAYMENT_IDEMPOTENCY_PREFIX}${paystackReference}`;
}

export function getGatewayPaymentVerificationPhase(
  intent: Pick<GatewayPaymentIntent, "status" | "processed_payment_id">,
): GatewayPaymentVerificationPhase {
  if (intent.status === "paid" && intent.processed_payment_id) {
    return "settled";
  }

  if (intent.status === "initialized") {
    return "verifiable";
  }

  if (
    intent.status === "failed" ||
    intent.status === "abandoned" ||
    intent.status === "cancelled"
  ) {
    return "terminal_unpaid";
  }

  if (intent.status === "paid" && !intent.processed_payment_id) {
    return "verifiable";
  }

  return "unknown";
}

export function shouldVerifyGatewayIntentWithPaystack(
  intent: Pick<GatewayPaymentIntent, "status" | "processed_payment_id">,
) {
  return getGatewayPaymentVerificationPhase(intent) === "verifiable";
}

export async function findExistingPaystackRentPayment(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    paystackReference: string;
  },
) {
  return findPaymentByIdempotencyKey(supabase, {
    landlordId: params.landlordId,
    idempotencyKey: buildPaystackRentPaymentIdempotencyKey(params.paystackReference),
  });
}

export async function auditGatewayPaymentReplayIgnored(params: {
  intent: GatewayPaymentIntent;
  paymentId: string;
  source: "webhook" | "verify_page" | "landlord_verify" | "reconciliation";
  reason: string;
}) {
  await writeSystemAuditLog({
    landlordId: params.intent.landlord_id,
    tenantId: params.intent.tenant_id,
    tenancyId: params.intent.tenancy_id,
    eventType: AUDIT_EVENT_TYPES.gatewayPaymentIgnored,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: params.paymentId,
    description: "Duplicate gateway payment processing was safely ignored.",
    metadata: {
      audit_subtype: "gateway_payment_replay_ignored",
      gateway_payment_intent_id: params.intent.id,
      paystack_reference: params.intent.paystack_reference,
      payment_id: params.paymentId,
      source: params.source,
      reason: params.reason,
      intent_status: params.intent.status,
    },
  });
}

export async function completeGatewayPaymentAllocationsSafely(params: {
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

export async function generateGatewayRentReceiptSafely(paymentId: string) {
  try {
    await generateRentReceiptSystem(paymentId);
  } catch (error) {
    console.error("Receipt generation failed after gateway payment:", error);
  }
}
