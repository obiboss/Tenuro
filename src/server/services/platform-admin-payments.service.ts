import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  countGatewayPaymentIntentsByStatus,
  getGatewayPaymentIntentByReference,
  listGatewayPaymentIntentsForAdmin,
  type GatewayPaymentIntentAdminFilter,
} from "@/server/repositories/gateway-payment.repository";
import { listGatewayPaymentEventsByReference } from "@/server/repositories/gateway-payment-event.repository";
import {
  listPaymentAllocationsByIntentId,
  listPaymentAllocationsByIntentIds,
} from "@/server/repositories/payment-allocations.repository";
import { getRentPaymentById } from "@/server/repositories/payments.repository";
import { getProfilesByIds } from "@/server/repositories/profiles.repository";
import { getTenantsByIds } from "@/server/repositories/tenants.repository";
import { getPlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import {
  getGatewayPaymentVerificationPhase,
} from "@/server/services/gateway-payment-idempotency.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";
import type { PaymentAllocationRow } from "@/server/repositories/payment-allocations.repository";
import type { GatewayPaymentEventDetailRow } from "@/server/repositories/gateway-payment-event.repository";

const DEFAULT_PAGE_SIZE = 25;

export type PlatformAdminPaymentOperationsFilter = {
  status?: GatewayPaymentIntentAdminFilter["status"] | "all";
  query?: string;
  page?: number;
};

export type PlatformAdminPaymentAllocationSummary = {
  status: "none" | "pending" | "paid" | "mixed" | "inconsistent";
  totalAllocated: number;
  pendingCount: number;
  paidCount: number;
  hasInconsistency: boolean;
  inconsistencyReason: string | null;
};

export type PlatformAdminPaymentOperationListItem = {
  id: string;
  paystackReference: string;
  status: GatewayPaymentIntent["status"];
  verificationPhase: ReturnType<typeof getGatewayPaymentVerificationPhase>;
  allocationSummary: PlatformAdminPaymentAllocationSummary;
  paymentMethod: "paystack_gateway";
  rentAmount: number;
  totalAmount: number;
  currencyCode: string;
  landlordId: string;
  landlordName: string;
  tenantId: string;
  tenantName: string;
  processedPaymentId: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  needsAttention: boolean;
};

export type PlatformAdminPaymentOperationsList = {
  items: PlatformAdminPaymentOperationListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  filters: PlatformAdminPaymentOperationsFilter;
  summaries: {
    payments: {
      initialized: number;
      paid: number;
      failed: number;
      abandoned: number;
      cancelled: number;
      attention: number;
    };
    payouts: {
      pending: number;
      verified: number;
      failed: number;
    };
  };
};

export type PlatformAdminPaymentOperationEvent = {
  id: string;
  eventType: string;
  processingStatus: GatewayPaymentEventDetailRow["processing_status"];
  errorMessage: string | null;
  processedPaymentId: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type PlatformAdminPaymentOperationDetail = {
  intent: GatewayPaymentIntent;
  verificationPhase: ReturnType<typeof getGatewayPaymentVerificationPhase>;
  allocationSummary: PlatformAdminPaymentAllocationSummary;
  allocations: PaymentAllocationRow[];
  events: PlatformAdminPaymentOperationEvent[];
  landlordName: string;
  landlordEmail: string | null;
  tenantName: string;
  tenantPhoneNumber: string | null;
  rentPayment: Awaited<ReturnType<typeof getRentPaymentById>> | null;
  operationalMetadata: Record<string, unknown>;
  paystackMetadata: Record<string, unknown>;
  needsAttention: boolean;
  attentionReasons: string[];
};

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readMetadataText(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function summarizeAllocations(params: {
  intent: Pick<
    GatewayPaymentIntent,
    "status" | "processed_payment_id" | "total_amount"
  >;
  allocations: PaymentAllocationRow[];
}): PlatformAdminPaymentAllocationSummary {
  if (params.allocations.length === 0) {
    const needsIntentAllocations =
      params.intent.status === "paid" || params.intent.status === "initialized";

    return {
      status: "none",
      totalAllocated: 0,
      pendingCount: 0,
      paidCount: 0,
      hasInconsistency: needsIntentAllocations,
      inconsistencyReason: needsIntentAllocations
        ? "No payment allocations exist for this intent."
        : null,
    };
  }

  const pendingCount = params.allocations.filter(
    (allocation) => allocation.allocation_status === "pending",
  ).length;
  const paidCount = params.allocations.filter(
    (allocation) => allocation.allocation_status === "paid",
  ).length;
  const totalAllocated = params.allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount),
    0,
  );

  let status: PlatformAdminPaymentAllocationSummary["status"] = "mixed";

  if (pendingCount === params.allocations.length) {
    status = "pending";
  } else if (paidCount === params.allocations.length) {
    status = "paid";
  }

  const amountDifference = Math.abs(
    totalAllocated - Number(params.intent.total_amount),
  );
  const hasAmountMismatch = amountDifference >= 1;
  const hasPaidIntentWithPendingAllocations =
    params.intent.status === "paid" &&
    Boolean(params.intent.processed_payment_id) &&
    pendingCount > 0;
  const hasInconsistency = hasAmountMismatch || hasPaidIntentWithPendingAllocations;

  let inconsistencyReason: string | null = null;

  if (hasPaidIntentWithPendingAllocations) {
    inconsistencyReason =
      "Payment is marked paid but one or more allocations are still pending.";
  } else if (hasAmountMismatch) {
    inconsistencyReason =
      "Allocation totals do not match the gateway payment total.";
  }

  if (hasInconsistency) {
    status = "inconsistent";
  }

  return {
    status,
    totalAllocated,
    pendingCount,
    paidCount,
    hasInconsistency,
    inconsistencyReason,
  };
}

function buildAttentionReasons(params: {
  intent: GatewayPaymentIntent;
  verificationPhase: ReturnType<typeof getGatewayPaymentVerificationPhase>;
  allocationSummary: PlatformAdminPaymentAllocationSummary;
}): string[] {
  const reasons: string[] = [];

  if (
    params.intent.status === "failed" ||
    params.intent.status === "abandoned"
  ) {
    reasons.push(`Payment intent status is ${params.intent.status}.`);
  }

  if (params.intent.failure_reason) {
    reasons.push(params.intent.failure_reason);
  }

  if (
    params.intent.status === "paid" &&
    !params.intent.processed_payment_id
  ) {
    reasons.push(
      "Payment intent is paid but no rent payment record is linked yet.",
    );
  }

  if (params.verificationPhase === "verifiable") {
    reasons.push("Payment is still awaiting successful verification.");
  }

  if (params.allocationSummary.inconsistencyReason) {
    reasons.push(params.allocationSummary.inconsistencyReason);
  }

  return reasons;
}

function needsAttention(params: {
  intent: GatewayPaymentIntent;
  verificationPhase: ReturnType<typeof getGatewayPaymentVerificationPhase>;
  allocationSummary: PlatformAdminPaymentAllocationSummary;
}) {
  return (
    buildAttentionReasons(params).length > 0 ||
    params.intent.status === "failed" ||
    params.intent.status === "abandoned" ||
    (params.intent.status === "paid" && !params.intent.processed_payment_id) ||
    params.allocationSummary.hasInconsistency
  );
}

function sanitizePaystackPayload(payload: Record<string, unknown>) {
  const sanitized = { ...payload };
  delete sanitized.signature;
  delete sanitized.authorization;
  delete sanitized.authorization_code;

  return sanitized;
}

async function mapIntentListItems(params: {
  intents: GatewayPaymentIntent[];
  supabase: ReturnType<typeof createSupabaseAdminClient>;
}) {
  const landlordIds = [
    ...new Set(params.intents.map((intent) => intent.landlord_id)),
  ];
  const tenantIds = [...new Set(params.intents.map((intent) => intent.tenant_id))];

  const [landlords, tenants] = await Promise.all([
    getProfilesByIds(params.supabase, landlordIds),
    getTenantsByIds(params.supabase, tenantIds),
  ]);

  const landlordMap = new Map(
    landlords.map((landlord) => [landlord.id, landlord.full_name]),
  );
  const tenantMap = new Map(
    tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );

  const allAllocations = await listPaymentAllocationsByIntentIds(
    params.supabase,
    params.intents.map((intent) => intent.id),
  );
  const allocationsByIntent = new Map<string, PaymentAllocationRow[]>();

  for (const allocation of allAllocations) {
    const intentId = allocation.gateway_payment_intent_id;

    if (!intentId) {
      continue;
    }

    const existing = allocationsByIntent.get(intentId) ?? [];
    existing.push(allocation);
    allocationsByIntent.set(intentId, existing);
  }

  const items = params.intents.map((intent) => {
      const allocations = allocationsByIntent.get(intent.id) ?? [];
      const verificationPhase = getGatewayPaymentVerificationPhase(intent);
      const allocationSummary = summarizeAllocations({ intent, allocations });
      const attention = needsAttention({
        intent,
        verificationPhase,
        allocationSummary,
      });

      return {
        id: intent.id,
        paystackReference: intent.paystack_reference,
        status: intent.status,
        verificationPhase,
        allocationSummary,
        paymentMethod: "paystack_gateway" as const,
        rentAmount: Number(intent.rent_amount),
        totalAmount: Number(intent.total_amount),
        currencyCode: intent.currency_code,
        landlordId: intent.landlord_id,
        landlordName: landlordMap.get(intent.landlord_id) ?? "Unknown landlord",
        tenantId: intent.tenant_id,
        tenantName: tenantMap.get(intent.tenant_id) ?? "Unknown tenant",
        processedPaymentId: intent.processed_payment_id ?? null,
        failureReason: intent.failure_reason ?? null,
        createdAt: intent.created_at,
        paidAt: intent.paid_at ?? null,
        needsAttention: attention,
      };
  });

  return items;
}

export async function getPlatformAdminPaymentOperationsList(
  filter: PlatformAdminPaymentOperationsFilter = {},
): Promise<PlatformAdminPaymentOperationsList> {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const statusFilter =
    filter.status && filter.status !== "all" ? filter.status : undefined;

  const [listResult, paymentCounts, payoutQueue] = await Promise.all([
    listGatewayPaymentIntentsForAdmin(supabase, {
      status: statusFilter,
      query: filter.query,
      limit: pageSize,
      offset,
    }),
    countGatewayPaymentIntentsByStatus(supabase),
    getPlatformAdminPayoutVerificationQueue(),
  ]);

  const items = await mapIntentListItems({
    intents: listResult.intents,
    supabase,
  });

  const totalCount = listResult.totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
    filters: filter,
    summaries: {
      payments: {
        initialized: paymentCounts.byStatus.initialized ?? 0,
        paid: paymentCounts.byStatus.paid ?? 0,
        failed: paymentCounts.byStatus.failed ?? 0,
        abandoned: paymentCounts.byStatus.abandoned ?? 0,
        cancelled: paymentCounts.byStatus.cancelled ?? 0,
        attention: paymentCounts.attention,
      },
      payouts: {
        pending: payoutQueue.totals.pending,
        verified: payoutQueue.totals.verified,
        failed: payoutQueue.totals.failed,
      },
    },
  };
}

