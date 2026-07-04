import Link from "next/link";
import { ManagerLoginForm } from "@/components/manager/manager-login-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function PropertyManagerLoginPage() {
  return (
    <>
      <PageHeader
        title="BOPA Manager sign in"
        description="Access your property management workspace with your verified work email."
      />

      <div className="space-y-6">
        <TrustNotice
          title="For structured property managers"
          description="Use this workspace to manage landlord clients, properties, tenants, rents, and payment records."
        />

        <ManagerLoginForm />

        <p className="text-center text-sm text-text-muted">
          New property management firm?{" "}
          <Link href="/manager/register" className="font-bold text-primary">
            Create BOPA Manager account
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
