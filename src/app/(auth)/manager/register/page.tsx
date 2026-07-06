import Link from "next/link";
import { ManagerRegisterForm } from "@/components/auth/manager-register-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function PropertyManagerRegisterPage() {
  return (
    <>
      <PageHeader
        title="Create BOPA Manager account"
        description="For property managers who manage rent records, tenants, and remittances for landlords."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Built for property managers"
          description="Know who is owing, who is due soon, what each landlord should receive, and which receipts or statements need to be sent."
        />

        <ManagerRegisterForm />

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/manager/login" className="font-bold text-primary">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Managing only your own property?{" "}
          <Link href="/register" className="font-bold text-primary">
            Create landlord account
          </Link>
        </p>
      </div>
    </>
  );
}
