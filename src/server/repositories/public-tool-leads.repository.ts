import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicToolLeadRow = {
  id: string;
  owner_profile_id: string | null;
  landlord_full_name: string;
  landlord_phone_number: string;
  landlord_email: string | null;
  source_tool: "receipt" | "agreement";
  source_path: string;
  source_location: string | null;
  signup_status: "anonymous" | "account_created" | "attached" | "discarded";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
};

export type PublicGeneratedReceiptRow = {
  id: string;
  lead_id: string | null;
  owner_profile_id: string | null;
  existing_property_id: string | null;
  existing_tenant_id: string | null;
  existing_payment_id: string | null;
  landlord_full_name: string;
  landlord_phone_number: string;
  landlord_email: string | null;
  tenant_full_name: string;
  tenant_phone_number: string;
  property_name: string | null;
  property_address: string;
  unit_identifier: string | null;
  city_state: string;
  rent_amount: number;
  currency_code: string;
  payment_date: string;
  rent_period_start: string;
  rent_period_end: string;
  rent_duration_months: number;
  payment_method: "bank_transfer" | "cash" | "paystack_gateway" | "other";
  payment_reference: string | null;
  receipt_number: string;
  receipt_snapshot: Record<string, unknown>;
  pdf_path: string | null;
  watermark_status: "watermarked" | "removed";
  document_status: "generated" | "claimed" | "stored" | "archived";
  whatsapp_message: string | null;
  download_token_hash: string | null;
  download_token_expires_at: string | null;
  claim_token_hash: string | null;
  claim_token_expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
};

const PUBLIC_TOOL_LEAD_SELECT = [
  "id",
  "owner_profile_id",
  "landlord_full_name",
  "landlord_phone_number",
  "landlord_email",
  "source_tool",
  "source_path",
  "source_location",
  "signup_status",
  "metadata",
  "created_at",
  "updated_at",
  "claimed_at",
].join(", ");

const publicGeneratedReceiptSelect = [
  "id",
  "lead_id",
  "owner_profile_id",
  "existing_property_id",
  "existing_tenant_id",
  "existing_payment_id",
  "landlord_full_name",
  "landlord_phone_number",
  "landlord_email",
  "tenant_full_name",
  "tenant_phone_number",
  "property_name",
  "property_address",
  "unit_identifier",
  "city_state",
  "rent_amount",
  "currency_code",
  "payment_date",
  "rent_period_start",
  "rent_period_end",
  "rent_duration_months",
  "payment_method",
  "payment_reference",
  "receipt_number",
  "receipt_snapshot",
  "pdf_path",
  "watermark_status",
  "document_status",
  "whatsapp_message",
  "download_token_hash",
  "download_token_expires_at",
  "claim_token_hash",
  "claim_token_expires_at",
  "metadata",
  "created_at",
  "updated_at",
  "claimed_at",
].join(", ");

