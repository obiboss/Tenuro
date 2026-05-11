import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";
import { PublicAgreementSignupForm } from "@/components/public-tools/public-agreement-signup-form";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getPublicAgreementSignupContext } from "@/server/services/public-tool-onboarding.service";

type PublicAgreementClaimPageProps = {
  params: Promise<{
    agreementId: string;
  }>;
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "Create Free BOPA Account | Save Your Agreement",
  description:
    "Create a free BOPA landlord account after generating your tenancy agreement.",
};

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return value?.trim() || "";
}

export default async function PublicAgreementClaimPage({
  params,
  searchParams,
}: PublicAgreementClaimPageProps) {
  const { agreementId } = await params;
  const resolvedSearchParams = await searchParams;
  const token = getSearchParamValue(resolvedSearchParams.token);

  let context: Awaited<
    ReturnType<typeof getPublicAgreementSignupContext>
  > | null = null;
  let errorMessage = "";

  try {
    context = await getPublicAgreementSignupContext({
      agreementId,
      token,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "This agreement signup link could not be opened.";
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-8 md:px-8 lg:py-10">
        <Link href="/" className="mb-8 flex w-fit items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
            B
          </div>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-text-strong">
              Boldverse Property
            </p>
            <p className="text-xs font-semibold text-text-muted">
              Property Management for Modern Landlords
            </p>
          </div>
        </Link>

        {!context ? (
          <SectionCard
            title="Agreement signup link unavailable"
            description={errorMessage}
          >
            <TrustNotice
              title="Generate a fresh agreement"
              description="Please return to the free agreement generator and create a new agreement if this link has expired."
              icon={
                <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
              }
            />

            <div className="mt-5">
              <Link href="/agreement-generator">
                <Button fullWidth>Open Agreement Generator</Button>
              </Link>
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Create your free BOPA account"
            description="Your agreement is ready. Create a password to save this agreement under your landlord account."
          >
            <TrustNotice
              title={context.agreementTitle}
              description={`${context.tenantFullName} · ${context.propertyLabel}`}
              icon={<FileText aria-hidden="true" size={22} strokeWidth={2.6} />}
            />

            <div className="mt-5">
              <PublicAgreementSignupForm
                agreementId={context.agreementId}
                token={token}
                fullName={context.landlordFullName}
                phoneNumber={context.landlordPhoneNumber}
                email={context.landlordEmail}
              />
            </div>
          </SectionCard>
        )}
      </section>
    </main>
  );
}
