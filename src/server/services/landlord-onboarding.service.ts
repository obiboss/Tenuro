import "server-only";

import { cookies } from "next/headers";
import { PAYOUT_ONBOARDING_BANNER_DISMISSED_COOKIE } from "@/server/constants/ui-preferences";
import { getCurrentLandlordBankSetup } from "@/server/services/landlord-bank.service";
import { requireLandlord } from "@/server/services/auth.service";
import { getPaystackPayoutVerificationState } from "@/server/services/paystack-verification.service";

export async function getLandlordPayoutOnboardingBannerState() {
  await requireLandlord();

  const bankSetup = await getCurrentLandlordBankSetup();
  const payoutState = getPaystackPayoutVerificationState(bankSetup);

  if (payoutState !== "missing") {
    return {
      shouldShow: false,
    };
  }

  const cookieStore = await cookies();
  const isDismissed =
    cookieStore.get(PAYOUT_ONBOARDING_BANNER_DISMISSED_COOKIE)?.value === "1";

  return {
    shouldShow: !isDismissed,
  };
}

export async function dismissLandlordPayoutOnboardingBanner() {
  await requireLandlord();

  const bankSetup = await getCurrentLandlordBankSetup();
  const payoutState = getPaystackPayoutVerificationState(bankSetup);

  if (payoutState !== "missing") {
    return;
  }

  const cookieStore = await cookies();

  cookieStore.set(PAYOUT_ONBOARDING_BANNER_DISMISSED_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}
