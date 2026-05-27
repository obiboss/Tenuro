import { Building2, CreditCard, Send } from "lucide-react";
import { AgentPropertyListingForm } from "@/components/agent/agent-property-listing-form";
import { AgentPropertyListingMediaUploader } from "@/components/agent/agent-property-listing-media-uploader";
import { LandlordVerificationLinkForm } from "@/components/agent/landlord-verification-link-form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import {
  getCurrentAgentListingsWorkspace,
  getListingVerificationStatusCopy,
} from "@/server/services/agent-property-listings.service";
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

function getStatusTone(status: string) {
  if (status === "converted" || status === "landlord_verified") {
    return "success" as const;
  }

  if (status === "rejected" || status === "archived") {
    return "danger" as const;
  }

  return "warning" as const;
}

function canCreateVerificationLink(status: string) {
  return status === "submitted" || status === "landlord_verification_sent";
}

export default async function AgentListingsPage() {
  const { profile, paystackAccount, listings } =
    await getCurrentAgentListingsWorkspace();

  const canSubmitListing = Boolean(profile);
  const payoutVerification = getPaystackPayoutVerificationUiState(
    paystackAccount,
    "agent",
  );

  return (
    <div>
      <PageHeader
        title="Agent listings"
        description="Submit landlord properties, upload listing media, and send review links directly to landlords on WhatsApp."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Building2 aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Listings</p>
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
              <p className="text-sm font-bold text-text-muted">Profile</p>
              <p className="font-black text-text-strong">
                {profile ? "Ready" : "Required"}
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
                {payoutVerification.badgeLabel}
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

      <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
        <SectionCard
          title="Submitted listings"
          description="These listings remain agent-submitted records until the landlord reviews, corrects, and approves the final details."
        >
          {listings.length === 0 ? (
            <EmptyState
              title="No listing submitted yet"
              description="Submit your first landlord property listing to begin the verification workflow."
              icon={
                <Building2 aria-hidden="true" size={24} strokeWidth={2.6} />
              }
            />
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
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
                        <Badge tone={getStatusTone(listing.status)}>
                          {getListingVerificationStatusCopy(listing)}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {listing.address}, {listing.lga}, {listing.state}
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

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-button bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Landlord
                      </p>
                      <p className="mt-1 font-bold text-text-strong">
                        {listing.landlord_full_name}
                      </p>
                    </div>

                    <div className="rounded-button bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                        Unit
                      </p>
                      <p className="mt-1 font-bold text-text-strong">
                        {listing.unit_identifier}
                      </p>
                    </div>

                    <div className="rounded-button bg-white p-3">
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

                  <div className="mt-4">
                    <AgentPropertyListingMediaUploader listingId={listing.id} />
                  </div>

                  <div className="mt-4 rounded-button bg-white p-3">
                    {listing.status === "landlord_verified" ? (
                      <p className="text-sm font-semibold leading-6 text-success">
                        This listing has been reviewed and approved by the
                        landlord. The final approved details are now locked for
                        the agent workflow.
                      </p>
                    ) : (
                      <LandlordVerificationLinkForm
                        listingId={listing.id}
                        disabled={!canCreateVerificationLink(listing.status)}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="xl:sticky xl:top-28 xl:self-start">
          <SectionCard
            title="Submit property listing"
            description="Add the landlord, property, and first unit details."
            action={
              canSubmitListing ? (
                <Badge tone="success">Ready</Badge>
              ) : (
                <Badge tone="warning">Profile required</Badge>
              )
            }
          >
            {canSubmitListing ? (
              <AgentPropertyListingForm />
            ) : (
              <div className="rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
                Complete your agent profile before submitting landlord
                properties.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
