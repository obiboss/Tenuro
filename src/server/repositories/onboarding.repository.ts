import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubmitTenantOnboardingInput } from "@/server/validators/onboarding.schema";
import type { PropertyRuleDetailRow } from "@/server/repositories/property-rules.repository";
import { getActivePropertyRulesForOnboarding } from "@/server/repositories/property-rules.repository";

export type TenantOnboardingStatus =
  | "invited"
  | "documents_submitted"
  | "profile_complete"
  | "submitted_for_landlord_review"
  | "waitlisted"
  | "approved"
  | "rejected"
  | "token_expired";

export type TenantOnboardingRecord = {
  id: string;
  landlord_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: string | null;
  home_address: string | null;
  occupation: string | null;
  onboarding_status: TenantOnboardingStatus;
  onboarding_token_hash: string | null;
  onboarding_token_expires_at: string | null;
  onboarding_token_used_at: string | null;
  verification_fee_paid_at: string | null;
  verification_fee_intent_id: string | null;
  onboarding_submission_timestamp: string | null;
  agent_property_listing_id: string | null;
  invited_by_agent_id: string | null;
  created_at: string;
};

export type TenantOnboardingResolvedRecord = TenantOnboardingRecord & {
  property_rules: PropertyRuleDetailRow[];
  profiles: {
    id: string;
    full_name: string;
    phone_number: string | null;
    email: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    unit_type: string;
    bedrooms: number;
    bathrooms: number;
    monthly_rent: number | null;
    annual_rent: number | null;
    currency_code: string;
    properties: {
      id: string;
      property_name: string;
      address: string;
      state: string;
      lga: string;
      landlord_id: string;
    } | null;
  } | null;
};

export type TenantOnboardingInviteRecord = {
  id: string;
  landlord_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  onboarding_status: TenantOnboardingStatus;
  agent_property_listing_id: string | null;
  invited_by_agent_id: string | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    properties: {
      id: string;
      property_name: string;
    } | null;
  } | null;
};

const TENANT_ONBOARDING_SELECT = `
  id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  onboarding_status,
  onboarding_token_hash,
  onboarding_token_expires_at,
  onboarding_token_used_at,
  verification_fee_paid_at,
  verification_fee_intent_id,
  onboarding_submission_timestamp,
  agent_property_listing_id,
  invited_by_agent_id,
  created_at
`;

const TENANT_ONBOARDING_RESOLVED_SELECT = `
  id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  onboarding_status,
  onboarding_token_hash,
  onboarding_token_expires_at,
  onboarding_token_used_at,
  agent_property_listing_id,
  invited_by_agent_id,
  created_at,
  profiles:landlord_id (
    id,
    full_name,
    phone_number,
    email
  ),
  units (
    id,
    unit_identifier,
    building_name,
    unit_type,
    bedrooms,
    bathrooms,
    monthly_rent,
    annual_rent,
    currency_code,
    properties (
      id,
      property_name,
      address,
      state,
      lga,
      landlord_id
    )
  )
`;

const TENANT_ONBOARDING_INVITE_SELECT = `
  id,
  landlord_id,
  unit_id,
  full_name,
  phone_number,
  email,
  date_of_birth,
  home_address,
  occupation,
  onboarding_status,
  agent_property_listing_id,
  invited_by_agent_id,
  units (
    id,
    unit_identifier,
    building_name,
    properties (
      id,
      property_name
    )
  )
`;