export async function getPlatformAdminPaymentOperationDetail(
  reference: string,
): Promise<PlatformAdminPaymentOperationDetail> {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();
  const intent = await getGatewayPaymentIntentByReference(supabase, reference);

  if (!intent) {
    throw new AppError(
      "ADMIN_PAYMENT_NOT_FOUND",
      "Payment reference was not found.",
      404,
    );
  }

  const [allocations, events, landlord, tenant, rentPayment] = await Promise.all([
    listPaymentAllocationsByIntentId(supabase, intent.id),
    listGatewayPaymentEventsByReference(supabase, intent.paystack_reference),
    getProfilesByIds(supabase, [intent.landlord_id]).then(
      (profiles) => profiles[0] ?? null,
    ),
    getTenantsByIds(supabase, [intent.tenant_id]).then(
      (tenants) => tenants[0] ?? null,
    ),
    intent.processed_payment_id
      ? getRentPaymentById(supabase, intent.processed_payment_id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const metadata = toRecord(intent.metadata);
  const verificationPhase = getGatewayPaymentVerificationPhase(intent);
  const allocationSummary = summarizeAllocations({ intent, allocations });
  const attentionReasons = buildAttentionReasons({
    intent,
    verificationPhase,
    allocationSummary,
  });

  const operationalMetadata = {
    payment_purpose: readMetadataText(metadata, "payment_purpose"),
    property_name: readMetadataText(metadata, "property_name"),
    unit_identifier: readMetadataText(metadata, "unit_identifier"),
    payment_link_expires_at: readMetadataText(metadata, "payment_link_expires_at"),
    landlord_share_amount: metadata.landlord_share_amount ?? null,
    agent_commission_amount: metadata.agent_commission_amount ?? null,
    tenuro_fee_naira: metadata.tenuro_fee_naira ?? null,
    total_amount_naira: metadata.total_amount_naira ?? null,
    automatic_after_agreement: metadata.automatic_after_agreement ?? null,
  };

  return {
    intent,
    verificationPhase,
    allocationSummary,
    allocations,
    events: events.map((event) => ({
      id: event.id,
      eventType: event.event_type,
      processingStatus: event.processing_status,
      errorMessage: event.error_message,
      processedPaymentId: event.processed_payment_id,
      createdAt: event.created_at,
      processedAt: event.processed_at,
    })),
    landlordName: landlord?.full_name ?? "Unknown landlord",
    landlordEmail: landlord?.email ?? null,
    tenantName: tenant?.full_name ?? "Unknown tenant",
    tenantPhoneNumber: tenant?.phone_number ?? null,
    rentPayment,
    operationalMetadata,
    paystackMetadata: sanitizePaystackPayload(toRecord(intent.verified_payload)),
    needsAttention: needsAttention({
      intent,
      verificationPhase,
      allocationSummary,
    }),
    attentionReasons,
  };
}
