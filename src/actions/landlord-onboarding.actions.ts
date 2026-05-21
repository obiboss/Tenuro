"use server";

import { dismissLandlordPayoutOnboardingBanner } from "@/server/services/landlord-onboarding.service";

export async function dismissPayoutOnboardingBannerAction() {
  await dismissLandlordPayoutOnboardingBanner();
}