export async function getTenantByOnboardingTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_ONBOARDING_SELECT)
    .eq("onboarding_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<TenantOnboardingRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getResolvedTenantByOnboardingTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_ONBOARDING_RESOLVED_SELECT)
    .eq("onboarding_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<Omit<TenantOnboardingResolvedRecord, "property_rules">>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const propertyId = data.units?.properties?.id ?? null;
  const propertyRules = propertyId
    ? await getActivePropertyRulesForOnboarding(supabase, {
        propertyId,
        unitId: data.unit_id,
      })
    : [];

  return {
    ...data,
    property_rules: propertyRules,
  } satisfies TenantOnboardingResolvedRecord;
}

export async function getTenantForOnboardingInvite(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    landlordId: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_ONBOARDING_INVITE_SELECT)
    .eq("id", params.tenantId)
    .eq("landlord_id", params.landlordId)
    .is("deleted_at", null)
    .single<TenantOnboardingInviteRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenantOnboardingToken(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_status: "invited",
      onboarding_token_hash: params.tokenHash,
      onboarding_token_expires_at: params.expiresAt,
      onboarding_token_used_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.tenantId)
    .is("deleted_at", null)
    .select(TENANT_ONBOARDING_SELECT)
    .single<TenantOnboardingRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveTenantOnboardingDraft(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    input: SubmitTenantOnboardingInput;
    idNumberCiphertext: string;
    kycAnswers: Record<string, unknown>;
    kycReviewFlags: Record<string, unknown>[];
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      full_name: params.input.fullName,
      phone_number: params.input.phoneNumber,
      email: params.input.email?.trim() ? params.input.email.trim() : null,
      date_of_birth: params.input.dateOfBirth.toISOString().slice(0, 10),
      home_address: params.input.homeAddress,
      occupation: params.input.occupation,
      employer: params.input.employer?.trim()
        ? params.input.employer.trim()
        : null,
      id_type: params.input.idType,
      id_number_ciphertext: params.idNumberCiphertext,
      id_document_path: params.input.idDocumentPath,
      passport_photo_path: params.input.passportPhotoPath,
      kyc_answers: params.kycAnswers,
      kyc_review_flags: params.kycReviewFlags,
      onboarding_status: "documents_submitted",
      rejected_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.tenantId)
    .in("onboarding_status", ["invited", "documents_submitted"])
    .is("deleted_at", null)
    .select(TENANT_ONBOARDING_SELECT)
    .single<TenantOnboardingRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitTenantOnboardingProfile(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    input: SubmitTenantOnboardingInput;
    idNumberCiphertext: string;
    kycAnswers: Record<string, unknown>;
    kycReviewFlags: Record<string, unknown>[];
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      full_name: params.input.fullName,
      phone_number: params.input.phoneNumber,
      email: params.input.email?.trim() ? params.input.email.trim() : null,
      date_of_birth: params.input.dateOfBirth.toISOString().slice(0, 10),
      home_address: params.input.homeAddress,
      occupation: params.input.occupation,
      employer: params.input.employer?.trim()
        ? params.input.employer.trim()
        : null,
      id_type: params.input.idType,
      id_number_ciphertext: params.idNumberCiphertext,
      id_document_path: params.input.idDocumentPath,
      passport_photo_path: params.input.passportPhotoPath,
      kyc_answers: params.kycAnswers,
      kyc_review_flags: params.kycReviewFlags,
      onboarding_status: "submitted_for_landlord_review",
      onboarding_token_used_at: new Date().toISOString(),
      onboarding_submission_timestamp: new Date().toISOString(),
      rejected_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.tenantId)
    .in("onboarding_status", ["invited", "profile_complete"])
    .is("deleted_at", null)
    .select(TENANT_ONBOARDING_SELECT)
    .single<TenantOnboardingRecord>();

  if (error) {
    throw error;
  }

  return data;
}

export async function officiallySubmitTenantOnboardingAfterPayment(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    verificationFeeIntentId: string;
    verificationFeePaidAt: string;
    verificationFeeSource: "agent" | "landlord";
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_status: "submitted_for_landlord_review",
      onboarding_token_used_at: new Date().toISOString(),
      onboarding_submission_timestamp: new Date().toISOString(),
      verification_fee_paid_at: params.verificationFeePaidAt,
      verification_fee_intent_id: params.verificationFeeIntentId,
      verification_fee_source: params.verificationFeeSource,
      rejected_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.tenantId)
    .eq("onboarding_status", "documents_submitted")
    .is("deleted_at", null)
    .select(TENANT_ONBOARDING_SELECT)
    .maybeSingle<TenantOnboardingRecord>();

  if (error) {
    throw error;
  }

  if (data) {
    return { tenant: data, alreadySubmitted: false as const };
  }

  const { data: existingTenant, error: existingError } = await supabase
    .from("tenants")
    .select(TENANT_ONBOARDING_SELECT)
    .eq("id", params.tenantId)
    .is("deleted_at", null)
    .single<TenantOnboardingRecord>();

  if (existingError) {
    throw existingError;
  }

  if (
    existingTenant.onboarding_status === "submitted_for_landlord_review" ||
    existingTenant.onboarding_status === "profile_complete"
  ) {
    return { tenant: existingTenant, alreadySubmitted: true as const };
  }

  throw new Error(
    "Tenant onboarding cannot be officially submitted in the current status.",
  );
}

/** @deprecated Use officiallySubmitTenantOnboardingAfterPayment */
export async function officiallySubmitAgentTenantOnboarding(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    verificationFeeIntentId: string;
    verificationFeePaidAt: string;
  },
) {
  return officiallySubmitTenantOnboardingAfterPayment(supabase, {
    ...params,
    verificationFeeSource: "agent",
  });
}
