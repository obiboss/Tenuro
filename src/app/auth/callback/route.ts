import { NextResponse } from "next/server";
import { getSafeAuthRedirectPath } from "@/lib/auth/safe-auth-redirect";
import { getHomePathForRole } from "@/lib/auth-routing";
import { createSessionAfterOTP } from "@/server/services/session.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { UserRole } from "@/server/types/auth.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANAGER_RECOVERY_PATH = "/manager/update-password";

function redirectToPath(path: string, request: Request) {
  return NextResponse.redirect(new URL(path, request.url));
}

function getInvalidCallbackRedirect(nextPath: string | null) {
  if (nextPath === MANAGER_RECOVERY_PATH) {
    return "/manager/forgot-password?error=expired";
  }

  return "/login";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeAuthRedirectPath(
    requestUrl.searchParams.get("next"),
    "",
  );
  const safeNextPath = nextPath.length > 0 ? nextPath : null;

  if (!code) {
    return redirectToPath(getInvalidCallbackRedirect(safeNextPath), request);
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return redirectToPath(getInvalidCallbackRedirect(safeNextPath), request);
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, phone_number")
    .eq("id", data.user.id)
    .single<{
      id: string;
      role: UserRole;
      phone_number: string | null;
    }>();

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: "local" });

    return redirectToPath(getInvalidCallbackRedirect(safeNextPath), request);
  }

  if (safeNextPath === MANAGER_RECOVERY_PATH) {
    if (profile.role !== "manager") {
      await supabase.auth.signOut({ scope: "local" });

      return redirectToPath("/manager/forgot-password?error=expired", request);
    }

    return redirectToPath(MANAGER_RECOVERY_PATH, request);
  }

  if (profile.phone_number) {
    await createSessionAfterOTP({
      userId: profile.id,
      role: profile.role,
      phoneNumber: profile.phone_number,
    });
  }

  return redirectToPath(safeNextPath ?? getHomePathForRole(profile.role), request);
}
