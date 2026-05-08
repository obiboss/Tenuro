import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { PublicLandlordVerificationForm } from "@/components/agent/public-landlord-verification-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getPublicLandlordVerificationListing } from "@/server/services/agent-property-listings.service";

type PropertyVerificationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

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

export default async function PropertyVerificationPage({
  params,
}: PropertyVerificationPageProps) {
  const { token } = await params;
  const listing = await getPublicLandlordVerificationListing(token);

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
            <Building2 aria-hidden="true" size={23} strokeWidth={2.7} />
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Tenuro
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Property records made simple
            </p>
          </div>
        </Link>

        <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
              <ShieldCheck aria-hidden="true" size={24} strokeWidth={2.6} />
            </div>

            <div>
              <Badge tone="primary">Landlord verification</Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                Confirm this property listing
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                An agent submitted this property on Tenuro. Please confirm only
                if you own this property or authorised the agent to manage this
                onboarding.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <SectionCard
              title="Landlord details"
              description="These details were submitted by the agent."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Name</p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {listing.landlord_full_name}
                  </p>
                </div>

                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Phone</p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {listing.landlord_phone_number}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Property details"
              description="Review the property before confirming."
            >
              <div className="space-y-3">
                <div className="rounded-button bg-background p-4">
                  <p className="text-sm font-bold text-text-muted">Property</p>
                  <p className="mt-1 font-extrabold text-text-strong">
                    {listing.property_name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {listing.address}, {listing.lga}, {listing.state}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">Unit</p>
                    <p className="mt-1 font-extrabold text-text-strong">
                      {listing.unit_identifier}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">
                      Unit type
                    </p>
                    <p className="mt-1 font-extrabold text-text-strong">
                      {listing.unit_type.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div className="rounded-button bg-background p-4">
                    <p className="text-sm font-bold text-text-muted">Rent</p>
                    <p className="mt-1 font-extrabold text-text-strong">
                      {formatMoney(
                        listing.annual_rent ?? listing.monthly_rent,
                        listing.currency_code,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Confirm authorisation"
              description="After confirmation, the agent can continue the onboarding workflow."
            >
              <PublicLandlordVerificationForm token={token} />

              <div className="mt-4">
                <Link href="/">
                  <Button type="button" variant="ghost" fullWidth>
                    Back to Tenuro
                  </Button>
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
