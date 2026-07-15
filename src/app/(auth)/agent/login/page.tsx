import Link from "next/link";
import { EmailFallbackPanel } from "@/components/auth/email-fallback-panel";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

type AgentLoginPageProps = {
  searchParams?: Promise<{
    passwordUpdated?: string;
  }>;
};

export default async function AgentLoginPage({
  searchParams,
}: AgentLoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <>
      <PageHeader
        title="Agent sign in"
        description="Use your registered phone number and password to access your agent workspace."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Agent workspace access"
          description="Only accounts registered as agents can access the BOPA agent workspace."
        />

        <PhoneLoginForm
          purpose="login"
          passwordUpdated={resolvedSearchParams.passwordUpdated === "true"}
        />

        <EmailFallbackPanel />

        <p className="text-center text-sm text-text-muted">
          New BOPA agent?{" "}
          <Link href="/agent/register" className="font-bold text-primary">
            Create agent account
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Are you a landlord?{" "}
          <Link href="/login" className="font-bold text-primary">
            Sign in as landlord
          </Link>
        </p>
      </div>
    </>
  );
}
