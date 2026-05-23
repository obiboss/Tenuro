import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionRow = {
  id: string;
  profile_id: string;
  plan_type: "free" | "basic" | "pro" | "agent";
  status: "active" | "trialing" | "past_due" | "expired" | "cancelled";
  amount_naira: number;
  billing_period: string;
  starts_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

const SUBSCRIPTION_SELECT = `
  id,
  profile_id,
  plan_type,
  status,
  amount_naira,
  billing_period,
  starts_at,
  expires_at,
  cancelled_at,
  cancellation_reason,
  created_at,
  updated_at
`;

export async function getLatestSubscriptionForProfile(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTrialingLandlordSubscription(
  supabase: SupabaseClient,
  params: {
    profileId: string;
    trialDays: number;
  },
) {
  const startsAt = new Date();
  const expiresAt = new Date(
    startsAt.getTime() + params.trialDays * 24 * 60 * 60 * 1000,
  );

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      profile_id: params.profileId,
      plan_type: "basic",
      status: "trialing",
      amount_naira: 0,
      billing_period: "annual",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      metadata: {
        trial_type: "landlord_first_month",
      },
    })
    .select(SUBSCRIPTION_SELECT)
    .single<SubscriptionRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertLandlordTrialSettings(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    trialStartedAt: string;
    trialExpiresAt: string;
  },
) {
  const { error } = await supabase.from("landlord_settings").upsert(
    {
      landlord_id: params.landlordId,
      trial_started_at: params.trialStartedAt,
      trial_expires_at: params.trialExpiresAt,
    },
    {
      onConflict: "landlord_id",
    },
  );

  if (error) {
    throw error;
  }
}

export async function getLandlordTrialSettings(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("landlord_settings")
    .select("landlord_id, trial_started_at, trial_expires_at")
    .eq("landlord_id", landlordId)
    .maybeSingle<{
      landlord_id: string;
      trial_started_at: string | null;
      trial_expires_at: string | null;
    }>();

  if (error) {
    throw error;
  }

  return data;
}
