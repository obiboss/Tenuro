import Link from "next/link";
import { LandlordProfileSetup } from "@/components/auth/landlord-profile-setup";
import { PageHeader } from "@/components/ui/page-header";

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        title="Create your landlord account"
        description="Start with your phone number. Tenuro will send a verification code before creating your account."
      />

      <div className="space-y-6">
        <LandlordProfileSetup />

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
