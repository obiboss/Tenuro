import Link from "next/link";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function PropertyManagerLoginPage() {
  return (
    <>
      <PageHeader
        title="Property manager sign in"
        description="Use your verified work email and password to access your property operations workspace."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Secure firm access"
          description="Property manager accounts use email verification for multi-staff property operations."
        />

        <EmailLoginForm />

        <SectionCard
          title="Magic link sign in"
          description="Receive a secure sign-in link in your inbox if you prefer passwordless access."
        >
          <MagicLinkForm />
        </SectionCard>

        <p className="text-center text-sm text-text-muted">
          New property management firm?{" "}
          <Link href="/manager/register" className="font-bold text-primary">
            Create property manager account
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Are you a landlord or agent?{" "}
          <Link href="/" className="font-bold text-primary">
            Return to home
          </Link>
        </p>
      </div>
    </>
  );
}
