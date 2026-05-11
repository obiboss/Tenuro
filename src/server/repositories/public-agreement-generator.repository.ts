import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicGeneratedAgreementRow = {
  id: string;
  lead_id: string | null;
  owner_profile_id: string | null;
  existing_property_id: string | null;
  existing_tenant_id: string | null;
  existing_tenancy_id: string | null;
  existing_agreement_id: string | null;
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
  tenancy_start_date: string;
  tenancy_end_date: string;
  tenancy_duration_months: number;
  agreement_title: string;
  agreement_snapshot: Record<string, unknown>;
  pdf_path: string | null;
  watermark_status: "watermarked" | "removed";
  document_status: "generated" | "claimed" | "stored" | "archived";
  whatsapp_message: string | null;
  download_token_hash: string | null;
  download_token_expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
};

const PUBLIC_GENERATED_AGREEMENT_SELECT = [
  "id",
  "lead_id",
  "owner_profile_id",
  "existing_property_id",
  "existing_tenant_id",
  "existing_tenancy_id",
  "existing_agreement_id",
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
  "tenancy_start_date",
  "tenancy_end_date",
  "tenancy_duration_months",
  "agreement_title",
  "agreement_snapshot",
  "pdf_path",
  "watermark_status",
  "document_status",
  "whatsapp_message",
  "download_token_hash",
  "download_token_expires_at",
  "metadata",
  "created_at",
  "updated_at",
  "claimed_at",
].join(", ");

export async function createPublicGeneratedAgreement(
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
    tenancyStartDate: string;
    tenancyEndDate: string;
    tenancyDurationMonths: number;
    agreementTitle: string;
    agreementSnapshot: Record<string, unknown>;
    downloadTokenHash: string;
    downloadTokenExpiresAt: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("public_generated_agreements")
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
      tenancy_start_date: params.tenancyStartDate,
      tenancy_end_date: params.tenancyEndDate,
      tenancy_duration_months: params.tenancyDurationMonths,
      agreement_title: params.agreementTitle,
      agreement_snapshot: params.agreementSnapshot,
      watermark_status: "watermarked",
      document_status: "generated",
      download_token_hash: params.downloadTokenHash,
      download_token_expires_at: params.downloadTokenExpiresAt,
      metadata: params.metadata ?? {},
    })
    .select(PUBLIC_GENERATED_AGREEMENT_SELECT)
    .single<PublicGeneratedAgreementRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPublicGeneratedAgreementById(
  supabase: SupabaseClient,
  agreementId: string,
) {
  const { data, error } = await supabase
    .from("public_generated_agreements")
    .select(PUBLIC_GENERATED_AGREEMENT_SELECT)
    .eq("id", agreementId)
    .single<PublicGeneratedAgreementRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePublicGeneratedAgreementWhatsappMessage(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    whatsappMessage: string;
  },
) {
  const { data, error } = await supabase
    .from("public_generated_agreements")
    .update({
      whatsapp_message: params.whatsappMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .select(PUBLIC_GENERATED_AGREEMENT_SELECT)
    .single<PublicGeneratedAgreementRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAgreementUsageEvent(
  supabase: SupabaseClient,
  params: {
    leadId: string | null;
    agreementId: string;
    profileId?: string | null;
    eventType:
      | "agreement_generated"
      | "agreement_previewed"
      | "agreement_downloaded"
      | "agreement_whatsapp_shared"
      | "signup_prompt_viewed"
      | "signup_started"
      | "signup_completed"
      | "agreement_attached_to_account";
    sourcePath: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("agreement_usage_events").insert({
    lead_id: params.leadId,
    agreement_id: params.agreementId,
    profile_id: params.profileId ?? null,
    event_type: params.eventType,
    source_path: params.sourcePath,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}
