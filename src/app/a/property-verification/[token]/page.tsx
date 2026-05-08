import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
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

type PropertyVerificationPageState =
  | {
      ok: true;
      listing: Awaited<ReturnType<typeof getPublicLandlordVerificationListing>>;
    }
  | {
      ok: false;
      message: string;
    };

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "This property verification link could not be opened. Please ask the agent to send a new verification link.";
}

async function getPageState(
  token: string,
): Promise<PropertyVerificationPageState> {
  try {
    const listing = await getPublicLandlordVerificationListing(token);

    return {
      ok: true,
      listing,
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

function TenuroBrand() {
  return (
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
  );
}

export default async function PropertyVerificationPage({
  params,
}: PropertyVerificationPageProps) {
  const { token } = await params;
  const state = await getPageState(token);

  if (!state.ok) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl">
          <TenuroBrand />

          <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <Badge tone="warning">Verification link issue</Badge>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                  This link cannot be opened
                </h1>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {state.message}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
              The agent should open their Tenuro agent dashboard and send a new
              verification link to the landlord on WhatsApp.
            </div>

            <div className="mt-6">
              <Link href="/">
                <Button type="button" fullWidth>
                  Back to Tenuro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { listing } = state;

  if (listing.status === "landlord_verified") {
    const claimUrl = `/register/landlord/claim/${encodeURIComponent(token)}`;

    return (
      <main className="min-h-screen bg-background px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl">
          <TenuroBrand />

          <div className="mt-8 rounded-card bg-surface p-5 shadow-card md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                <CheckCircle2 aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <Badge tone="success">Property approved</Badge>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-text-strong">
                  Property approved successfully
                </h1>
                <p className="mt-3 text-sm leading-6 text-text-muted">
                  The final property details have been saved. You can now
                  continue with Tenuro.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-button bg-background p-4">
              <p className="font-extrabold text-text-strong">
                {listing.property_name}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                {listing.address}, {listing.lga}, {listing.state}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {listing.matched_landlord_id ? (
                <Link href="/login">
                  <Button type="button" fullWidth>
                    Sign In To Continue
                  </Button>
                </Link>
              ) : (
                <Link href={claimUrl}>
                  <Button type="button" fullWidth>
                    Add More Units
                  </Button>
                </Link>
              )}

              <p className="text-center text-sm leading-6 text-text-muted">
                {listing.matched_landlord_id
                  ? "Your landlord account already exists. Sign in to continue managing your property."
                  : "Create your password next, then continue adding more flats, rooms, shops, or units."}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <TenuroBrand />

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
