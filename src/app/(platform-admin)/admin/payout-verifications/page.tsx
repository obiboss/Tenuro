import { PageHeader } from "@/components/ui/page-header";
import { PayoutVerificationQueue } from "@/components/platform-admin/payout-verification-queue";
import { getPlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";

export default async function PlatformAdminPayoutVerificationsPage() {
  const queue = await getPlatformAdminPayoutVerificationQueue();

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Payout verifications"
        description="Review landlord and agent Paystack payout accounts before split settlements are enabled."
      />

      <PayoutVerificationQueue queue={queue} />
    </div>
  );
}
