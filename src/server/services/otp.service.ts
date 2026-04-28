import { AppError } from "@/server/errors/app-error";
import {
  countRecentOtpRequests,
  createOtpDeliveryLog,
  createOtpRecord,
  getLatestActiveOtpRecord,
  incrementOtpAttempts,
  invalidateActiveOtpRequests,
  invalidateOtpById,
  markOtpVerified,
  updateOtpDeliveryStatus,
} from "@/server/repositories/otp.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  OtpPurpose,
  OtpRequestResult,
  OtpVerifyResult,
} from "@/server/types/auth.types";
import { sha256Hex, timingSafeEqualText } from "@/server/utils/crypto";
import { maskPhoneNumber, normalisePhoneNumber } from "@/server/utils/phone";
import { dispatchOtp } from "./otp-dispatch.service";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 15;
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;

function generateOtpCode() {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;

  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

function getOtpExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  return expiresAt;
}

function getRateLimitStartDate() {
  const since = new Date();
  since.setMinutes(since.getMinutes() - OTP_RATE_LIMIT_WINDOW_MINUTES);

  return since;
}

export async function requestOtp(params: {
  phoneNumber: string;
  purpose: OtpPurpose;
  requestedIp?: string | null;
  userAgent?: string | null;
}): Promise<OtpRequestResult> {
  const supabase = createSupabaseAdminClient();
  const normalizedPhone = normalisePhoneNumber(params.phoneNumber);

  const recentRequestCount = await countRecentOtpRequests(supabase, {
    phoneNumber: normalizedPhone.e164,
    sinceIso: getRateLimitStartDate().toISOString(),
  });

  if (recentRequestCount >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    throw new AppError(
      "OTP_RATE_LIMITED",
      "Too many code requests. Please wait 15 minutes and try again.",
      429,
    );
  }

  await invalidateActiveOtpRequests(supabase, {
    phoneNumber: normalizedPhone.e164,
    purpose: params.purpose,
  });

  const otpCode = generateOtpCode();
  const otpHash = sha256Hex(otpCode);
  const expiresAt = getOtpExpiryDate();

  const otpRecord = await createOtpRecord(supabase, {
    phoneNumber: normalizedPhone.e164,
    otpHash,
    purpose: params.purpose,
    requestedIp: params.requestedIp ?? null,
    userAgent: params.userAgent ?? null,
    deliveryChannel: "whatsapp",
    expiresAt: expiresAt.toISOString(),
  });

  const deliveryResult = await dispatchOtp({
    phoneNumber: normalizedPhone.e164,
    otpCode,
  });

  await updateOtpDeliveryStatus(supabase, {
    otpId: otpRecord.id,
    channel: deliveryResult.channel,
    status: deliveryResult.status,
  });

  await createOtpDeliveryLog(supabase, {
    otpId: otpRecord.id,
    phoneNumber: normalizedPhone.e164,
    channel: deliveryResult.channel,
    status: deliveryResult.status,
    provider: deliveryResult.provider,
    providerReference: deliveryResult.providerReference ?? null,
    failureReason: deliveryResult.failureReason ?? null,
  });

  if (deliveryResult.status === "failed") {
    throw new AppError(
      "OTP_DELIVERY_FAILED",
      "Verification code could not be sent. Please try again.",
      502,
    );
  }

  return {
    phoneNumber: normalizedPhone.e164,
    maskedPhoneNumber: maskPhoneNumber(normalizedPhone.e164),
    deliveryChannel: deliveryResult.channel,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyOtp(params: {
  phoneNumber: string;
  otpCode: string;
  purpose: OtpPurpose;
}): Promise<OtpVerifyResult> {
  const supabase = createSupabaseAdminClient();
  const normalizedPhone = normalisePhoneNumber(params.phoneNumber);

  const otpRecord = await getLatestActiveOtpRecord(supabase, {
    phoneNumber: normalizedPhone.e164,
    purpose: params.purpose,
  });

  if (!otpRecord) {
    throw new AppError(
      "OTP_NOT_FOUND",
      "The code has expired or is no longer valid.",
      400,
    );
  }

  if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
    await invalidateOtpById(supabase, otpRecord.id);

    throw new AppError(
      "OTP_EXPIRED",
      "The code has expired. Please request a new one.",
      400,
    );
  }

  if (otpRecord.attempts >= otpRecord.max_attempts) {
    await invalidateOtpById(supabase, otpRecord.id);

    throw new AppError(
      "OTP_TOO_MANY_ATTEMPTS",
      "Too many wrong attempts. Please request a new code.",
      429,
    );
  }

  await incrementOtpAttempts(supabase, otpRecord.id);

  const incomingHash = sha256Hex(params.otpCode);
  const isMatch = timingSafeEqualText(incomingHash, otpRecord.otp_hash);

  if (!isMatch) {
    throw new AppError(
      "OTP_INCORRECT",
      "That code is incorrect. Please try again.",
      400,
    );
  }

  await markOtpVerified(supabase, otpRecord.id);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, phone_number")
    .eq("phone_number", normalizedPhone.e164)
    .maybeSingle<{
      id: string;
      role: "landlord" | "tenant" | "caretaker";
      phone_number: string;
    }>();

  if (error) {
    throw error;
  }

  return {
    userId: profile?.id ?? "",
    role: profile?.role ?? "landlord",
    phoneNumber: normalizedPhone.e164,
  };
}
