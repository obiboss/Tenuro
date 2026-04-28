import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSessionAfterOTP } from "@/server/services/session.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, phone_number")
    .eq("id", data.user.id)
    .single<{
      id: string;
      role: "landlord" | "tenant" | "caretaker";
      phone_number: string;
    }>();

  if (profileError || !profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await createSessionAfterOTP({
    userId: profile.id,
    role: profile.role,
    phoneNumber: profile.phone_number,
  });

  return NextResponse.redirect(new URL("/overview", request.url));
}
