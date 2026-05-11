import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, FileText } from "lucide-react";
import { PublicReceiptSignupForm } from "@/components/public-tools/public-receipt-signup-form";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getPublicReceiptSignupContext } from "@/server/services/public-tool-onboarding.service";

type PublicReceiptClaimPageProps = {
  params: Promise<{
    receiptId: string;
  }>;
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "Create Free BOPA Account | Save Your Receipt",
  description:
    "Create a free BOPA landlord account after generating your rent receipt.",
};

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return value?.trim() || "";
}

export default async function PublicReceiptClaimPage({
  params,
  searchParams,
}: PublicReceiptClaimPageProps) {
  const { receiptId } = await params;
  const resolvedSearchParams = await searchParams;
  const token = getSearchParamValue(resolvedSearchParams.token);

  let context: Awaited<
    ReturnType<typeof getPublicReceiptSignupContext>
  > | null = null;
  let errorMessage = "";

  try {
    context = await getPublicReceiptSignupContext({
      receiptId,
      token,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message
        : "This receipt signup link could not be opened.";
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
            title="Receipt signup link unavailable"
            description={errorMessage}
          >
            <TrustNotice
              title="Generate a fresh receipt"
              description="Please return to the free receipt generator and create a new receipt if this link has expired."
              icon={
                <AlertTriangle aria-hidden="true" size={22} strokeWidth={2.6} />
              }
            />

            <div className="mt-5">
              <Link href="/receipt-generator">
                <Button fullWidth>Open Receipt Generator</Button>
              </Link>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-6">
            <SectionCard
              title="Create your free BOPA account"
              description="Your receipt is ready. Create a password to save this receipt under your landlord account."
            >
              <TrustNotice
                title={`Receipt ${context.receiptNumber}`}
                description={`${context.tenantFullName} · ${context.propertyLabel}`}
                icon={
                  <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
                }
              />

              <div className="mt-5">
                <PublicReceiptSignupForm
                  receiptId={context.receiptId}
                  token={token}
                  fullName={context.landlordFullName}
                  phoneNumber={context.landlordPhoneNumber}
                  email={context.landlordEmail}
                />
              </div>
            </SectionCard>
          </div>
        )}
      </section>
    </main>
  );
}
