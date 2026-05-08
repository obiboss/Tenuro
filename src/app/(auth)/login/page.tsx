import Link from "next/link";
import { EmailFallbackPanel } from "@/components/auth/email-fallback-panel";
import { PhoneLoginForm } from "@/components/auth/phone-login-form";
import { PageHeader } from "@/components/ui/page-header";

export default function LoginPage() {
  return (
    <>
      <PageHeader
        title="Sign in"
        description="Use your phone number to access your properties, tenants, payments, and receipts."
      />

      <div className="space-y-6">
        <PhoneLoginForm purpose="login" />

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
