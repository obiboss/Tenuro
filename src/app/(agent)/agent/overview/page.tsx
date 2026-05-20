import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CreditCard,
  Home,
  MapPin,
  Send,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { AgentBankSetupForm } from "@/components/agent/agent-bank-setup-form";
import { AgentProfileForm } from "@/components/agent/agent-profile-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentAgentDashboardOverview } from "@/server/services/agent-dashboard.service";
import {
  getCurrentAgentWorkspace,
  getPaystackBanksForAgentSetup,
} from "@/server/services/agent-profile.service";
import { PaymentVerificationAutoRefresh } from "@/components/payment/payment-verification-auto-refresh";
import { getListingVerificationStatusCopy } from "@/server/services/agent-property-listings.service";
import { getPaystackPayoutVerificationUiState } from "@/server/services/paystack-verification.service";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRent(amount: number | null, currencyCode: string) {
  if (!amount) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getListingStatusTone(status: string) {
  if (status === "converted" || status === "landlord_verified") {
    return "success" as const;
  }

  if (status === "rejected" || status === "archived") {
    return "danger" as const;
  }

  return "warning" as const;
}

function SetupStatusCard({
  title,
  value,
  icon,
  toneClass,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  toneClass: string;
}) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-bold text-text-muted">{title}</p>
          <p className="font-black text-text-strong">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({
  title,
  value,
  helper,
  icon,
  toneClass,
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  toneClass: string;
}) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-text-muted">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            {value}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
            {helper}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 rounded-card border border-border-soft bg-background p-4 transition hover:border-primary/40 hover:bg-primary-soft/40"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
          {icon}
        </div>

        <div>
          <p className="font-black text-text-strong">{title}</p>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            {description}
          </p>
        </div>
      </div>

      <ArrowRight
        aria-hidden="true"
        size={18}
        strokeWidth={2.6}
        className="mt-1 shrink-0 text-text-muted transition group-hover:text-primary"
      />
    </Link>
  );
}

