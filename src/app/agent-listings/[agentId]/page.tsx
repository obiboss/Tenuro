import Link from "next/link";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <PageHeader
        title="Available apartments"
        description="View available listings first. Apply only for the apartment you are interested in."
      />

      <SectionCard
        title="Listings"
        description="Each application is reviewed by the landlord. Processing fee does not guarantee approval or availability."
      >
        {listings.length === 0 ? (
          <EmptyState
            title="No available listing"
            description="The agent has no landlord-approved listings available at the moment."
            icon={<Building2 aria-hidden="true" size={24} strokeWidth={2.6} />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-card border border-border-soft bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone="success">Available</Badge>
                    <h2 className="mt-3 text-lg font-black text-text-strong">
                      {listing.property_name}
                    </h2>
                  </div>

                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Building2 aria-hidden="true" size={22} strokeWidth={2.6} />
                  </div>
                </div>

                <p className="mt-3 flex gap-2 text-sm font-semibold leading-6 text-text-muted">
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

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                      Type
                    </p>
                    <p className="mt-1 font-bold capitalize text-text-strong">
                      {listing.unit_type.replaceAll("_", " ")}
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

                <div className="mt-4 rounded-button bg-gold-soft px-4 py-3 text-sm font-semibold leading-6 text-gold-deep">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mr-2 inline"
                    size={16}
                    strokeWidth={2.6}
                  />
                  You only fill KYC once. If your processing fee is still valid
                  within this same agent/landlord context, you will not pay
                  again.
                </div>

                <Link
                  href={`/agent-listings/${agentId}/${listing.id}/apply`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-button bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95"
                >
                  Apply for this apartment
                </Link>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}
