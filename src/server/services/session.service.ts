import "server-only";

import { cookies } from "next/headers";
import {
  SESSION_DURATION_MS,
  SESSION_DURATION_SECONDS,
  TENURO_SESSION_COOKIE,
} from "@/server/constants/session";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { ServerSessionUser, UserRole } from "@/server/types/auth.types";
import {
  createSignedSessionToken,
  verifySignedSessionToken,
} from "@/server/services/session-token.service";

export async function createSessionAfterOTP(params: {
  userId: string;
  role: UserRole;
  phoneNumber: string;
}) {
  const cookieStore = await cookies();

  const now = Date.now();

  const sessionToken = createSignedSessionToken({
    userId: params.userId,
    role: params.role,
    phoneNumber: params.phoneNumber,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  });

  cookieStore.set(TENURO_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getServerSession(): Promise<ServerSessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(TENURO_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  const payload = verifySignedSessionToken(sessionCookie.value);

  if (!payload) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email")
    .eq("id", payload.userId)
    .single<{
      id: string;
      role: UserRole;
      full_name: string;
      phone_number: string;
      email: string | null;
    }>();

  if (error || !profile) {
    return null;
  }

  if (profile.role !== payload.role) {
    return null;
  }

  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    phoneNumber: profile.phone_number,
    email: profile.email,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(TENURO_SESSION_COOKIE);
}