export default async function AgentOverviewPage() {
  const [{ agent, profile, paystackAccount }, banks, dashboardOverview] =
    await Promise.all([
      getCurrentAgentWorkspace(),
      getPaystackBanksForAgentSetup(),
      getCurrentAgentDashboardOverview(),
    ]);

  const profileComplete = Boolean(profile);
  const payoutConnected = Boolean(paystackAccount);
  const payoutVerification = getPaystackPayoutVerificationUiState(
    paystackAccount,
    "agent",
  );
  const payoutVerified = payoutVerification.isVerified;
  const shouldAutoRefreshPayoutVerification =
    Boolean(paystackAccount) && payoutVerification.state === "unverified";

  return (
    <div>
      <PaymentVerificationAutoRefresh
        enabled={shouldAutoRefreshPayoutVerification}
      />

      <PageHeader
        title="Agent workspace"
        description="Set up your agent profile, connect payout, and track listings, tenant onboarding, processing fees, and commissions."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SetupStatusCard
          title="Profile"
          value={profileComplete ? "Completed" : "Required"}
          toneClass="bg-primary-soft text-primary"
          icon={<BadgeCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <SetupStatusCard
          title="Payout Account"
          value={payoutConnected ? "Connected" : "Required"}
          toneClass={
            payoutConnected
              ? "bg-primary-soft text-primary"
              : "bg-warning-soft text-warning"
          }
          icon={<CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <SetupStatusCard
          title="Payout Verification"
          value={payoutVerification.badgeLabel}
          toneClass={
            payoutVerification.state === "verified"
              ? "bg-success-soft text-success"
              : payoutVerification.state === "failed"
                ? "bg-danger-soft text-danger"
                : "bg-warning-soft text-warning"
          }
          icon={<ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />}
        />
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
            description="Agent processing fees and commissions are settled to this Paystack subaccount when split payments are used."
            action={
              payoutConnected ? (
                <Badge tone={payoutVerification.badgeTone}>
                  {payoutVerification.badgeLabel}
                </Badge>
              ) : (
                <Badge tone="warning">Not connected</Badge>
              )
            }
          >
            {paystackAccount ? (
              <div className="space-y-4">
                <div
                  className={
                    payoutVerification.state === "verified"
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
            description="Verify the agent bank account and create a Paystack subaccount for processing fees and future commission splits."
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
              properties, send landlord verification links, send tenant
              onboarding links, collect processing fees, and receive approved
              commissions through Paystack split payments.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <PageHeader
          title="Dashboard summary"
          description="Track your agent pipeline, tenant onboarding, processing fee earnings, and final commission allocations."
          action={
            payoutVerified ? (
              <Badge tone="success">Payout Ready</Badge>
            ) : (
              <Badge tone={payoutVerification.badgeTone}>
                {payoutVerification.badgeLabel}
              </Badge>
            )
          }
        />

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            title="Submitted Listings"
            value={dashboardOverview.listingStats.total}
            helper={`${dashboardOverview.listingStats.converted} converted properties`}
            toneClass="bg-primary-soft text-primary"
            icon={<Building2 aria-hidden="true" size={22} strokeWidth={2.6} />}
          />

          <DashboardStatCard
            title="Tenant Links Sent"
            value={dashboardOverview.tenants.totalInvited}
            helper={`${dashboardOverview.tenants.approved} tenants approved`}
            toneClass="bg-success-soft text-success"
            icon={<Users aria-hidden="true" size={22} strokeWidth={2.6} />}
          />

          <DashboardStatCard
            title="Processing Fee Earned"
            value={formatMoney(
              dashboardOverview.processingFees.paidAgentShareAmount,
            )}
            helper={`${dashboardOverview.processingFees.pendingCount} processing fees pending`}
            toneClass="bg-gold-soft text-gold-deep"
            icon={<Banknote aria-hidden="true" size={22} strokeWidth={2.6} />}
          />

          <DashboardStatCard
            title="Commission Paid"
            value={formatMoney(dashboardOverview.commissions.paidAmount)}
            helper={`${formatMoney(
              dashboardOverview.commissions.pendingAmount,
            )} pending`}
            toneClass="bg-warning-soft text-warning"
            icon={<CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <SectionCard
              title="Pipeline Overview"
              description="A quick view of where your landlord property submissions currently stand."
            >
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Ready</p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {dashboardOverview.listingStats.submitted}
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Sent to Landlord
                  </p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {dashboardOverview.listingStats.verificationSent}
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Approved</p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {dashboardOverview.listingStats.landlordApproved}
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Converted</p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {dashboardOverview.listingStats.converted}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Recent Listings"
              description="Latest landlord properties you submitted or converted."
              action={
                <Link
                  href="/agent/listings"
                  className="text-sm font-extrabold text-primary hover:text-primary-hover"
                >
                  View all
                </Link>
              }
            >
              {dashboardOverview.recentListings.length === 0 ? (
                <EmptyState
                  title="No listing yet"
                  description="Submit your first landlord property listing to start building your agent pipeline."
                  icon={
                    <Building2 aria-hidden="true" size={24} strokeWidth={2.6} />
                  }
                />
              ) : (
                <div className="space-y-3">
                  {dashboardOverview.recentListings.map((listing) => (
                    <article
                      key={listing.id}
                      className="rounded-card border border-border-soft bg-background p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-black text-text-strong">
                              {listing.property_name}
                            </h2>
                            <Badge tone={getListingStatusTone(listing.status)}>
                              {getListingVerificationStatusCopy(listing)}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm leading-6 text-text-muted">
                            {listing.unit_identifier} ·{" "}
                            {formatRent(
                              listing.annual_rent ?? listing.monthly_rent,
                              listing.currency_code,
                            )}
                          </p>
                        </div>

                        <p className="text-sm font-bold text-text-muted">
                          {new Date(listing.created_at).toLocaleDateString(
                            "en-NG",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Earnings Summary"
              description="Processing fee earnings are separate from final rent commissions."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Processing Fees Paid
                  </p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {formatMoney(
                      dashboardOverview.processingFees.paidAgentShareAmount,
                    )}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {dashboardOverview.processingFees.paidCount} paid tenant
                    processing fees.
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Final Commission Pipeline
                  </p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {formatMoney(
                      dashboardOverview.commissions
                        .approvedFinalCommissionAmount,
                    )}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Approved by landlords before tenant final payment.
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Paid Commission
                  </p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {formatMoney(dashboardOverview.commissions.paidAmount)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {dashboardOverview.commissions.paidAllocationCount} paid
                    allocations.
                  </p>
                </div>

                <div className="rounded-card bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">
                    Pending Commission
                  </p>
                  <p className="mt-2 text-2xl font-black text-text-strong">
                    {formatMoney(dashboardOverview.commissions.pendingAmount)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    {dashboardOverview.commissions.pendingAllocationCount}{" "}
                    pending allocations.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            {!profileComplete ? (
              <TrustNotice
                title="Complete agent profile"
                description="Your agent profile is required before submitting landlord property listings."
                icon={
                  <UserRoundCheck
                    aria-hidden="true"
                    size={22}
                    strokeWidth={2.6}
                  />
                }
              />
            ) : null}

            {!payoutConnected ? (
              <TrustNotice
                title="Connect payout account"
                description="Add your bank details so BOPA can route processing fees and commissions to you."
                icon={
                  <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />
            ) : null}

            <SectionCard
              title="Quick Actions"
              description="Continue the most common agent workflows."
            >
              <div className="space-y-3">
                <QuickAction
                  href="/agent/listings"
                  title="Add property listing"
                  description="Submit a landlord property and send verification to the landlord."
                  icon={
                    <Building2 aria-hidden="true" size={20} strokeWidth={2.6} />
                  }
                />

                <QuickAction
                  href="/agent/onboarding"
                  title="Send tenant onboarding"
                  description="Invite tenants for converted landlord properties."
                  icon={<Send aria-hidden="true" size={20} strokeWidth={2.6} />}
                />

                <QuickAction
                  href="/agent/commissions"
                  title="Review commissions"
                  description="Check processing fees and final commission allocations."
                  icon={
                    <CreditCard
                      aria-hidden="true"
                      size={20}
                      strokeWidth={2.6}
                    />
                  }
                />
              </div>
            </SectionCard>

            <TrustNotice
              title="Connected vacancies coming next"
              description="The next batch will show connected units with quit notice, move-out, or vacancy signals."
              icon={<Home aria-hidden="true" size={22} strokeWidth={2.6} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
