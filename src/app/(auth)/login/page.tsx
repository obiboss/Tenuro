import Link from "next/link";
import { EmailFallbackPanel } from "@/components/auth/email-fallback-panel";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import { PageHeader } from "@/components/ui/page-header";

type LoginPageProps = {
  searchParams?: Promise<{
    passwordUpdated?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <>
      <PageHeader
        title="Sign in"
        description="Use your phone number to access your properties, tenants, payments, and receipts."
      />

      <div className="space-y-6">
        <PhoneLoginForm
          purpose="login"
          passwordUpdated={resolvedSearchParams.passwordUpdated === "true"}
        />

        <EmailFallbackPanel />

        <p className="text-center text-sm text-text-muted">
          New landlord?{" "}
          <Link href="/register" className="font-bold text-primary">
            Create landlord account
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Are you an agent?{" "}
          <Link href="/agent/login" className="font-bold text-primary">
            Sign in or register as agent
          </Link>
        </p>
      </div>
    </>
  );
}
