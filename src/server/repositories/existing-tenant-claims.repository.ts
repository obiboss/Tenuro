import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExistingTenantPaymentHistoryItem } from "@/server/validators/existing-tenant-claim.schema";

export type ExistingTenantClaimStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type ExistingTenantClaimIdType =
  | "nin"
  | "passport"
  | "drivers_license"
  | "voters_card";

export type ExistingTenantClaimPaymentFrequency =
  | "annual"
  | "monthly"
  | "quarterly"
  | "biannual";

export type ExistingTenantClaimRow = {
  id: string;
  landlord_id: string;
  unit_id: string;
  token_hash: string;
  token_expires_at: string;
  token_used_at: string | null;
  status: ExistingTenantClaimStatus;

  invited_tenant_full_name: string | null;
  invited_tenant_phone_number: string | null;
  invited_tenant_email: string | null;

  tenant_full_name: string | null;
  tenant_phone_number: string | null;
  tenant_email: string | null;
  tenant_occupation: string | null;
  tenant_id_type: ExistingTenantClaimIdType | null;
  tenant_id_number: string | null;
  tenant_move_in_date: string | null;
  tenant_claimed_rent_amount: number | null;
  tenant_claimed_next_rent_due_date: string | null;
  tenant_payment_frequency: ExistingTenantClaimPaymentFrequency;
  tenant_notes: string | null;
  existing_agreement_path: string | null;
  last_payment_proof_path: string | null;

  landlord_confirmed_rent_amount: number | null;
  landlord_confirmed_move_in_date: string | null;
  landlord_confirmed_next_rent_due_date: string | null;
  landlord_confirmed_current_due_date: string | null;
  landlord_review_notes: string | null;
  landlord_last_payment_amount: number | null;
  landlord_last_payment_date: string | null;
  landlord_payment_history: ExistingTenantPaymentHistoryItem[];

  bopa_calculated_current_due_date: string | null;
  bopa_calculated_outstanding_balance: number | null;
  bopa_calculated_months_owed: number;
  arrears_calculation_metadata: Record<string, unknown>;

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
  invited_tenant_full_name,
  invited_tenant_phone_number,
  invited_tenant_email,
  tenant_full_name,
  tenant_phone_number,
  tenant_email,
  tenant_occupation,
  tenant_id_type,
  tenant_id_number,
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
  landlord_confirmed_current_due_date,
  landlord_review_notes,
  landlord_last_payment_amount,
  landlord_last_payment_date,
  landlord_payment_history,
  bopa_calculated_current_due_date,
  bopa_calculated_outstanding_balance,
  bopa_calculated_months_owed,
  arrears_calculation_metadata,
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
    invitedTenantFullName: string;
    invitedTenantPhoneNumber: string;
    invitedTenantEmail: string | null;
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
      invited_tenant_full_name: params.invitedTenantFullName,
      invited_tenant_phone_number: params.invitedTenantPhoneNumber,
      invited_tenant_email: params.invitedTenantEmail,
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
    occupation: string;
    idType: ExistingTenantClaimIdType;
    idNumber: string;
    moveInDate: string;
    claimedRentAmount: number;
    paymentFrequency: ExistingTenantClaimPaymentFrequency;
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
      tenant_occupation: params.occupation,
      tenant_id_type: params.idType,
      tenant_id_number: params.idNumber,
      tenant_move_in_date: params.moveInDate,
      tenant_claimed_rent_amount: params.claimedRentAmount,
      tenant_claimed_next_rent_due_date: null,
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

export async function updateExistingTenantClaimArrears(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    landlordId: string;
    paymentHistory: ExistingTenantPaymentHistoryItem[];
    calculatedCurrentDueDate: string;
    calculatedOutstandingBalance: number;
    calculatedMonthsOwed: number;
    calculationMetadata: Record<string, unknown>;
  },
) {
  const latestPayment = params.paymentHistory
    .slice()
    .sort((firstPayment, secondPayment) =>
      firstPayment.paidAt.localeCompare(secondPayment.paidAt),
    )
    .at(-1);

  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .update({
      landlord_last_payment_amount: latestPayment?.amount ?? null,
      landlord_last_payment_date: latestPayment?.paidAt ?? null,
      landlord_payment_history: params.paymentHistory,
      bopa_calculated_current_due_date: params.calculatedCurrentDueDate,
      bopa_calculated_outstanding_balance: params.calculatedOutstandingBalance,
      bopa_calculated_months_owed: params.calculatedMonthsOwed,
      arrears_calculation_metadata: params.calculationMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "submitted")
    .is("deleted_at", null)
    .select(EXISTING_TENANT_CLAIM_DETAIL_SELECT)
    .single<ExistingTenantClaimDetailRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function approveExistingTenantClaim(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    landlordId: string;
    reviewedBy: string;
    confirmedRentAmount: number;
    confirmedMoveInDate: string;
    confirmedCurrentDueDate: string;
    confirmedNextRentDueDate: string;
    openingBalance: number;
    reviewNotes: string | null;
    approvedTenantId: string;
    approvedTenancyId: string;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("existing_tenant_claims")
    .update({
      status: "approved",
      landlord_confirmed_rent_amount: params.confirmedRentAmount,
      landlord_confirmed_move_in_date: params.confirmedMoveInDate,
      landlord_confirmed_current_due_date: params.confirmedCurrentDueDate,
      landlord_confirmed_next_rent_due_date: params.confirmedNextRentDueDate,
      landlord_review_notes: params.reviewNotes,
      bopa_calculated_outstanding_balance: params.openingBalance,
      approved_tenant_id: params.approvedTenantId,
      approved_tenancy_id: params.approvedTenancyId,
      reviewed_at: now,
      reviewed_by: params.reviewedBy,
      updated_at: now,
    })
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "submitted")
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
