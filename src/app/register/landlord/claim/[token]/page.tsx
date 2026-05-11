import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { LandlordClaimSignupForm } from "@/components/agent/landlord-claim-signup-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { getPublicLandlordClaimListing } from "@/server/services/agent-property-listings.service";

type LandlordClaimPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function LandlordClaimPage({
  params,
}: LandlordClaimPageProps) {
  const { token } = await params;
  const listing = await getPublicLandlordClaimListing(token);

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
            B
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Property records made simple
            </p>
          </div>
        </Link>

        <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <PlusCircle aria-hidden="true" size={24} strokeWidth={2.6} />
            </div>

            <div>
              <Badge tone="primary">Add more units</Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                Complete your landlord account
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                Your property has been approved. Create a password to continue
                managing it and add more flats, rooms, shops, or units.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <SectionCard
              title={listing.property_name}
              description={`${listing.address}, ${listing.lga}, ${listing.state}`}
            >
              <LandlordClaimSignupForm token={token} listing={listing} />

              <div className="mt-4">
                <Link href="/login">
                  <Button type="button" variant="ghost" fullWidth>
                    I already have an account
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
