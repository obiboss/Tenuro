import type { SupabaseClient } from "@supabase/supabase-js";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";

const GATEWAY_PAYMENT_INTENT_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  paystack_reference,
  paystack_access_code,
  authorization_url,
  rent_amount,
  tenuro_fee_amount,
  total_amount,
  currency_code,
  period_start,
  period_end,
  idempotency_key,
  status,
  metadata,
  expires_at,
  paid_at,
  processed_payment_id,
  failure_reason,
  verified_payload,
  created_at,
  updated_at
`;

export async function getGatewayPaymentIntentByIdempotencyKey(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("landlord_id", params.landlordId)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getGatewayPaymentIntentByReference(
  supabase: SupabaseClient,
  reference: string,
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createGatewayPaymentIntent(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    paystackReference: string;
    paystackAccessCode: string;
    authorizationUrl: string;
    rentAmount: number;
    tenuroFeeAmount: number;
    totalAmount: number;
    currencyCode: string;
    periodStart?: string | null;
    periodEnd?: string | null;
    expiresAt: string;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      paystack_reference: params.paystackReference,
      paystack_access_code: params.paystackAccessCode,
      authorization_url: params.authorizationUrl,
      rent_amount: params.rentAmount,
      tenuro_fee_amount: params.tenuroFeeAmount,
      total_amount: params.totalAmount,
      currency_code: params.currencyCode,
      period_start: params.periodStart ?? null,
      period_end: params.periodEnd ?? null,
      expires_at: params.expiresAt,
      idempotency_key: params.idempotencyKey,
      status: "initialized",
      metadata: params.metadata,
    })
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .single<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markGatewayPaymentIntentPaid(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    paymentId: string;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .update({
      status: "paid",
      processed_payment_id: params.paymentId,
      paid_at: params.paidAt,
      failure_reason: null,
      verified_payload: params.verifiedPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .neq("status", "paid")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: existingIntent, error: existingError } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("id", params.intentId)
    .single<GatewayPaymentIntent>();

  if (existingError) {
    throw existingError;
  }

  return existingIntent;
}

export async function markGatewayPaymentIntentFailed(
  supabase: SupabaseClient,
  params: {
    intentId: string;
    status: "failed" | "abandoned" | "cancelled";
    reason: string;
    verifiedPayload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("gateway_payment_intents")
    .update({
      status: params.status,
      failure_reason: params.reason,
      verified_payload: params.verifiedPayload ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.intentId)
    .eq("status", "initialized");

  if (error) {
    throw error;
  }
}

export async function getLatestGatewayPaymentIntentForTenancyPurpose(
  supabase: SupabaseClient,
  params: {
    tenancyId: string;
    paymentPurpose: string;
    status?: GatewayPaymentIntent["status"];
  },
) {
  let query = supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("tenancy_id", params.tenancyId)
    .eq("metadata->>payment_purpose", params.paymentPurpose);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GatewayPaymentIntent>();

  if (error) {
    throw error;
  }

  return data;
}

export type GatewayPaymentIntentAdminFilter = {
  status?: GatewayPaymentIntent["status"] | "attention";
  query?: string;
  limit?: number;
  offset?: number;
};

export async function listGatewayPaymentIntentsForAdmin(
  supabase: SupabaseClient,
  filter: GatewayPaymentIntentAdminFilter = {},
) {
  const limit = filter.limit ?? 25;
  const offset = filter.offset ?? 0;

  let query = supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "attention") {
    query = query.eq("status", filter.status);
  }

  if (filter.status === "attention") {
    query = query.or(
      "status.eq.failed,status.eq.abandoned,and(status.eq.paid,processed_payment_id.is.null)",
    );
  }

  const trimmedQuery = filter.query?.trim();

  if (trimmedQuery) {
    query = query.ilike("paystack_reference", `%${trimmedQuery}%`);
  }

  const { data, error, count } = await query
    .range(offset, offset + limit - 1)
    .returns<GatewayPaymentIntent[]>();

  if (error) {
    throw error;
  }

  return {
    intents: data,
    totalCount: count ?? data.length,
  };
}

export async function countGatewayPaymentIntentsByStatus(
  supabase: SupabaseClient,
) {
  const statuses: GatewayPaymentIntent["status"][] = [
    "initialized",
    "paid",
    "failed",
    "abandoned",
    "cancelled",
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from("gateway_payment_intents")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      if (error) {
        throw error;
      }

      return { status, count: count ?? 0 };
    }),
  );

  const { count: attentionCount, error: attentionError } = await supabase
    .from("gateway_payment_intents")
    .select("id", { count: "exact", head: true })
    .or(
      "status.eq.failed,status.eq.abandoned,and(status.eq.paid,processed_payment_id.is.null)",
    );

  if (attentionError) {
    throw attentionError;
  }

  return {
    byStatus: Object.fromEntries(
      counts.map((entry) => [entry.status, entry.count]),
    ) as Record<GatewayPaymentIntent["status"], number>,
    attention: attentionCount ?? 0,
  };
}

export async function getGatewayPaymentIntentsForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(GATEWAY_PAYMENT_INTENT_SELECT)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<GatewayPaymentIntent[]>();

  if (error) {
    throw error;
  }

  return data;
}
