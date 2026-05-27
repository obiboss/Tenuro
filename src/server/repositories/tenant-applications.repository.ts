import type { SupabaseClient } from "@supabase/supabase-js";

export type TenantKycProfileStatus =
  | "draft"
  | "completed"
  | "needs_update"
  | "expired"
  | "archived";

export type PropertyApplicationStatus =
  | "draft"
  | "kyc_completed"
  | "fee_pending"
  | "submitted_for_landlord_review"
  | "accepted"
  | "rejected_by_landlord"
  | "property_unavailable"
  | "rejected_by_tenant_after_inspection"
  | "waitlisted"
  | "cancelled";

export type ProcessingFeeAccessStatus = "active" | "expired" | "revoked";

export type TenantKycProfileRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  occupation: string | null;
  employer: string | null;
  id_type: string | null;
  id_document_path: string | null;
  passport_photo_path: string | null;
  kyc_answers: Record<string, unknown>;
  kyc_review_flags: Record<string, unknown>[];
  status: TenantKycProfileStatus;
  completed_at: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TenantProcessingFeeAccessRow = {
  id: string;
  tenant_kyc_profile_id: string;
  agent_id: string | null;
  landlord_id: string | null;
  landlord_phone_number: string | null;
  acquisition_context_key: string;
  source_intent_table: string;
  source_intent_id: string | null;
  amount_paid: number;
  currency_code: string;
  paid_at: string;
  valid_until: string;
  status: ProcessingFeeAccessStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PropertyApplicationRow = {
  id: string;
  tenant_kyc_profile_id: string;
  agent_property_listing_id: string;
  agent_id: string;
  landlord_id: string | null;
  landlord_phone_number: string | null;
  acquisition_context_key: string;
  processing_fee_access_id: string | null;
  status: PropertyApplicationStatus;
  inspection_status: string;
  landlord_decision_reason: string | null;
  tenant_decision_reason: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TenantKycProfileInput = {
  profileId?: string | null;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  dateOfBirth?: string | null;
  homeAddress?: string | null;
  occupation?: string | null;
  employer?: string | null;
  idType?: string | null;
  idDocumentPath?: string | null;
  passportPhotoPath?: string | null;
  kycAnswers?: Record<string, unknown>;
  kycReviewFlags?: Record<string, unknown>[];
};

const TENANT_KYC_PROFILE_SELECT = `
  id,
  profile_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  employer,
  id_type,
  id_document_path,
  passport_photo_path,
  kyc_answers,
  kyc_review_flags,
  status,
  completed_at,
  last_verified_at,
  created_at,
  updated_at,
  deleted_at
`;

const PROCESSING_FEE_ACCESS_SELECT = `
  id,
  tenant_kyc_profile_id,
  agent_id,
  landlord_id,
  landlord_phone_number,
  acquisition_context_key,
  source_intent_table,
  source_intent_id,
  amount_paid,
  currency_code,
  paid_at,
  valid_until,
  status,
  metadata,
  created_at,
  updated_at
`;

const PROPERTY_APPLICATION_SELECT = `
  id,
  tenant_kyc_profile_id,
  agent_property_listing_id,
  agent_id,
  landlord_id,
  landlord_phone_number,
  acquisition_context_key,
  processing_fee_access_id,
  status,
  inspection_status,
  landlord_decision_reason,
  tenant_decision_reason,
  submitted_at,
  decided_at,
  decided_by,
  metadata,
  created_at,
  updated_at,
  deleted_at
`;

function normaliseOptionalText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export async function getTenantKycProfileByPhoneNumber(
  supabase: SupabaseClient,
  phoneNumber: string,
) {
  const { data, error } = await supabase
    .from("tenant_kyc_profiles")
    .select(TENANT_KYC_PROFILE_SELECT)
    .eq("phone_number", phoneNumber)
    .is("deleted_at", null)
    .maybeSingle<TenantKycProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenantKycProfileById(
  supabase: SupabaseClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .from("tenant_kyc_profiles")
    .select(TENANT_KYC_PROFILE_SELECT)
    .eq("id", profileId)
    .is("deleted_at", null)
    .single<TenantKycProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTenantKycProfile(
  supabase: SupabaseClient,
  input: TenantKycProfileInput,
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenant_kyc_profiles")
    .insert({
      profile_id: input.profileId ?? null,
      full_name: input.fullName.trim(),
      phone_number: input.phoneNumber,
      email: normaliseOptionalText(input.email)?.toLowerCase() ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      home_address: normaliseOptionalText(input.homeAddress),
      occupation: normaliseOptionalText(input.occupation),
      employer: normaliseOptionalText(input.employer),
      id_type: normaliseOptionalText(input.idType),
      id_document_path: normaliseOptionalText(input.idDocumentPath),
      passport_photo_path: normaliseOptionalText(input.passportPhotoPath),
      kyc_answers: input.kycAnswers ?? {},
      kyc_review_flags: input.kycReviewFlags ?? [],
      status: "completed",
      completed_at: now,
      last_verified_at: now,
      updated_at: now,
    })
    .select(TENANT_KYC_PROFILE_SELECT)
    .single<TenantKycProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenantKycProfile(
  supabase: SupabaseClient,
  profileId: string,
  input: TenantKycProfileInput,
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("tenant_kyc_profiles")
    .update({
      profile_id: input.profileId ?? null,
      full_name: input.fullName.trim(),
      email: normaliseOptionalText(input.email)?.toLowerCase() ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      home_address: normaliseOptionalText(input.homeAddress),
      occupation: normaliseOptionalText(input.occupation),
      employer: normaliseOptionalText(input.employer),
      id_type: normaliseOptionalText(input.idType),
      id_document_path: normaliseOptionalText(input.idDocumentPath),
      passport_photo_path: normaliseOptionalText(input.passportPhotoPath),
      kyc_answers: input.kycAnswers ?? {},
      kyc_review_flags: input.kycReviewFlags ?? [],
      status: "completed",
      completed_at: now,
      last_verified_at: now,
      updated_at: now,
    })
    .eq("id", profileId)
    .is("deleted_at", null)
    .select(TENANT_KYC_PROFILE_SELECT)
    .single<TenantKycProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveProcessingFeeAccess(
  supabase: SupabaseClient,
  params: {
    tenantKycProfileId: string;
    acquisitionContextKey: string;
    nowIso: string;
  },
) {
  const { data, error } = await supabase
    .from("tenant_processing_fee_access")
    .select(PROCESSING_FEE_ACCESS_SELECT)
    .eq("tenant_kyc_profile_id", params.tenantKycProfileId)
    .eq("acquisition_context_key", params.acquisitionContextKey)
    .eq("status", "active")
    .gt("valid_until", params.nowIso)
    .order("valid_until", { ascending: false })
    .limit(1)
    .maybeSingle<TenantProcessingFeeAccessRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createProcessingFeeAccess(
  supabase: SupabaseClient,
  params: {
    tenantKycProfileId: string;
    agentId: string | null;
    landlordId: string | null;
    landlordPhoneNumber: string | null;
    acquisitionContextKey: string;
    sourceIntentTable: string;
    sourceIntentId: string | null;
    amountPaid: number;
    currencyCode: string;
    paidAt: string;
    validUntil: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("tenant_processing_fee_access")
    .insert({
      tenant_kyc_profile_id: params.tenantKycProfileId,
      agent_id: params.agentId,
      landlord_id: params.landlordId,
      landlord_phone_number: params.landlordPhoneNumber,
      acquisition_context_key: params.acquisitionContextKey,
      source_intent_table: params.sourceIntentTable,
      source_intent_id: params.sourceIntentId,
      amount_paid: params.amountPaid,
      currency_code: params.currencyCode,
      paid_at: params.paidAt,
      valid_until: params.validUntil,
      status: "active",
      metadata: params.metadata ?? {},
    })
    .select(PROCESSING_FEE_ACCESS_SELECT)
    .single<TenantProcessingFeeAccessRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActivePropertyApplicationForListing(
  supabase: SupabaseClient,
  params: {
    tenantKycProfileId: string;
    agentPropertyListingId: string;
  },
) {
  const { data, error } = await supabase
    .from("property_applications")
    .select(PROPERTY_APPLICATION_SELECT)
    .eq("tenant_kyc_profile_id", params.tenantKycProfileId)
    .eq("agent_property_listing_id", params.agentPropertyListingId)
    .is("deleted_at", null)
    .not(
      "status",
      "in",
      "(rejected_by_landlord,property_unavailable,rejected_by_tenant_after_inspection,cancelled)",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<PropertyApplicationRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createPropertyApplication(
  supabase: SupabaseClient,
  params: {
    tenantKycProfileId: string;
    agentPropertyListingId: string;
    agentId: string;
    landlordId: string | null;
    landlordPhoneNumber: string | null;
    acquisitionContextKey: string;
    processingFeeAccessId: string | null;
    status: PropertyApplicationStatus;
    metadata?: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("property_applications")
    .insert({
      tenant_kyc_profile_id: params.tenantKycProfileId,
      agent_property_listing_id: params.agentPropertyListingId,
      agent_id: params.agentId,
      landlord_id: params.landlordId,
      landlord_phone_number: params.landlordPhoneNumber,
      acquisition_context_key: params.acquisitionContextKey,
      processing_fee_access_id: params.processingFeeAccessId,
      status: params.status,
      submitted_at:
        params.status === "submitted_for_landlord_review" ? now : null,
      metadata: params.metadata ?? {},
    })
    .select(PROPERTY_APPLICATION_SELECT)
    .single<PropertyApplicationRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePropertyApplicationStatus(
  supabase: SupabaseClient,
  params: {
    applicationId: string;
    status: PropertyApplicationStatus;
    processingFeeAccessId?: string | null;
    reason?: string | null;
    decidedBy?: string | null;
  },
) {
  const now = new Date().toISOString();

  const terminalStatuses: PropertyApplicationStatus[] = [
    "accepted",
    "rejected_by_landlord",
    "property_unavailable",
    "rejected_by_tenant_after_inspection",
    "waitlisted",
    "cancelled",
  ];

  const { data, error } = await supabase
    .from("property_applications")
    .update({
      status: params.status,
      processing_fee_access_id: params.processingFeeAccessId,
      landlord_decision_reason: params.reason ?? null,
      submitted_at:
        params.status === "submitted_for_landlord_review" ? now : undefined,
      decided_at: terminalStatuses.includes(params.status) ? now : null,
      decided_by: terminalStatuses.includes(params.status)
        ? (params.decidedBy ?? null)
        : null,
      updated_at: now,
    })
    .eq("id", params.applicationId)
    .is("deleted_at", null)
    .select(PROPERTY_APPLICATION_SELECT)
    .single<PropertyApplicationRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPropertyApplicationById(
  supabase: SupabaseClient,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from("property_applications")
    .select(PROPERTY_APPLICATION_SELECT)
    .eq("id", applicationId)
    .is("deleted_at", null)
    .single<PropertyApplicationRow>();

  if (error) {
    throw error;
  }

  return data;
}
