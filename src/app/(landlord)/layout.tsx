import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LandlordShell } from "@/components/layout/landlord-shell";
import { PayoutOnboardingBanner } from "@/components/payment/payout-onboarding-banner";
import { isGatedLandlordPath } from "@/server/constants/landlord-subscription-gating";
import { requireLandlord } from "@/server/services/auth.service";
import { getLandlordPayoutOnboardingBannerState } from "@/server/services/landlord-onboarding.service";
import { getLandlordPlatformAccessState } from "@/server/services/landlord-subscription-access.service";

type LandlordLayoutProps = {
  children: React.ReactNode;
};

export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const landlord = await requireLandlord();
  const [payoutOnboardingBanner, platformAccess] = await Promise.all([
    getLandlordPayoutOnboardingBannerState(),
    getLandlordPlatformAccessState(landlord.id),
  ]);

  const pathname = (await headers()).get("x-pathname") ?? "";

  if (isGatedLandlordPath(pathname) && !platformAccess.hasAccess) {
    redirect("/settings?subscription=required#bopa-plans");
  }

  return (
    <LandlordShell
      landlordName={landlord.fullName}
      platformAccessLocked={!platformAccess.hasAccess}
    >
      {payoutOnboardingBanner.shouldShow ? (
        <PayoutOnboardingBanner initialVisible />
      ) : null}

      {children}
    </LandlordShell>
  );
}
