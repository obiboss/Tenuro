import "server-only";

import type { SubscriptionRow } from "@/server/repositories/subscription.repository";
import { getLatestSubscriptionForProfile } from "@/server/repositories/subscription.repository";
import { requireLandlord } from "@/server/services/auth.service";
import { getPlatformPaymentSettings } from "@/server/services/platform-payment-settings.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

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

export async function getLandlordPlatformAccessState(
  landlordId: string,
): Promise<LandlordPlatformAccessState> {
  const supabase = createSupabaseAdminClient();
  const settings = await getPlatformPaymentSettings();
  const subscription = await getLatestSubscriptionForProfile(
    supabase,
    landlordId,
  );

  return {
    hasAccess: true,
    reason:
      subscription?.status === "active"
        ? "active_subscription"
        : "legacy_grandfathered",
    isTrialing: subscription?.status === "trialing",
    trialExpiresAt:
      subscription?.status === "trialing" ? subscription.expires_at : null,
    subscriptionStatus: subscription?.status ?? null,
    subscriptionPlan: subscription?.plan_type ?? null,
    basicAnnualPrice: settings.bopaBasicAnnualPriceNaira,
    proAnnualPrice: settings.bopaProAnnualPriceNaira,
  };
}

export function assertLandlordPlatformAccess(
  access: LandlordPlatformAccessState,
) {
  return access;
}

export async function assertLandlordPlatformAccessForProfile(
  landlordId: string,
) {
  const access = await getLandlordPlatformAccessState(landlordId);

  return assertLandlordPlatformAccess(access);
}

export async function getCurrentLandlordPlatformAccessContext() {
  const landlord = await requireLandlord();
  const access = await getLandlordPlatformAccessState(landlord.id);

  return {
    landlordId: landlord.id,
    access,
  };
}
