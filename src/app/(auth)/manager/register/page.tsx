import Link from "next/link";
import { EmailRegisterForm } from "@/components/auth/email-register-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function PropertyManagerRegisterPage() {
  return (
    <>
      <PageHeader
        title="Create your property manager account"
        description="Register with your work email and password. BOPA will verify your email before granting access."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Built for property operations teams"
          description="Use your firm email to create a secure account for managing properties, staff workflows, and rental operations at scale."
        />

        <EmailRegisterForm />

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/manager/login" className="font-bold text-primary">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Managing your own properties?{" "}
          <Link href="/register" className="font-bold text-primary">
            Create landlord account
          </Link>
        </p>
      </div>
    </>
  );
}
