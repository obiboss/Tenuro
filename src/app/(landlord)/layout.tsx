import { LandlordShell } from "@/components/layout/landlord-shell";
import { PayoutOnboardingBanner } from "@/components/payment/payout-onboarding-banner";
import { requireLandlord } from "@/server/services/auth.service";
import { getLandlordPayoutOnboardingBannerState } from "@/server/services/landlord-onboarding.service";

type LandlordLayoutProps = {
  children: React.ReactNode;
};

export default async function LandlordLayout({
  children,
}: LandlordLayoutProps) {
  const landlord = await requireLandlord();
  const payoutOnboardingBanner = await getLandlordPayoutOnboardingBannerState();

  return (
    <LandlordShell landlordName={landlord.fullName}>
      {payoutOnboardingBanner.shouldShow ? (
        <PayoutOnboardingBanner initialVisible />
      ) : null}

      {children}
    </LandlordShell>
  );
}
