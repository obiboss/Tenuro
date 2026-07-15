import Link from "next/link";
import { PhoneForgotPasswordForm } from "@/components/auth/phone-forgot-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getRecoveryErrorMessage(error: string | undefined) {
  if (error === "missing" || error === "session") {
    return "Your recovery session is no longer valid. Start again.";
  }

  return undefined;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <>
      <PageHeader
        title="Reset your password"
        description="Enter the phone number you use to sign in to BOPA."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Phone account recovery"
          description="This reset flow is for landlord, tenant, agent, developer, and other phone-based BOPA accounts."
        />

        <PhoneForgotPasswordForm
          initialErrorMessage={getRecoveryErrorMessage(resolvedSearchParams.error)}
        />

        <p className="text-center text-sm text-text-muted">
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-primary">
            Back to sign in
          </Link>
        </p>
      </div>
    </>
  );
}
