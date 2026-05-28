import {
  Building2,
  CreditCard,
  ImageIcon,
  Send,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { AgentListingsShareCard } from "@/components/agent/agent-listings-share-card";
import { AgentPropertyListingForm } from "@/components/agent/agent-property-listing-form";
import { AgentPropertyListingMediaUploader } from "@/components/agent/agent-property-listing-media-uploader";
import { LandlordVerificationLinkForm } from "@/components/agent/landlord-verification-link-form";
import {
  ListingMediaGallery,
  ListingMediaSummary,
} from "@/components/listings/listing-media-gallery";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getAgentListingMediaByListingId } from "@/server/services/agent-property-listing-media-read.service";
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

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return "";
  }

  return appUrl.replace(/\/$/, "");
}

export default async function AgentListingsPage() {
  const { agent, profile, paystackAccount, listings } =
    await getCurrentAgentListingsWorkspace();

  const mediaByListingId = await getAgentListingMediaByListingId(
    listings.map((listing) => listing.id),
  );

  const canSubmitListing = Boolean(profile);
  const payoutVerification = getPaystackPayoutVerificationUiState(
    paystackAccount,
    "agent",
  );

  const appBaseUrl = getAppBaseUrl();
  const publicListingPath = `/agent-listings/${agent.id}`;
  const publicListingUrl = appBaseUrl
    ? `${appBaseUrl}${publicListingPath}`
    : publicListingPath;

  return (
    <div>
      <PageHeader
        title="Agent listings"
        description="Submit landlord properties, manage media, and share available listings with prospective tenants."
      />

      <AgentListingsShareCard
        listingUrl={publicListingUrl}
        agentName={profile?.business_name ?? agent.fullName ?? null}
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
              <p className="text-sm font-bold text-text-muted">Share link</p>
              <p className="font-black text-text-strong">Active</p>
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
          description="Compact view for managing many listings without clutter. Open media or verification only when needed."
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
            <div className="space-y-3">
              {listings.map((listing) => {
                const listingMedia = mediaByListingId.get(listing.id) ?? [];
                const isVerified = listing.status === "landlord_verified";

                return (
                  <article
                    key={listing.id}
                    className="rounded-card border border-border-soft bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate font-black text-text-strong">
                            {listing.property_name}
                          </h2>
                          <Badge tone={getStatusTone(listing.status)}>
                            {getListingVerificationStatusCopy(listing)}
                          </Badge>
                        </div>

                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-text-muted">
                          {listing.address}, {listing.lga}, {listing.state}
                        </p>

                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <div className="rounded-button bg-white px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-text-muted">
                              Landlord
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-text-strong">
                              {listing.landlord_full_name}
                            </p>
                          </div>

                          <div className="rounded-button bg-white px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-text-muted">
                              Unit
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-text-strong">
                              {listing.unit_identifier}
                            </p>
                          </div>

                          <div className="rounded-button bg-white px-3 py-2">
                            <p className="text-[11px] font-black uppercase tracking-wide text-text-muted">
                              Rent
                            </p>
                            <p className="mt-1 text-sm font-bold text-text-strong">
                              {formatMoney(
                                listing.annual_rent ?? listing.monthly_rent,
                                listing.currency_code,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full xl:w-64">
                        <ListingMediaSummary media={listingMedia} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
                      <p className="text-xs font-bold text-text-muted">
                        Created{" "}
                        {new Date(listing.created_at).toLocaleDateString(
                          "en-NG",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-text-muted">
                          <ImageIcon
                            aria-hidden="true"
                            size={14}
                            strokeWidth={2.6}
                          />
                          {listingMedia.length} media
                        </span>

                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
                            isVerified
                              ? "bg-success-soft text-success"
                              : "bg-warning-soft text-warning"
                          }`}
                        >
                          <ShieldCheck
                            aria-hidden="true"
                            size={14}
                            strokeWidth={2.6}
                          />
                          {isVerified ? "Verified" : "Needs verification"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <details className="group rounded-button bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-text-strong">
                          <span className="inline-flex items-center gap-2">
                            <UploadCloud
                              aria-hidden="true"
                              size={17}
                              strokeWidth={2.6}
                            />
                            Manage media
                          </span>
                          <span className="text-xs font-bold text-primary group-open:hidden">
                            Open
                          </span>
                          <span className="hidden text-xs font-bold text-primary group-open:inline">
                            Close
                          </span>
                        </summary>

                        <div className="space-y-4 border-t border-border-soft p-4">
                          <ListingMediaGallery media={listingMedia} compact />

                          <AgentPropertyListingMediaUploader
                            listingId={listing.id}
                          />
                        </div>
                      </details>

                      <details className="group rounded-button bg-white">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-black text-text-strong">
                          <span className="inline-flex items-center gap-2">
                            <ShieldCheck
                              aria-hidden="true"
                              size={17}
                              strokeWidth={2.6}
                            />
                            Verification
                          </span>
                          <span className="text-xs font-bold text-primary group-open:hidden">
                            Open
                          </span>
                          <span className="hidden text-xs font-bold text-primary group-open:inline">
                            Close
                          </span>
                        </summary>

                        <div className="border-t border-border-soft p-4">
                          {isVerified ? (
                            <div className="rounded-button bg-success-soft px-4 py-3 text-sm font-semibold leading-6 text-success">
                              This listing has been reviewed and approved by the
                              landlord. The final approved details are locked
                              for the agent workflow.
                            </div>
                          ) : (
                            <LandlordVerificationLinkForm
                              listingId={listing.id}
                              disabled={
                                !canCreateVerificationLink(listing.status)
                              }
                            />
                          )}
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
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