export async function createPublicToolLead(
  supabase: SupabaseClient,
  params: {
    landlordFullName: string;
    landlordPhoneNumber: string;
    landlordEmail: string | null;
    sourceTool: "receipt" | "agreement";
    sourcePath: string;
    sourceLocation: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("public_tool_leads")
    .insert({
      landlord_full_name: params.landlordFullName,
      landlord_phone_number: params.landlordPhoneNumber,
      landlord_email: params.landlordEmail,
      source_tool: params.sourceTool,
      source_path: params.sourcePath,
      source_location: params.sourceLocation,
      signup_status: "anonymous",
      metadata: params.metadata ?? {},
    })
    .select(PUBLIC_TOOL_LEAD_SELECT)
    .single<PublicToolLeadRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createPublicGeneratedReceipt(
  supabase: SupabaseClient,
  params: {
    leadId: string;
    landlordFullName: string;
    landlordPhoneNumber: string;
    landlordEmail: string | null;
    tenantFullName: string;
    tenantPhoneNumber: string;
    propertyName: string | null;
    propertyAddress: string;
    unitIdentifier: string | null;
    cityState: string;
    rentAmount: number;
    paymentDate: string;
    rentPeriodStart: string;
    rentPeriodEnd: string;
    rentDurationMonths: number;
    paymentMethod: "bank_transfer" | "cash" | "paystack_gateway" | "other";
    receiptNumber: string;
    receiptSnapshot: Record<string, unknown>;
    whatsappMessage: string;
    downloadTokenHash: string;
    downloadTokenExpiresAt: string;
    claimTokenHash: string;
    claimTokenExpiresAt: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("public_generated_receipts")
    .insert({
      lead_id: params.leadId,
      landlord_full_name: params.landlordFullName,
      landlord_phone_number: params.landlordPhoneNumber,
      landlord_email: params.landlordEmail,
      tenant_full_name: params.tenantFullName,
      tenant_phone_number: params.tenantPhoneNumber,
      property_name: params.propertyName,
      property_address: params.propertyAddress,
      unit_identifier: params.unitIdentifier,
      city_state: params.cityState,
      rent_amount: params.rentAmount,
      currency_code: "NGN",
      payment_date: params.paymentDate,
      rent_period_start: params.rentPeriodStart,
      rent_period_end: params.rentPeriodEnd,
      rent_duration_months: params.rentDurationMonths,
      payment_method: params.paymentMethod,
      receipt_number: params.receiptNumber,
      receipt_snapshot: params.receiptSnapshot,
      watermark_status: "watermarked",
      document_status: "generated",
      whatsapp_message: params.whatsappMessage,
      download_token_hash: params.downloadTokenHash,
      download_token_expires_at: params.downloadTokenExpiresAt,
      claim_token_hash: params.claimTokenHash,
      claim_token_expires_at: params.claimTokenExpiresAt,
      metadata: params.metadata ?? {},
    })
    .select(publicGeneratedReceiptSelect)
    .single<PublicGeneratedReceiptRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicGeneratedReceiptById(
  supabase: SupabaseClient,
  receiptId: string,
) {
  const { data, error } = await supabase
    .from("public_generated_receipts")
    .select(publicGeneratedReceiptSelect)
    .eq("id", receiptId)
    .single<PublicGeneratedReceiptRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePublicGeneratedReceiptWhatsappMessage(
  supabase: SupabaseClient,
  params: {
    receiptId: string;
    whatsappMessage: string;
  },
) {
  const { data, error } = await supabase
    .from("public_generated_receipts")
    .update({
      whatsapp_message: params.whatsappMessage,
    })
    .eq("id", params.receiptId)
    .select(publicGeneratedReceiptSelect)
    .single<PublicGeneratedReceiptRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markPublicGeneratedReceiptClaimed(
  supabase: SupabaseClient,
  params: {
    receiptId: string;
    ownerProfileId: string;
    propertyId: string | null;
    tenantId: string | null;
  },
) {
  const { data, error } = await supabase
    .from("public_generated_receipts")
    .update({
      owner_profile_id: params.ownerProfileId,
      existing_property_id: params.propertyId,
      existing_tenant_id: params.tenantId,
      document_status: "claimed",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", params.receiptId)
    .is("owner_profile_id", null)
    .select(publicGeneratedReceiptSelect)
    .single<PublicGeneratedReceiptRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markPublicToolLeadAttached(
  supabase: SupabaseClient,
  params: {
    leadId: string;
    ownerProfileId: string;
  },
) {
  const { data, error } = await supabase
    .from("public_tool_leads")
    .update({
      owner_profile_id: params.ownerProfileId,
      signup_status: "attached",
      claimed_at: new Date().toISOString(),
    })
    .eq("id", params.leadId)
    .select(PUBLIC_TOOL_LEAD_SELECT)
    .single<PublicToolLeadRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createReceiptUsageEvent(
  supabase: SupabaseClient,
  params: {
    leadId: string | null;
    receiptId: string;
    profileId?: string | null;
    eventType:
      | "receipt_generated"
      | "receipt_downloaded"
      | "receipt_whatsapp_shared"
      | "signup_prompt_viewed"
      | "signup_started"
      | "signup_completed"
      | "receipt_attached_to_account";
    sourcePath: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("receipt_usage_events").insert({
    lead_id: params.leadId,
    receipt_id: params.receiptId,
    profile_id: params.profileId ?? null,
    event_type: params.eventType,
    source_path: params.sourcePath,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}
