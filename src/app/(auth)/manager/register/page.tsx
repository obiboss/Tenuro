import Link from "next/link";
import { ManagerRegisterForm } from "@/components/manager/manager-register-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";

export default function PropertyManagerRegisterPage() {
  return (
    <>
      <PageHeader
        title="Create your BOPA Manager account"
        description="Start with your personal work login. You will set up your property management organization after signing in."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Built for property management firms"
          description="BOPA Manager is for teams that manage properties for multiple landlords and need clear rent records."
        />

        <ManagerRegisterForm />

        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/manager/login" className="font-bold text-primary">
            Sign in
          </Link>
        </p>

        <p className="text-center text-sm text-text-muted">
          Managing only your own properties?{" "}
          <Link href="/register" className="font-bold text-primary">
            Create landlord account
          </Link>
        </p>
      </div>
    </>
  );
}
