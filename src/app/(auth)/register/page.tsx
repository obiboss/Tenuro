import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        title="Create your landlord account"
        description="Create your account with your phone number and password. No verification code is required for normal login."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Create account with phone and password"
          description="Your phone number will be your main way to access Tenuro."
        />

        <RegisterForm />

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
