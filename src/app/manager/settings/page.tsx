import { redirect } from "next/navigation";
import { ManagerPaystackAccountForm } from "@/components/manager/manager-paystack-account-form";
import { PayoutVerificationAutoRefresh } from "@/components/payment/payout-verification-auto-refresh";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  getCurrentManagerBankSetup,
  getPaystackBanksForManagerSetup,
} from "@/server/services/manager-bank.service";
import { getPaystackPayoutVerificationUiState } from "@/server/services/paystack-verification.service";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerSettingsPage() {
  const manager = await requireManager();
  const supabase = await createSupabaseServerClient();

  const organization = await getManagerOrganizationForCurrentUser(
    supabase,
    manager.id,
  );

  if (!organization) {
    redirect("/manager/onboarding");
  }

  const [bankSetup, banks] = await Promise.all([
    getCurrentManagerBankSetup(),
    getPaystackBanksForManagerSetup(),
  ]);

  const payoutVerification = getPaystackPayoutVerificationUiState(
    bankSetup,
    "manager",
  );

  const shouldAutoRefreshPayoutVerification =
    Boolean(bankSetup) && payoutVerification.state === "unverified";

  return (
    <div>
      <PayoutVerificationAutoRefresh
        enabled={shouldAutoRefreshPayoutVerification}
      />

      <PageHeader
        title="Settings"
        description="Manage manager payout bank account and payment readiness."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Gateway payout account"
          description="This account receives rent when tenants pay through Paystack."
          action={
            <Badge tone={payoutVerification.badgeTone}>
              {payoutVerification.badgeLabel}
            </Badge>
          }
        >
          {bankSetup ? (
            <div className="space-y-4">
              <div
                className={
                  payoutVerification.isVerified
                    ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success"
                    : payoutVerification.state === "failed"
                      ? "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
                      : "rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning"
                }
              >
                {payoutVerification.guidance}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Bank</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {bankSetup.bank_name}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Account Number
                  </p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {bankSetup.account_number}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4 md:col-span-2">
                  <p className="text-sm font-bold text-text-muted">
                    Account Name
                  </p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {bankSetup.account_name}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
              No payout account has been connected yet.
            </div>
          )}
        </SectionCard>

        <div
          id="payout-account"
          className="scroll-mt-28 xl:sticky xl:top-28 xl:self-start"
        >
          <SectionCard
            title="Set Up Bank Account"
            description="Connect the manager account for Paystack rent collection."
          >
            <ManagerPaystackAccountForm
              banks={banks}
              defaultBusinessName={organization.organization_name}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
