import { Settings } from "lucide-react";
import { BankSetupForm } from "@/components/payment/bank-setup-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  getCurrentLandlordBankSetup,
  getPaystackBanksForSetup,
} from "@/server/services/landlord-bank.service";

export default async function SettingsPage() {
  const [bankSetup, banks] = await Promise.all([
    getCurrentLandlordBankSetup(),
    getPaystackBanksForSetup(),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage landlord profile, payout bank account, and notification preferences."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SectionCard
          title="Gateway payout account"
          description="This account receives landlord rent when tenants pay through Paystack."
          action={
            bankSetup ? (
              <Badge tone="success">Connected</Badge>
            ) : (
              <Badge tone="warning">Not Connected</Badge>
            )
          }
        >
          {bankSetup ? (
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
          ) : (
            <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
              No payout account has been connected yet.
            </div>
          )}
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Set Up Bank Account"
            description="Connect the landlord account for Paystack split payments."
          >
            <BankSetupForm banks={banks} />
          </SectionCard>
        </div>
      </div>

      <div className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Settings aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div>
            <p className="font-bold text-text-strong">Payment rule</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Gateway payments will use Paystack split settlement. Manual
              payments recorded by landlords do not generate Tenuro fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
