import { BadgeCheck, CreditCard, MapPin, ShieldCheck } from "lucide-react";
import { AgentBankSetupForm } from "@/components/agent/agent-bank-setup-form";
import { AgentProfileForm } from "@/components/agent/agent-profile-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import {
  getCurrentAgentWorkspace,
  getPaystackBanksForAgentSetup,
} from "@/server/services/agent-profile.service";

export default async function AgentOverviewPage() {
  const [{ agent, profile, paystackAccount }, banks] = await Promise.all([
    getCurrentAgentWorkspace(),
    getPaystackBanksForAgentSetup(),
  ]);

  const profileComplete = Boolean(profile);
  const payoutConnected = Boolean(paystackAccount);

  return (
    <div>
      <PageHeader
        title="Agent workspace"
        description="Set up your agent profile and payout account before submitting landlord properties."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <BadgeCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Profile</p>
              <p className="font-black text-text-strong">
                {profileComplete ? "Completed" : "Required"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
              <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Payout</p>
              <p className="font-black text-text-strong">
                {payoutConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Verification</p>
              <p className="font-black text-text-strong">
                {profile?.is_verified ? "Verified" : "Pending"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <SectionCard
            title="Agent profile"
            description="This profile identifies you to landlords and supports agent-led property onboarding."
            action={
              profileComplete ? (
                <Badge tone="success">Saved</Badge>
              ) : (
                <Badge tone="warning">Required</Badge>
              )
            }
          >
            <AgentProfileForm
              profile={profile}
              agentPhoneNumber={agent.phoneNumber}
            />
          </SectionCard>

          <SectionCard
            title="Current payout account"
            description="Agent commissions will be settled to this Paystack subaccount when agent split payments are enabled."
            action={
              payoutConnected ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <Badge tone="warning">Not connected</Badge>
              )
            }
          >
            {paystackAccount ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Bank</p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {paystackAccount.bank_name}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Account Number
                  </p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {paystackAccount.account_number}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4 md:col-span-2">
                  <p className="text-sm font-bold text-text-muted">
                    Account Name
                  </p>
                  <p className="mt-2 font-extrabold text-text-strong">
                    {paystackAccount.account_name}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
                No agent payout account has been connected yet.
              </div>
            )}
          </SectionCard>
        </div>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Connect payout account"
            description="Verify the agent bank account and create a Paystack subaccount for future commission splits."
          >
            <AgentBankSetupForm
              banks={banks}
              defaultBusinessName={profile?.business_name ?? ""}
              disabled={!profileComplete}
            />

            {!profileComplete ? (
              <div className="mt-4 rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
                Save your agent profile before connecting a payout account.
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>

      <div className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <MapPin aria-hidden="true" size={22} strokeWidth={2.6} />
          </div>

          <div>
            <p className="font-bold text-text-strong">Next agent workflow</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              After profile and payout setup, agents can submit landlord
              properties, send landlord verification links, and later receive
              commission through multi-party Paystack split payments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
