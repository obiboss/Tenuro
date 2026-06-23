import type { SupabaseClient } from "@supabase/supabase-js";

export type CaretakerPaymentClaimSource = "tenant_proof" | "caretaker_report";

export type CaretakerPaymentClaimStatus =
  | "draft"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "expired";

export type CaretakerPaymentMethod = "bank_transfer" | "cash" | "other";

export type CaretakerPaymentClaimRow = {
  id: string;
  landlord_id: string;
  caretaker_profile_id: string | null;
  tenancy_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  claim_source: CaretakerPaymentClaimSource;
  status: CaretakerPaymentClaimStatus;
  amount_paid: number | null;
  payment_date: string | null;
  payment_method: CaretakerPaymentMethod | null;
  payment_reference: string | null;
  proof_path: string | null;
  proof_original_filename: string | null;
  notes: string | null;
  token_hash: string | null;
  token_expires_at: string | null;
  requested_by_profile_id: string | null;
  requested_at: string | null;
  submitted_at: string | null;
  confirmed_by_profile_id: string | null;
  confirmed_at: string | null;
  confirmed_payment_id: string | null;
  rejected_by_profile_id: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
  tenancies: {
    id: string;
    tenancy_reference: string | null;
    units: {
      id: string;
      unit_identifier: string;
      properties: {
        id: string;
        property_name: string;
      } | null;
    } | null;
  } | null;
  landlord: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
  caretaker: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
};

export type CaretakerPaymentClaimContextRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  tenancy_status: string;
  agreement_live_at: string | null;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    properties: {
      id: string;
      property_name: string;
    } | null;
  } | null;
};

const CARETAKER_PAYMENT_CLAIM_SELECT = `
  id,
  landlord_id,
  caretaker_profile_id,
  tenancy_id,
  tenant_id,
  property_id,
  unit_id,
  claim_source,
  status,
  amount_paid,
  payment_date,
  payment_method,
  payment_reference,
  proof_path,
  proof_original_filename,
  notes,
  token_hash,
  token_expires_at,
  requested_by_profile_id,
  requested_at,
  submitted_at,
  confirmed_by_profile_id,
  confirmed_at,
  confirmed_payment_id,
  rejected_by_profile_id,
  rejected_at,
  rejection_reason,
  created_at,
  updated_at,
  tenants (
    id,
    full_name,
    phone_number
  ),
  tenancies (
    id,
    tenancy_reference,
    units (
      id,
      unit_identifier,
      properties (
        id,
        property_name
      )
    )
  ),
  landlord:profiles!caretaker_payment_claims_landlord_id_fkey (
    id,
    full_name,
    phone_number
  ),
  caretaker:profiles!caretaker_payment_claims_caretaker_profile_id_fkey (
    id,
    full_name,
    phone_number
  )
`;

const TENANCY_PAYMENT_CLAIM_CONTEXT_SELECT = `
  id,
  landlord_id,
  tenant_id,
  unit_id,
  rent_amount,
  tenancy_status,
  agreement_live_at,
  tenants (
    id,
    full_name,
    phone_number
  ),
  units (
    id,
    unit_identifier,
    properties (
      id,
      property_name
    )
  )
`;

export async function getCaretakerPaymentClaimContext(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("tenancies")
    .select(TENANCY_PAYMENT_CLAIM_CONTEXT_SELECT)
    .eq("id", tenancyId)
    .single<CaretakerPaymentClaimContextRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createCaretakerPaymentClaim(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    caretakerProfileId: string | null;
    tenancyId: string;
    tenantId: string;
    propertyId: string;
    unitId: string;
    claimSource: CaretakerPaymentClaimSource;
    status: CaretakerPaymentClaimStatus;
    amountPaid?: number | null;
    paymentDate?: string | null;
    paymentMethod?: CaretakerPaymentMethod | null;
    paymentReference?: string | null;
    proofPath?: string | null;
    proofOriginalFilename?: string | null;
    notes?: string | null;
    tokenHash?: string | null;
    tokenExpiresAt?: string | null;
    requestedByProfileId?: string | null;
    requestedAt?: string | null;
    submittedAt?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .insert({
      landlord_id: params.landlordId,
      caretaker_profile_id: params.caretakerProfileId,
      tenancy_id: params.tenancyId,
      tenant_id: params.tenantId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      claim_source: params.claimSource,
      status: params.status,
      amount_paid: params.amountPaid ?? null,
      payment_date: params.paymentDate ?? null,
      payment_method: params.paymentMethod ?? null,
      payment_reference: params.paymentReference ?? null,
      proof_path: params.proofPath ?? null,
      proof_original_filename: params.proofOriginalFilename ?? null,
      notes: params.notes ?? null,
      token_hash: params.tokenHash ?? null,
      token_expires_at: params.tokenExpiresAt ?? null,
      requested_by_profile_id: params.requestedByProfileId ?? null,
      requested_at: params.requestedAt ?? null,
      submitted_at: params.submittedAt ?? null,
    })
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .single<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCaretakerPaymentClaimByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitTenantPaymentProofClaim(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    amountPaid: number;
    paymentDate: string;
    paymentMethod: CaretakerPaymentMethod;
    paymentReference?: string | null;
    proofPath?: string | null;
    proofOriginalFilename?: string | null;
    notes?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .update({
      status: "submitted",
      amount_paid: params.amountPaid,
      payment_date: params.paymentDate,
      payment_method: params.paymentMethod,
      payment_reference: params.paymentReference ?? null,
      proof_path: params.proofPath ?? null,
      proof_original_filename: params.proofOriginalFilename ?? null,
      notes: params.notes ?? null,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", params.claimId)
    .eq("status", "draft")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .maybeSingle<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listSubmittedCaretakerPaymentClaimsForCaretaker(
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .returns<CaretakerPaymentClaimRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listSubmittedCaretakerPaymentClaimsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .eq("landlord_id", landlordId)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .returns<CaretakerPaymentClaimRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getSubmittedCaretakerPaymentClaimForLandlord(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    claimId: string;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "submitted")
    .maybeSingle<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markCaretakerPaymentClaimConfirmed(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    landlordId: string;
    confirmedByProfileId: string;
    confirmedPaymentId: string;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .update({
      status: "confirmed",
      confirmed_by_profile_id: params.confirmedByProfileId,
      confirmed_at: new Date().toISOString(),
      confirmed_payment_id: params.confirmedPaymentId,
    })
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "submitted")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .maybeSingle<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markCaretakerPaymentClaimRejected(
  supabase: SupabaseClient,
  params: {
    claimId: string;
    landlordId: string;
    rejectedByProfileId: string;
    rejectionReason: string;
  },
) {
  const { data, error } = await supabase
    .from("caretaker_payment_claims")
    .update({
      status: "rejected",
      rejected_by_profile_id: params.rejectedByProfileId,
      rejected_at: new Date().toISOString(),
      rejection_reason: params.rejectionReason,
    })
    .eq("id", params.claimId)
    .eq("landlord_id", params.landlordId)
    .eq("status", "submitted")
    .select(CARETAKER_PAYMENT_CLAIM_SELECT)
    .maybeSingle<CaretakerPaymentClaimRow>();

  if (error) {
    throw error;
  }

  return data;
}
