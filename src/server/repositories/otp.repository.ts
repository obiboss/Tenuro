import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  OtpDeliveryChannel,
  OtpDeliveryStatus,
  OtpPurpose,
} from "@/server/types/auth.types";

export type OtpStoreRow = {
  id: string;
  phone_number: string;
  otp_hash: string;
  purpose: OtpPurpose;
  requested_ip: string | null;
  user_agent: string | null;
  delivery_channel: OtpDeliveryChannel;
  delivery_status: OtpDeliveryStatus;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  invalidated_at: string | null;
  created_at: string;
};

export async function countRecentOtpRequests(
  supabase: SupabaseClient,
  params: {
    phoneNumber: string;
    sinceIso: string;
  },
) {
  const { count, error } = await supabase
    .from("otp_store")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("phone_number", params.phoneNumber)
    .gte("created_at", params.sinceIso);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function invalidateActiveOtpRequests(
  supabase: SupabaseClient,
  params: {
    phoneNumber: string;
    purpose: OtpPurpose;
  },
) {
  const { error } = await supabase
    .from("otp_store")
    .update({
      invalidated_at: new Date().toISOString(),
    })
    .eq("phone_number", params.phoneNumber)
    .eq("purpose", params.purpose)
    .is("verified_at", null)
    .is("invalidated_at", null);

  if (error) {
    throw error;
  }
}

export async function createOtpRecord(
  supabase: SupabaseClient,
  params: {
    phoneNumber: string;
    otpHash: string;
    purpose: OtpPurpose;
    requestedIp?: string | null;
    userAgent?: string | null;
    deliveryChannel: OtpDeliveryChannel;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("otp_store")
    .insert({
      phone_number: params.phoneNumber,
      otp_hash: params.otpHash,
      purpose: params.purpose,
      requested_ip: params.requestedIp ?? null,
      user_agent: params.userAgent ?? null,
      delivery_channel: params.deliveryChannel,
      delivery_status: "pending",
      expires_at: params.expiresAt,
    })
    .select(
      "id, phone_number, otp_hash, purpose, requested_ip, user_agent, delivery_channel, delivery_status, attempts, max_attempts, expires_at, verified_at, invalidated_at, created_at",
    )
    .single<OtpStoreRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateOtpDeliveryStatus(
  supabase: SupabaseClient,
  params: {
    otpId: string;
    channel: OtpDeliveryChannel;
    status: OtpDeliveryStatus;
  },
) {
  const { error } = await supabase
    .from("otp_store")
    .update({
      delivery_channel: params.channel,
      delivery_status: params.status,
    })
    .eq("id", params.otpId);

  if (error) {
    throw error;
  }
}

export async function createOtpDeliveryLog(
  supabase: SupabaseClient,
  params: {
    otpId: string;
    phoneNumber: string;
    channel: OtpDeliveryChannel;
    status: OtpDeliveryStatus;
    provider: string;
    providerReference?: string | null;
    failureReason?: string | null;
  },
) {
  const { error } = await supabase.from("otp_delivery_logs").insert({
    otp_id: params.otpId,
    phone_number: params.phoneNumber,
    channel: params.channel,
    status: params.status,
    provider: params.provider,
    provider_reference: params.providerReference ?? null,
    failure_reason: params.failureReason ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function getLatestActiveOtpRecord(
  supabase: SupabaseClient,
  params: {
    phoneNumber: string;
    purpose: OtpPurpose;
  },
) {
  const { data, error } = await supabase
    .from("otp_store")
    .select(
      "id, phone_number, otp_hash, purpose, requested_ip, user_agent, delivery_channel, delivery_status, attempts, max_attempts, expires_at, verified_at, invalidated_at, created_at",
    )
    .eq("phone_number", params.phoneNumber)
    .eq("purpose", params.purpose)
    .is("verified_at", null)
    .is("invalidated_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<OtpStoreRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function incrementOtpAttempts(
  supabase: SupabaseClient,
  otpId: string,
) {
  const { error } = await supabase.rpc("increment_otp_attempts", {
    p_otp_id: otpId,
  });

  if (error) {
    const { data: existing, error: readError } = await supabase
      .from("otp_store")
      .select("attempts")
      .eq("id", otpId)
      .single<{ attempts: number }>();

    if (readError || !existing) {
      throw readError ?? error;
    }

    const { error: updateError } = await supabase
      .from("otp_store")
      .update({
        attempts: existing.attempts + 1,
      })
      .eq("id", otpId);

    if (updateError) {
      throw updateError;
    }
  }
}

export async function markOtpVerified(supabase: SupabaseClient, otpId: string) {
  const { error } = await supabase
    .from("otp_store")
    .update({
      verified_at: new Date().toISOString(),
    })
    .eq("id", otpId)
    .is("verified_at", null);

  if (error) {
    throw error;
  }
}

export async function invalidateOtpById(
  supabase: SupabaseClient,
  otpId: string,
) {
  const { error } = await supabase
    .from("otp_store")
    .update({
      invalidated_at: new Date().toISOString(),
    })
    .eq("id", otpId);

  if (error) {
    throw error;
  }
}
