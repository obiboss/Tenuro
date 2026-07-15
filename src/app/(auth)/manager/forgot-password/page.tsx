import Link from "next/link";
import { ManagerForgotPasswordForm } from "@/components/auth/manager-forgot-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

type ManagerForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getRecoveryErrorMessage(error: string | undefined) {
  if (error === "expired") {
    return "This password reset link has expired. Request a new one.";
  }

  if (error === "session") {
    return "Your recovery session is no longer valid. Start again.";
  }

  return undefined;
}

export default async function ManagerForgotPasswordPage({
  searchParams,
}: ManagerForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <>
      <PageHeader
        title="Reset your password"
        description="Enter your BOPA Manager work email and we will send a secure reset link."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Manager account recovery"
          description="This reset flow is only for email-based BOPA Manager accounts."
        />

        <ManagerForgotPasswordForm
          initialErrorMessage={getRecoveryErrorMessage(resolvedSearchParams.error)}
        />

        <p className="text-center text-sm text-text-muted">
          Remember your password?{" "}
          <Link href="/manager/login" className="font-bold text-primary">
            Back to manager sign in
          </Link>
        </p>
      </div>
    </>
  );
}
