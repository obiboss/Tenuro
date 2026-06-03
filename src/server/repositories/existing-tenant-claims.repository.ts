import type { SupabaseClient } from "@supabase/supabase-js";

export type ExistingTenantClaimStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type ExistingTenantClaimRow = {
  id: string;
  landlord_id: string;
  unit_id: string;
  token_hash: string;
  token_expires_at: string;
  token_used_at: string | null;
  status: ExistingTenantClaimStatus;
  tenant_full_name: string | null;
  tenant_phone_number: string | null;
  tenant_email: string | null;
  tenant_move_in_date: string | null;
  tenant_claimed_rent_amount: number | null;
  tenant_claimed_next_rent_due_date: string | null;
  tenant_payment_frequency: "annual" | "monthly" | "quarterly" | "biannual";
  tenant_notes: string | null;
  existing_agreement_path: string | null;
  last_payment_proof_path: string | null;
  landlord_confirmed_rent_amount: number | null;
  landlord_confirmed_move_in_date: string | null;
  landlord_confirmed_next_rent_due_date: string | null;
  landlord_review_notes: string | null;
  approved_tenant_id: string | null;
  approved_tenancy_id: string | null;
  rejected_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ExistingTenantClaimDetailRow = ExistingTenantClaimRow & {
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    unit_type: string;
    annual_rent: number | null;
    monthly_rent: number | null;
    currency_code: string;
    status: string;
    properties: {
      id: string;
      property_name: string;
      address: string | null;
      landlord_id: string;
    } | null;
  } | null;
};

const EXISTING_TENANT_CLAIM_SELECT = `
  id,
  landlord_id,
  unit_id,
  token_hash,
  token_expires_at,
  token_used_at,
  status,
  tenant_full_name,
  tenant_phone_number,
  tenant_email,
  tenant_move_in_date,
  tenant_claimed_rent_amount,
  tenant_claimed_next_rent_due_date,
  tenant_payment_frequency,
  tenant_notes,
  existing_agreement_path,
  last_payment_proof_path,
  landlord_confirmed_rent_amount,
  landlord_confirmed_move_in_date,
  landlord_confirmed_next_rent_due_date,
  landlord_review_notes,
  approved_tenant_id,
  approved_tenancy_id,
  rejected_reason,
  submitted_at,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at,
  deleted_at
`;

const EXISTING_TENANT_CLAIM_DETAIL_SELECT = `
  ${EXISTING_TENANT_CLAIM_SELECT},
  units (
    id,
    unit_identifier,
    building_name,
    unit_type,
    annual_rent,
    monthly_rent,
    currency_code,
    status,
    properties (
      id,
      property_name,
      address,
      landlord_id
    )
  )
`;

export async function createExistingTenantClaim(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    unitId: string;
    tokenHash: string;
    tokenExpiresAt: string;
    note: string | null;
  },
) {
  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .insert({
      landlord_id: params.landlordId,
      unit_id: params.unitId,
      token_hash: params.tokenHash,
      token_expires_at: params.tokenExpiresAt,
      status: "pending",
      landlord_review_notes: params.note,
    })
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getExistingTenantClaimByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .eq("token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getExistingTenantClaimById(
  supabase: SupabaseClient,
  claimId: string,
) {
  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .eq("id", claimId)
    .is("deleted_at", null)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listExistingTenantClaimsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .eq("landlord_id", landlordId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<ExistingTenantClaimDetailRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitExistingTenantClaim(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    moveInDate: string;
    claimedRentAmount: number;
    claimedNextRentDueDate: string;
    paymentFrequency: "annual" | "monthly" | "quarterly" | "biannual";
    tenantNotes: string | null;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .update({
      tenant_full_name: params.fullName,
      tenant_phone_number: params.phoneNumber,
      tenant_email: params.email,
      tenant_move_in_date: params.moveInDate,
      tenant_claimed_rent_amount: params.claimedRentAmount,
      tenant_claimed_next_rent_due_date: params.claimedNextRentDueDate,
      tenant_payment_frequency: params.paymentFrequency,
      tenant_notes: params.tenantNotes,
      status: "submitted",
      token_used_at: now,
      submitted_at: now,
      updated_at: now,
      rejected_reason: null,
    })
    .eq("id", params.claimId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function rejectExistingTenantClaim(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    landlordId: string;
    reviewedBy: string;
    reason: string;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .update({
      status: "rejected",
      rejected_reason: params.reason,
      reviewed_at: now,
      reviewed_by: params.reviewedBy,
      updated_at: now,
    })
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .in("status", ["pending", "submitted"])
    .is("deleted_at", null)
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markExistingTenantClaimExpired(
  supabase: SupabaseClient,
  claimId: string,
) {
  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .update({
      status: "expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", claimId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}
