import Link from "next/link";
import { AgentRegisterForm } from "@/components/auth/agent-register-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function AgentRegisterPage() {
  return (
    <>
      <PageHeader
        title="Create your agent account"
        description="Register with your phone number and password to submit landlord properties and manage agent-led onboarding."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Phone number is your primary login"
          description="Use your real WhatsApp phone number. WhatsApp OTP verification will be added later to confirm ownership of the number."
        />

        <AgentRegisterForm />

        <p className="text-center text-sm text-text-muted">
          Registering as a landlord instead?{" "}
          <Link href="/register" className="font-bold text-primary">
            Create landlord account
          </Link>
        </p>
      </div>
    </>
  );
}
