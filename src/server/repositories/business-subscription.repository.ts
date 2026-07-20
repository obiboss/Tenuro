import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessBillingInterval,
  BusinessWorkspaceType,
} from "@/constants/business-subscription";

export type BusinessSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "expired"
  | "cancelled";

export type BusinessSubscriptionRow = {
  id: string;
  workspace_type: BusinessWorkspaceType;
  manager_organization_id: string | null;
  developer_account_id: string | null;
  owner_profile_id: string;
  status: BusinessSubscriptionStatus;
  billing_interval: BusinessBillingInterval | null;
  amount_kobo: number | null;
  currency_code: "NGN";
  billing_email: string | null;
  trial_started_at: string;
  trial_expires_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  paystack_plan_code: string | null;
  paystack_customer_code: string | null;
  paystack_subscription_code: string | null;
  paystack_email_token: string | null;
  next_payment_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  last_payment_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BusinessSubscriptionPaymentStatus =
  | "initialized"
  | "paid"
  | "failed"
  | "abandoned"
  | "cancelled";

export type BusinessSubscriptionPaymentRow = {
  id: string;
  business_subscription_id: string;
  owner_profile_id: string;
  payment_reference: string;
  billing_interval: BusinessBillingInterval;
  expected_amount_kobo: number;
  currency_code: "NGN";
  status: BusinessSubscriptionPaymentStatus;
  paystack_plan_code: string;
  paystack_access_code: string | null;
  authorization_url: string | null;
  paystack_transaction_id: number | null;
  paid_at: string | null;
  failure_reason: string | null;
  verified_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BusinessSubscriptionWebhookEventRow = {
  id: string;
  raw_body_sha256: string;
  event_type: string;
  provider_reference: string | null;
  business_subscription_id: string | null;
  status: "processing" | "processed" | "ignored" | "failed";
  raw_payload: Record<string, unknown>;
  failure_reason: string | null;
  received_at: string;
  processed_at: string | null;
  updated_at: string;
};

const BUSINESS_SUBSCRIPTION_SELECT = `
  id,
  workspace_type,
  manager_organization_id,
  developer_account_id,
  owner_profile_id,
  status,
  billing_interval,
  amount_kobo,
  currency_code,
  billing_email,
  trial_started_at,
  trial_expires_at,
  current_period_start,
  current_period_end,
  paystack_plan_code,
  paystack_customer_code,
  paystack_subscription_code,
  paystack_email_token,
  next_payment_at,
  cancel_at_period_end,
  cancelled_at,
  last_payment_at,
  metadata,
  created_at,
  updated_at
`;

const BUSINESS_SUBSCRIPTION_PAYMENT_SELECT = `
  id,
  business_subscription_id,
  owner_profile_id,
  payment_reference,
  billing_interval,
  expected_amount_kobo,
  currency_code,
  status,
  paystack_plan_code,
  paystack_access_code,
  authorization_url,
  paystack_transaction_id,
  paid_at,
  failure_reason,
  verified_payload,
  metadata,
  created_at,
  updated_at
`;

const BUSINESS_SUBSCRIPTION_WEBHOOK_EVENT_SELECT = `
  id,
  raw_body_sha256,
  event_type,
  provider_reference,
  business_subscription_id,
  status,
  raw_payload,
  failure_reason,
  received_at,
  processed_at,
  updated_at
`;

export async function getBusinessSubscriptionByWorkspace(
  supabase: SupabaseClient,
  params: {
    workspaceType: BusinessWorkspaceType;
    workspaceId: string;
  },
) {
  const column =
    params.workspaceType === "manager"
      ? "manager_organization_id"
      : "developer_account_id";

  const { data, error } = await supabase
    .from("business_subscriptions")
    .select(BUSINESS_SUBSCRIPTION_SELECT)
    .eq(column, params.workspaceId)
    .maybeSingle<BusinessSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getBusinessSubscriptionById(
  supabase: SupabaseClient,
  subscriptionId: string,
) {
  const { data, error } = await supabase
    .from("business_subscriptions")
    .select(BUSINESS_SUBSCRIPTION_SELECT)
    .eq("id", subscriptionId)
    .maybeSingle<BusinessSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getBusinessSubscriptionByPaystackCode(
  supabase: SupabaseClient,
  subscriptionCode: string,
) {
  const { data, error } = await supabase
    .from("business_subscriptions")
    .select(BUSINESS_SUBSCRIPTION_SELECT)
    .eq("paystack_subscription_code", subscriptionCode)
    .maybeSingle<BusinessSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBusinessSubscription(
  supabase: SupabaseClient,
  params: {
    workspaceType: BusinessWorkspaceType;
    workspaceId: string;
    ownerProfileId: string;
    billingEmail: string | null;
    trialStartedAt: string;
    trialExpiresAt: string;
    trialSource: string;
  },
) {
  const { data, error } = await supabase
    .from("business_subscriptions")
    .insert({
      workspace_type: params.workspaceType,
      manager_organization_id:
        params.workspaceType === "manager" ? params.workspaceId : null,
      developer_account_id:
        params.workspaceType === "developer" ? params.workspaceId : null,
      owner_profile_id: params.ownerProfileId,
      billing_email: params.billingEmail,
      trial_started_at: params.trialStartedAt,
      trial_expires_at: params.trialExpiresAt,
      metadata: {
        trial_source: params.trialSource,
      },
    })
    .select(BUSINESS_SUBSCRIPTION_SELECT)
    .single<BusinessSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBusinessSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("business_subscriptions")
    .update(values)
    .eq("id", subscriptionId)
    .select(BUSINESS_SUBSCRIPTION_SELECT)
    .single<BusinessSubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createBusinessSubscriptionPayment(
  supabase: SupabaseClient,
  params: {
    businessSubscriptionId: string;
    ownerProfileId: string;
    paymentReference: string;
    billingInterval: BusinessBillingInterval;
    expectedAmountKobo: number;
    paystackPlanCode: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("business_subscription_payments")
    .insert({
      business_subscription_id: params.businessSubscriptionId,
      owner_profile_id: params.ownerProfileId,
      payment_reference: params.paymentReference,
      billing_interval: params.billingInterval,
      expected_amount_kobo: params.expectedAmountKobo,
      currency_code: "NGN",
      status: "initialized",
      paystack_plan_code: params.paystackPlanCode,
      metadata: params.metadata,
    })
    .select(BUSINESS_SUBSCRIPTION_PAYMENT_SELECT)
    .single<BusinessSubscriptionPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getBusinessSubscriptionPaymentByReference(
  supabase: SupabaseClient,
  paymentReference: string,
) {
  const { data, error } = await supabase
    .from("business_subscription_payments")
    .select(BUSINESS_SUBSCRIPTION_PAYMENT_SELECT)
    .eq("payment_reference", paymentReference)
    .maybeSingle<BusinessSubscriptionPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLatestBusinessSubscriptionPayment(
  supabase: SupabaseClient,
  params: {
    businessSubscriptionId: string;
    status?: BusinessSubscriptionPaymentStatus;
  },
) {
  let query = supabase
    .from("business_subscription_payments")
    .select(BUSINESS_SUBSCRIPTION_PAYMENT_SELECT)
    .eq("business_subscription_id", params.businessSubscriptionId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } =
    await query.maybeSingle<BusinessSubscriptionPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLatestBusinessSubscriptionPaymentForPaystackMatch(
  supabase: SupabaseClient,
  params: {
    paystackPlanCode: string;
    billingEmail: string | null;
  },
) {
  let query = supabase
    .from("business_subscription_payments")
    .select(
      `${BUSINESS_SUBSCRIPTION_PAYMENT_SELECT}, business_subscriptions!inner(billing_email)`,
    )
    .eq("paystack_plan_code", params.paystackPlanCode)
    .in("status", ["initialized", "paid"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (params.billingEmail) {
    query = query.eq(
      "business_subscriptions.billing_email",
      params.billingEmail,
    );
  }

  const { data, error } = await query.maybeSingle<
    BusinessSubscriptionPaymentRow & {
      business_subscriptions: { billing_email: string | null };
    }
  >();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateBusinessSubscriptionPayment(
  supabase: SupabaseClient,
  paymentId: string,
  values: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("business_subscription_payments")
    .update(values)
    .eq("id", paymentId)
    .select(BUSINESS_SUBSCRIPTION_PAYMENT_SELECT)
    .single<BusinessSubscriptionPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertPaidBusinessSubscriptionPayment(
  supabase: SupabaseClient,
  params: {
    businessSubscriptionId: string;
    ownerProfileId: string;
    paymentReference: string;
    billingInterval: BusinessBillingInterval;
    expectedAmountKobo: number;
    paystackPlanCode: string;
    paystackTransactionId: number | null;
    paidAt: string;
    verifiedPayload: Record<string, unknown>;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("business_subscription_payments")
    .upsert(
      {
        business_subscription_id: params.businessSubscriptionId,
        owner_profile_id: params.ownerProfileId,
        payment_reference: params.paymentReference,
        billing_interval: params.billingInterval,
        expected_amount_kobo: params.expectedAmountKobo,
        currency_code: "NGN",
        status: "paid",
        paystack_plan_code: params.paystackPlanCode,
        paystack_transaction_id: params.paystackTransactionId,
        paid_at: params.paidAt,
        failure_reason: null,
        verified_payload: params.verifiedPayload,
        metadata: params.metadata,
      },
      { onConflict: "payment_reference" },
    )
    .select(BUSINESS_SUBSCRIPTION_PAYMENT_SELECT)
    .single<BusinessSubscriptionPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function registerBusinessSubscriptionWebhookEvent(
  supabase: SupabaseClient,
  params: {
    rawBodySha256: string;
    eventType: string;
    providerReference: string | null;
    rawPayload: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("business_subscription_webhook_events")
    .insert({
      raw_body_sha256: params.rawBodySha256,
      event_type: params.eventType,
      provider_reference: params.providerReference,
      raw_payload: params.rawPayload,
      status: "processing",
    })
    .select(BUSINESS_SUBSCRIPTION_WEBHOOK_EVENT_SELECT)
    .maybeSingle<BusinessSubscriptionWebhookEventRow>();

  if (!error && data) {
    return { event: data, duplicate: false };
  }

  if ((error as { code?: string } | null)?.code !== "23505") {
    throw error;
  }

  const { data: existing, error: existingError } = await supabase
    .from("business_subscription_webhook_events")
    .select(BUSINESS_SUBSCRIPTION_WEBHOOK_EVENT_SELECT)
    .eq("raw_body_sha256", params.rawBodySha256)
    .single<BusinessSubscriptionWebhookEventRow>();

  if (existingError) {
    throw existingError;
  }

  return { event: existing, duplicate: true };
}

export async function updateBusinessSubscriptionWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  values: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("business_subscription_webhook_events")
    .update(values)
    .eq("id", eventId);

  if (error) {
    throw error;
  }
}
