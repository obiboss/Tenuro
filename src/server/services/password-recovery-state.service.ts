import "server-only";

import { cookies } from "next/headers";
import { tryNormalisePhoneNumber } from "@/lib/phone";

const PHONE_RECOVERY_COOKIE = "bopa_phone_recovery";
const VERIFIED_PHONE_RECOVERY_COOKIE = "bopa_phone_recovery_verified";
const PHONE_RECOVERY_MAX_AGE_SECONDS = 10 * 60;

const recoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: PHONE_RECOVERY_MAX_AGE_SECONDS,
};

function normaliseCookiePhoneNumber(value: string | undefined) {
  const normalised = tryNormalisePhoneNumber(value);

  return normalised?.e164 ?? null;
}

export async function setPhoneRecoveryPhoneNumber(phoneNumber: string) {
  const cookieStore = await cookies();

  cookieStore.set(PHONE_RECOVERY_COOKIE, phoneNumber, recoveryCookieOptions);
}

export async function setVerifiedPhoneRecoveryPhoneNumber(phoneNumber: string) {
  const cookieStore = await cookies();

  cookieStore.set(
    VERIFIED_PHONE_RECOVERY_COOKIE,
    phoneNumber,
    recoveryCookieOptions,
  );
}

export async function getPhoneRecoveryPhoneNumber() {
  const cookieStore = await cookies();

  return normaliseCookiePhoneNumber(
    cookieStore.get(PHONE_RECOVERY_COOKIE)?.value,
  );
}

export async function getVerifiedPhoneRecoveryPhoneNumber() {
  const cookieStore = await cookies();

  return normaliseCookiePhoneNumber(
    cookieStore.get(VERIFIED_PHONE_RECOVERY_COOKIE)?.value,
  );
}

export async function clearPhoneRecoveryCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(PHONE_RECOVERY_COOKIE);
  cookieStore.delete(VERIFIED_PHONE_RECOVERY_COOKIE);
}
