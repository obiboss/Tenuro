import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getVerifiedPhoneRecoveryPhoneNumber } from "@/server/services/password-recovery-state.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ResetPasswordPage() {
  const verifiedPhoneNumber = await getVerifiedPhoneRecoveryPhoneNumber();

  if (!verifiedPhoneNumber) {
    redirect("/forgot-password?error=session");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/forgot-password?error=session");
  }

  return (
    <>
      <PageHeader
        title="Change password"
        description="Create a new password for your BOPA account."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Use a strong password"
          description="Your new password must use the same password rules as BOPA sign up."
        />

        <UpdatePasswordForm flow="phone" />
      </div>
    </>
  );
}
