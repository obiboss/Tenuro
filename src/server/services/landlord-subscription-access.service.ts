import "server-only";

import { AppError } from "@/server/errors/app-error";
import type { SubscriptionRow } from "@/server/repositories/subscription.repository";
import {
  getLandlordTrialSettings,
  getLatestSubscriptionForProfile,
} from "@/server/repositories/subscription.repository";
import { requireLandlord } from "@/server/services/auth.service";
import { getPlatformPaymentSettings } from "@/server/services/platform-payment-settings.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const PAID_LANDLORD_PLANS = new Set<SubscriptionRow["plan_type"]>([
  "basic",
  "pro",
]);

export type LandlordPlatformAccessReason =
  | "active_subscription"
  | "trialing"
  | "legacy_grandfathered"
  | "trial_expired"
  | "subscription_inactive";

export type LandlordPlatformAccessState = {
  hasAccess: boolean;
  reason: LandlordPlatformAccessReason;
  isTrialing: boolean;
  trialExpiresAt: string | null;
  subscriptionStatus: SubscriptionRow["status"] | null;
  subscriptionPlan: SubscriptionRow["plan_type"] | null;
  basicAnnualPrice: number;
  proAnnualPrice: number;
};

function isFutureTimestamp(value: string | null, nowMs: number) {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() > nowMs;
}

function resolveTrialExpiresAt(params: {
  trialExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
}) {
  return params.trialExpiresAt ?? params.subscriptionExpiresAt;
}

function hasActivePaidSubscription(
  subscription: SubscriptionRow | null,
  nowMs: number,
) {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== "active") {
    return false;
  }

  if (!PAID_LANDLORD_PLANS.has(subscription.plan_type)) {
    return false;
  }

  return isFutureTimestamp(subscription.expires_at, nowMs);
}

function hasActiveTrial(params: {
  subscription: SubscriptionRow | null;
  trialExpiresAt: string | null;
  nowMs: number;
}) {
  if (params.subscription?.status !== "trialing") {
    return false;
  }

  const expiresAt = resolveTrialExpiresAt({
    trialExpiresAt: params.trialExpiresAt,
    subscriptionExpiresAt: params.subscription.expires_at,
  });

  return isFutureTimestamp(expiresAt, params.nowMs);
}

function isLegacyGrandfathered(params: {
  subscription: SubscriptionRow | null;
  trialStartedAt: string | null;
}) {
  return !params.subscription && !params.trialStartedAt;
}

export async function getLandlordPlatformAccessState(
  landlordId: string,
): Promise<LandlordPlatformAccessState> {
  const supabase = createSupabaseAdminClient();
  const settings = await getPlatformPaymentSettings();
  const trialSettings = await getLandlordTrialSettings(supabase, landlordId);
  const subscription = await getLatestSubscriptionForProfile(
    supabase,
    landlordId,
  );

  const nowMs = Date.now();
  const trialExpiresAt = resolveTrialExpiresAt({
    trialExpiresAt: trialSettings?.trial_expires_at ?? null,
    subscriptionExpiresAt: subscription?.expires_at ?? null,
  });
  const isTrialing = hasActiveTrial({
    subscription,
    trialExpiresAt,
    nowMs,
  });

  const baseState = {
    isTrialing,
    trialExpiresAt,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionPlan: subscription?.plan_type ?? null,
    basicAnnualPrice: settings.bopaBasicAnnualPriceNaira,
    proAnnualPrice: settings.bopaProAnnualPriceNaira,
  };

  if (hasActivePaidSubscription(subscription, nowMs)) {
    return {
      ...baseState,
      hasAccess: true,
      reason: "active_subscription",
    };
  }

  if (isTrialing) {
    return {
      ...baseState,
      hasAccess: true,
      reason: "trialing",
    };
  }

  if (
    isLegacyGrandfathered({
      subscription,
      trialStartedAt: trialSettings?.trial_started_at ?? null,
    })
  ) {
    return {
      ...baseState,
      hasAccess: true,
      reason: "legacy_grandfathered",
    };
  }

  if (subscription?.status === "trialing") {
    return {
      ...baseState,
      hasAccess: false,
      reason: "trial_expired",
    };
  }

  return {
    ...baseState,
    hasAccess: false,
    reason: "subscription_inactive",
  };
}

export function assertLandlordPlatformAccess(
  access: LandlordPlatformAccessState,
) {
  if (access.hasAccess) {
    return;
  }

  const message =
    access.reason === "trial_expired"
      ? "Your free trial has ended. Subscribe to BOPA Basic or BOPA Pro in Settings to continue using BOPA."
      : "An active BOPA Basic or BOPA Pro subscription is required to use this feature.";

  throw new AppError("LANDLORD_SUBSCRIPTION_REQUIRED", message, 403);
}

export async function assertLandlordPlatformAccessForProfile(
  landlordId: string,
) {
  const access = await getLandlordPlatformAccessState(landlordId);

  assertLandlordPlatformAccess(access);

  return access;
}

export async function getCurrentLandlordPlatformAccessContext() {
  const landlord = await requireLandlord();
  const access = await getLandlordPlatformAccessState(landlord.id);

  return {
    landlordId: landlord.id,
    access,
  };
}
