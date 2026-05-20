import { Building2, Send, Users } from "lucide-react";
import { AgentTenantOnboardingLinkForm } from "@/components/agent/agent-tenant-onboarding-link-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getCurrentAgentTenantOnboardingWorkspace } from "@/server/services/agent-tenant-onboarding.service";
import { getPaystackPayoutVerificationUiState } from "@/server/services/paystack-verification.service";

function formatMoney(amount: number | null, currencyCode: string) {
  if (!amount) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AgentOnboardingPage() {
  const { listings, paystackAccount } =
    await getCurrentAgentTenantOnboardingWorkspace();
  const payoutVerification = getPaystackPayoutVerificationUiState(
    paystackAccount,
    "agent",
  );

  return (
    <div>
      <PageHeader
        title="Tenant onboarding"
        description="Send tenant onboarding links by WhatsApp after the landlord has completed property setup."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Building2 aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">
                Ready listings
              </p>
              <p className="font-black text-text-strong">{listings.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
              <Send aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Delivery</p>
              <p className="font-black text-text-strong">WhatsApp</p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
              <Users aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Next step</p>
              <p className="font-black text-text-strong">
                {payoutVerification.isVerified ? "Tenant KYC" : "Payout review"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!payoutVerification.isVerified ? (
        <div className="mb-6">
          <TrustNotice
            title={payoutVerification.badgeLabel}
            description={payoutVerification.guidance}
            className={
              payoutVerification.state === "failed"
                ? "bg-danger-soft text-danger"
                : "bg-warning-soft text-warning"
            }
          />
        </div>
      ) : null}

      {listings.length === 0 ? (
        <EmptyState
          title="No listing ready for tenant onboarding"
          description="A landlord must approve the property and complete setup before tenant onboarding can be sent."
          icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {listings.map((listing) => (
            <SectionCard
              key={listing.id}
              title={listing.property_name}
              description={`${listing.address}, ${listing.lga}, ${listing.state}`}
              action={
                <Badge
                  tone={
                    payoutVerification.isVerified
                      ? "success"
                      : payoutVerification.badgeTone
                  }
                >
                  {payoutVerification.isVerified
                    ? "Ready"
                    : payoutVerification.badgeLabel}
                </Badge>
              }
            >
              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-button bg-background p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Unit
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {listing.unit_identifier}
                  </p>
                </div>

                <div className="rounded-button bg-background p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Type
                  </p>
                  <p className="mt-1 font-bold capitalize text-text-strong">
                    {listing.unit_type.replaceAll("_", " ")}
                  </p>
                </div>

                <div className="rounded-button bg-background p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                    Rent
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {formatMoney(
                      listing.annual_rent ?? listing.monthly_rent,
                      listing.currency_code,
                    )}
                  </p>
                </div>
              </div>

              <AgentTenantOnboardingLinkForm
                listingId={listing.id}
                disabled={!payoutVerification.isVerified}
              />
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
