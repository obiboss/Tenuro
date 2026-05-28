import Link from "next/link";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { ListingCoverPreview } from "@/components/listings/listing-media-gallery";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getAgentListingMediaByListingId } from "@/server/services/agent-property-listing-media-read.service";
import { getPublicAgentListings } from "@/server/services/public-agent-listings.service";

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

export default async function PublicAgentListingsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  const listings = await getPublicAgentListings(agentId);
  const mediaByListingId = await getAgentListingMediaByListingId(
    listings.map((listing) => listing.id),
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <PageHeader
        title="Available apartments"
        description="Browse available apartments first. Open only the property you are interested in before applying."
      />

      <SectionCard
        title="Apartment gallery"
        description="Choose an apartment to view full details, pictures, videos, and the application form."
      >
        {listings.length === 0 ? (
          <EmptyState
            title="No available listing"
            description="The agent has no landlord-approved listings available at the moment."
            icon={<Building2 aria-hidden="true" size={24} strokeWidth={2.6} />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => {
              const listingMedia = mediaByListingId.get(listing.id) ?? [];
              const rent = formatMoney(
                listing.annual_rent ?? listing.monthly_rent,
                listing.currency_code,
              );

              return (
                <Link
                  key={listing.id}
                  href={`/agent-listings/${agentId}/${listing.id}/apply`}
                  className="group overflow-hidden rounded-card border border-border-soft bg-background p-3 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                >
                  <ListingCoverPreview media={listingMedia} />

                  <div className="p-2">
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Badge tone="success">Available</Badge>

                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-white">
                        <ArrowRight
                          aria-hidden="true"
                          size={18}
                          strokeWidth={2.6}
                        />
                      </span>
                    </div>

                    <h2 className="mt-3 line-clamp-1 text-lg font-black text-text-strong">
                      {listing.property_name}
                    </h2>

                    <p className="mt-2 flex gap-2 text-sm font-semibold leading-6 text-text-muted">
                      <MapPin
                        aria-hidden="true"
                        className="mt-1 shrink-0"
                        size={16}
                        strokeWidth={2.6}
                      />
                      <span className="line-clamp-2">
                        {listing.lga}, {listing.state}
                      </span>
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-button bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-text-muted">
                          Type
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm font-bold capitalize text-text-strong">
                          {listing.unit_type.replaceAll("_", " ")}
                        </p>
                      </div>

                      <div className="rounded-button bg-white px-3 py-2">
                        <p className="text-[11px] font-black uppercase tracking-wide text-text-muted">
                          Rent
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm font-bold text-text-strong">
                          {rent}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-button bg-primary px-4 py-3 text-center text-sm font-black text-white transition group-hover:opacity-95">
                      View details
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      {listings.length > 0 ? (
        <div className="mt-6 rounded-card bg-gold-soft px-5 py-4 text-sm font-semibold leading-6 text-gold-deep">
          You only fill KYC after choosing a specific apartment. Processing fee
          does not guarantee approval or availability, and a valid fee can be
          reused within the same agent/landlord context.
        </div>
      ) : null}
    </main>
  );
}
