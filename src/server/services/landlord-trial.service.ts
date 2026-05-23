import "server-only";

import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import {
  createTrialingLandlordSubscription,
  getLandlordTrialSettings,
  getLatestSubscriptionForProfile,
  upsertLandlordTrialSettings,
} from "@/server/repositories/subscription.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { getPlatformPaymentSettings } from "@/server/services/platform-payment-settings.service";
import { requireLandlord } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export async function startLandlordTrialIfEligible(landlordId: string) {
  const supabase = createSupabaseAdminClient();
  const settings = await getPlatformPaymentSettings();

  if (settings.landlordTrialDays <= 0) {
    return null;
  }

  const existingTrial = await getLandlordTrialSettings(supabase, landlordId);

  if (existingTrial?.trial_started_at) {
    return existingTrial;
  }

  const existingSubscription = await getLatestSubscriptionForProfile(
    supabase,
    landlordId,
  );

  if (existingSubscription) {
    return null;
  }

  const trialStartedAt = new Date();
  const trialExpiresAt = new Date(
    trialStartedAt.getTime() +
      settings.landlordTrialDays * 24 * 60 * 60 * 1000,
  );

  const subscription = await createTrialingLandlordSubscription(supabase, {
    profileId: landlordId,
    trialDays: settings.landlordTrialDays,
  });

  await upsertLandlordTrialSettings(supabase, {
    landlordId,
    trialStartedAt: trialStartedAt.toISOString(),
    trialExpiresAt: trialExpiresAt.toISOString(),
  });

  await writeSystemAuditLog({
    landlordId,
    eventType: AUDIT_EVENT_TYPES.landlordTrialStarted,
    entityType: AUDIT_ENTITY_TYPES.platformSettings,
    entityId: subscription.id,
    description: "Landlord first-month platform trial started.",
    metadata: {
      audit_subtype: "landlord_trial_started",
      subscription_id: subscription.id,
      trial_started_at: trialStartedAt.toISOString(),
      trial_expires_at: trialExpiresAt.toISOString(),
      trial_days: settings.landlordTrialDays,
    },
  });

  return {
    trialStartedAt: trialStartedAt.toISOString(),
    trialExpiresAt: trialExpiresAt.toISOString(),
    subscriptionId: subscription.id,
  };
}

export async function getLandlordTrialStatusForCurrentLandlord(landlordId: string) {
  const supabase = createSupabaseAdminClient();
  const settings = await getPlatformPaymentSettings();
  const trialSettings = await getLandlordTrialSettings(supabase, landlordId);
  const subscription = await getLatestSubscriptionForProfile(
    supabase,
    landlordId,
  );

  const trialExpiresAt =
    trialSettings?.trial_expires_at ?? subscription?.expires_at ?? null;
  const isTrialing =
    subscription?.status === "trialing" &&
    trialExpiresAt !== null &&
    new Date(trialExpiresAt).getTime() > Date.now();

  return {
    isTrialing,
    trialStartedAt: trialSettings?.trial_started_at ?? subscription?.starts_at ?? null,
    trialExpiresAt,
    trialDays: settings.landlordTrialDays,
    basicAnnualPrice: settings.bopaBasicAnnualPriceNaira,
    proAnnualPrice: settings.bopaProAnnualPriceNaira,
  };
}

export async function getCurrentLandlordPricingContext() {
  const landlord = await requireLandlord();

  return getLandlordTrialStatusForCurrentLandlord(landlord.id);
}
