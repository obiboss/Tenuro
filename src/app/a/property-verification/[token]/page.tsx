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
              <Badge tone="primary">Landlord review</Badge>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                Review and approve this property
              </h1>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                An agent submitted this property on Tenuro. Please correct any
                wrong details before approval. Once approved, the final version
                will be shown to the agent and cannot be changed by the agent.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <SectionCard
              title="Final landlord approval"
              description="Review the submitted property, correct mistakes, and approve the final details."
            >
              <PublicLandlordVerificationForm token={token} listing={listing} />

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
