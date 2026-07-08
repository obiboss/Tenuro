import { PayoutVerificationQueue } from "@/components/platform-admin/payout-verification-queue";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";

export default async function PlatformAdminPayoutVerificationsPage() {
  const queue = await getPlatformAdminPayoutVerificationQueue();

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Payout verifications"
        description="Review landlord, agent, developer, and manager Paystack payout accounts before payout flows are enabled."
      />

      <PayoutVerificationQueue queue={queue} />
    </div>
  );
}
