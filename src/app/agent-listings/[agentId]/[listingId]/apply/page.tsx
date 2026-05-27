import Link from "next/link";
import { ArrowLeft, Building2, MapPin, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TenantListingApplicationForm } from "@/components/public/tenant-listing-application-form";
import { getPublicAgentListing } from "@/server/services/public-agent-listings.service";

function formatMoney(amount: number | null, currencyCode: string) {
  if (!amount) {
    return "Rent not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PublicAgentListingApplyPage({
  params,
}: {
  params: Promise<{ agentId: string; listingId: string }>;
}) {
  const { agentId, listingId } = await params;
  const listing = await getPublicAgentListing({ agentId, listingId });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <Link
        href={`/agent-listings/${agentId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={2.6} />
        Back to listings
      </Link>

      <PageHeader
        title="Apply for this apartment"
        description="Confirm the listing, complete your KYC profile, and proceed only if you understand that approval is not guaranteed."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <SectionCard
          title={listing.property_name}
          description={`${listing.unit_identifier} · ${listing.unit_type.replaceAll(
            "_",
            " ",
          )}`}
        >
          <div className="rounded-card border border-border-soft bg-background p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Building2 aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <h2 className="font-black text-text-strong">
                  {listing.property_name}
                </h2>
                <p className="mt-2 flex gap-2 text-sm font-semibold leading-6 text-text-muted">
                  <MapPin
                    aria-hidden="true"
                    className="mt-1 shrink-0"
                    size={16}
                    strokeWidth={2.6}
                  />
                  <span>
                    {listing.address}, {listing.lga}, {listing.state}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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

              <div className="rounded-button bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  Bedrooms
                </p>
                <p className="mt-1 font-bold text-text-strong">
                  {listing.bedrooms}
                </p>
              </div>

              <div className="rounded-button bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  Bathrooms
                </p>
                <p className="mt-1 font-bold text-text-strong">
                  {listing.bathrooms}
                </p>
              </div>
            </div>

            {listing.notes ? (
              <div className="mt-5 rounded-button bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                  Agent note
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-text-strong">
                  {listing.notes}
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-button bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
              Payment of processing and verification fee is not a guarantee of
              securing this apartment. The landlord may reject the application,
              the apartment may become unavailable, or you may reject it after
              physical inspection.
            </div>

            <div className="mt-3 rounded-button bg-gold-soft px-4 py-3 text-sm font-semibold leading-6 text-gold-deep">
              <ShieldCheck
                aria-hidden="true"
                className="mr-2 inline"
                size={16}
                strokeWidth={2.6}
              />
              If your previous processing fee is still valid within this same
              agent/landlord context, you will not pay again.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Tenant KYC"
          description="Your KYC profile can be reused for another listing if this application does not proceed."
        >
          <TenantListingApplicationForm listingId={listing.id} />
        </SectionCard>
      </div>
    </main>
  );
}
