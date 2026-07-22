import { Settings } from "lucide-react";
import { AgreementTemplateEditor } from "@/components/agreement/agreement-template-editor";
import { BankSetupForm } from "@/components/payment/bank-setup-form";
import { PayoutVerificationAutoRefresh } from "@/components/payment/payout-verification-auto-refresh";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getLandlordAgreementTemplateEditorState } from "@/server/services/agreement-templates.service";
import {
  getCurrentLandlordBankSetup,
  getPaystackBanksForSetup,
} from "@/server/services/landlord-bank.service";
import { getPaystackPayoutVerificationUiState } from "@/server/services/paystack-verification.service";

export default async function SettingsPage() {
  const [bankSetup, banks, agreementTemplate] = await Promise.all([
    getCurrentLandlordBankSetup(),
    getPaystackBanksForSetup(),
    getLandlordAgreementTemplateEditorState(),
  ]);

  const payoutVerification = getPaystackPayoutVerificationUiState(
    bankSetup,
    "landlord",
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
        description="Manage your payout account and tenancy agreement wording."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Gateway payout account"
          description="This account receives landlord rent when tenants pay through Paystack."
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
            description="Connect the landlord account for Paystack split payments."
          >
            <BankSetupForm banks={banks} />
          </SectionCard>
        </div>
      </div>

      <div id="agreement-template" className="mt-6 scroll-mt-28">
        <SectionCard
          title="Your tenancy agreement"
          description="Read the agreement your tenants will receive. You can change the wording whenever needed."
        >
          <AgreementTemplateEditor
            scope={agreementTemplate.scope}
            propertyId={agreementTemplate.propertyId}
            propertyName={agreementTemplate.propertyName}
            name={agreementTemplate.name}
            templateBody={agreementTemplate.templateBody}
          />
        </SectionCard>
      </div>

      <div className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Settings aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div>
            <p className="font-bold text-text-strong">Payment rule</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Gateway payments use Paystack split settlement. Manual payments
              recorded by landlords do not generate BOPA service fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
