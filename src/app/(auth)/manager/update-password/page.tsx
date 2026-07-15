import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { PageHeader } from "@/components/ui/page-header";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getProfileById } from "@/server/repositories/profiles.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";

export default async function ManagerUpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/manager/forgot-password?error=session");
  }

  const adminSupabase = createSupabaseAdminClient();
  const profile = await getProfileById(adminSupabase, user.id);

  if (!profile || profile.role !== "manager") {
    redirect("/manager/forgot-password?error=session");
  }

  return (
    <>
      <PageHeader
        title="Change password"
        description="Create a new password for your BOPA Manager account."
      />

      <div className="space-y-6">
        <TrustNotice
          title="Use a strong password"
          description="Your new password must use the same password rules as BOPA sign up."
        />

        <UpdatePasswordForm flow="manager" />
      </div>
    </>
  );
}
