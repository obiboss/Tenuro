import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagerTenantGuarantorRow } from "@/server/repositories/manager-tenant-guarantors.repository";

export type ManagerTenantOnboardingType =
  | "current_occupant"
  | "new_incoming_tenant";

export type ManagerTenantOnboardingStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "agreement_sent"
  | "agreement_accepted"
  | "payment_initialized"
  | "payment_paid"
  | "payment_expired";

export type ManagerTenantScreeningResult =
  | "not_screened"
  | "eligible"
  | "review"
  | "declined";

export type ManagerTenantRequirementSnapshotItem = {
  id: string;
  requirementCode:
    | "pets"
    | "subletting"
    | "minimum_monthly_income"
    | "employment_required"
    | "maximum_occupants"
    | "business_use"
    | "smoking"
    | "guarantor_required"
    | "custom_yes_no";
  title: string;
  questionText: string;
  description: string | null;
  answerType: "yes_no" | "money" | "integer";
  expectedBoolean: boolean | null;
  minimumValue: number | null;
  maximumValue: number | null;
  requiredGuarantorCount: number | null;
  mismatchAction: "review" | "decline";
  includeInAgreement: boolean;
  agreementClause: string | null;
};

export type ManagerTenantRequirementAnswerItem = {
  requirementId: string;
  requirementCode: ManagerTenantRequirementSnapshotItem["requirementCode"];
  title: string;
  questionText: string;
  answerType: ManagerTenantRequirementSnapshotItem["answerType"];
  booleanAnswer: boolean | null;
  numberAnswer: number | null;
  qualifies: boolean;
  mismatchAction: ManagerTenantRequirementSnapshotItem["mismatchAction"];
  reason: string | null;
};

export type ManagerTenantAgreementStatus =
  | "draft"
  | "sent_to_tenant"
  | "accepted"
  | "voided";

export type ManagerTenantOnboardingRequestRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  onboarding_type: ManagerTenantOnboardingType;
  status: ManagerTenantOnboardingStatus;
  token_hash: string;
  token_expires_at: string;
  token_used_at: string | null;
  invited_tenant_full_name: string | null;
  invited_tenant_phone_number: string | null;
  invited_tenant_email: string | null;
  tenant_full_name: string | null;
  tenant_phone_number: string | null;
  tenant_email: string | null;
  tenant_occupation: string | null;
  tenant_id_type: string | null;
  tenant_id_number: string | null;
  tenant_move_in_date: string | null;
  tenant_claimed_next_rent_due_date: string | null;
  tenant_claimed_rent_amount: number | null;
  existing_tenant_last_payment_amount: number | null;
  existing_tenant_last_payment_date: string | null;
  existing_tenant_last_payment_receipt_path: string | null;
  existing_tenant_last_payment_receipt_file_name: string | null;
  existing_tenant_last_payment_receipt_mime_type: string | null;
  existing_tenant_last_payment_receipt_size_bytes: number | null;
  tenant_payment_frequency: "annual" | "monthly" | "quarterly" | "biannual";
  tenant_notes: string | null;
  tenant_requirements_snapshot: ManagerTenantRequirementSnapshotItem[];
  tenant_requirement_answers: ManagerTenantRequirementAnswerItem[];
  tenant_screening_result: ManagerTenantScreeningResult;
  tenant_screening_reasons: string[];
  manager_confirmed_rent_amount: number | null;
  manager_confirmed_move_in_date: string | null;
  manager_confirmed_next_rent_due_date: string | null;
  opening_balance: number;
  manager_review_notes: string | null;
  approved_tenant_id: string | null;
  approved_by_profile_id: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  manager_properties: {
    id: string;
    property_name: string;
    property_address: string;
    collection_mode: "automatic_split" | "manager_collects" | "landlord_direct";
    management_fee_type: "percentage" | "flat";
    management_fee_value: number;
    paystack_charge_bearer: "tenant" | "landlord" | "manager" | "bopa";
  } | null;
  manager_units: {
    id: string;
    unit_label: string;
    unit_type: string | null;
    rent_frequency: "annual" | "monthly" | "quarterly" | "biannual";
    rent_amount: number;
    status: string;
  } | null;
  manager_landlord_clients: {
    id: string;
    landlord_name: string;
    landlord_phone: string | null;
    landlord_email: string | null;
  } | null;
  manager_organizations: {
    id: string;
    organization_name: string;
    organization_phone: string | null;
    organization_email: string | null;
  } | null;
  manager_tenant_guarantors: ManagerTenantGuarantorRow[];
};

export type ManagerTenantAgreementDocumentRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  onboarding_request_id: string | null;
  document_status: ManagerTenantAgreementStatus;
  title: string;
  manager_snapshot: Record<string, unknown>;
  landlord_snapshot: Record<string, unknown>;
  tenant_snapshot: Record<string, unknown>;
  property_snapshot: Record<string, unknown>;
  tenancy_snapshot: Record<string, unknown>;
  agreement_body: string;
  finalized_body: string | null;
  finalized_at: string | null;
  finalized_by_profile_id: string | null;
  tenant_acceptance_token_hash: string | null;
  tenant_acceptance_token_expires_at: string | null;
  tenant_accepted_at: string | null;
  tenant_acceptance_ip: string | null;
  tenant_acceptance_user_agent: string | null;
  pdf_bucket: string;
  pdf_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const REQUEST_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  onboarding_type,
  status,
  token_hash,
  token_expires_at,
  token_used_at,
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
  tenant_claimed_next_rent_due_date,
  tenant_claimed_rent_amount,
  existing_tenant_last_payment_amount,
  existing_tenant_last_payment_date,
  existing_tenant_last_payment_receipt_path,
  existing_tenant_last_payment_receipt_file_name,
  existing_tenant_last_payment_receipt_mime_type,
  existing_tenant_last_payment_receipt_size_bytes,
  tenant_payment_frequency,
  tenant_notes,
  tenant_requirements_snapshot,
  tenant_requirement_answers,
  tenant_screening_result,
  tenant_screening_reasons,
  manager_confirmed_rent_amount,
  manager_confirmed_move_in_date,
  manager_confirmed_next_rent_due_date,
  opening_balance,
  manager_review_notes,
  approved_tenant_id,
  approved_by_profile_id,
  rejection_reason,
  submitted_at,
  reviewed_at,
  cancelled_at,
  expired_at,
  metadata,
  created_at,
  updated_at,
  manager_properties (
    id,
    property_name,
    property_address,
    collection_mode,
    management_fee_type,
    management_fee_value,
    paystack_charge_bearer
  ),
  manager_units (
    id,
    unit_label,
    unit_type,
    rent_frequency,
    rent_amount,
    status
  ),
  manager_landlord_clients (
    id,
    landlord_name,
    landlord_phone,
    landlord_email
  ),
  manager_organizations (
    id,
    organization_name,
    organization_phone,
    organization_email
  ),
  manager_tenant_guarantors (
    id,
    organization_id,
    landlord_client_id,
    property_id,
    unit_id,
    onboarding_request_id,
    position,
    full_name,
    phone_number,
    email,
    relationship_to_tenant,
    residential_address,
    occupation,
    employer_or_business,
    monthly_income,
    id_type,
    id_number,
    status,
    confirmation_token_hash,
    confirmation_token_expires_at,
    confirmation_token_used_at,
    responsibility_acknowledged,
    confirmed_at,
    confirmation_ip,
    confirmation_user_agent,
    metadata,
    cancelled_at,
    created_at,
    updated_at
  )
`;

const AGREEMENT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  tenant_id,
  onboarding_request_id,
  document_status,
  title,
  manager_snapshot,
  landlord_snapshot,
  tenant_snapshot,
  property_snapshot,
  tenancy_snapshot,
  agreement_body,
  finalized_body,
  finalized_at,
  finalized_by_profile_id,
  tenant_acceptance_token_hash,
  tenant_acceptance_token_expires_at,
  tenant_accepted_at,
  tenant_acceptance_ip,
  tenant_acceptance_user_agent,
  pdf_bucket,
  pdf_path,
  metadata,
  created_at,
  updated_at
`;

export async function createManagerTenantOnboardingRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    onboardingType: ManagerTenantOnboardingType;
    tokenHash: string;
    tokenExpiresAt: string;
    invitedTenantFullName: string;
    invitedTenantPhoneNumber: string;
    invitedTenantEmail: string | null;
    note: string | null;
    paymentFrequency: "annual" | "monthly" | "quarterly" | "biannual";
    tenantRequirementsSnapshot: ManagerTenantRequirementSnapshotItem[];
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      onboarding_type: params.onboardingType,
      token_hash: params.tokenHash,
      token_expires_at: params.tokenExpiresAt,
      invited_tenant_full_name: params.invitedTenantFullName,
      invited_tenant_phone_number: params.invitedTenantPhoneNumber,
      invited_tenant_email: params.invitedTenantEmail,
      manager_review_notes: params.note,
      tenant_payment_frequency: params.paymentFrequency,
      tenant_requirements_snapshot: params.tenantRequirementsSnapshot,
      tenant_requirement_answers: [],
      tenant_screening_result: "not_screened",
      tenant_screening_reasons: [],
      status: "pending",
      metadata: params.metadata,
    })
    .select(REQUEST_SELECT)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantOnboardingRequestByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .select(REQUEST_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerTenantOnboardingRequests(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId?: string;
  },
) {
  let query = supabase
    .from("manager_tenant_onboarding_requests")
    .select(REQUEST_SELECT)
    .eq("organization_id", params.organizationId);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ManagerTenantOnboardingRequestRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantOnboardingRequestById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .select(REQUEST_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("id", params.requestId)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateManagerTenantOnboardingRequestToken(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
    tokenHash: string;
    tokenExpiresAt: string;
    metadata: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      token_hash: params.tokenHash,
      token_expires_at: params.tokenExpiresAt,
      token_used_at: null,
      metadata: params.metadata,
      updated_at: now,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.requestId)
    .eq("status", "pending")
    .select(REQUEST_SELECT)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function submitManagerTenantOnboardingRequest(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    occupation: string | null;
    idType: string;
    idNumber: string;
    moveInDate: string | null;
    statedRentDueDate: string | null;
    claimedRentAmount: number | null;
    lastPaymentAmount: number | null;
    lastPaymentDate: string | null;
    lastPaymentReceiptPath: string | null;
    lastPaymentReceiptFileName: string | null;
    lastPaymentReceiptMimeType: string | null;
    lastPaymentReceiptSizeBytes: number | null;
    paymentFrequency: "annual" | "monthly" | "quarterly" | "biannual";
    tenantNotes: string | null;
    requirementAnswers: ManagerTenantRequirementAnswerItem[];
    screeningResult: ManagerTenantScreeningResult;
    screeningReasons: string[];
    status: "submitted" | "rejected";
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      tenant_full_name: params.fullName,
      tenant_phone_number: params.phoneNumber,
      tenant_email: params.email,
      tenant_occupation: params.occupation,
      tenant_id_type: params.idType,
      tenant_id_number: params.idNumber,
      tenant_move_in_date: params.moveInDate,
      tenant_claimed_next_rent_due_date: params.statedRentDueDate,
      tenant_claimed_rent_amount: params.claimedRentAmount,
      existing_tenant_last_payment_amount: params.lastPaymentAmount,
      existing_tenant_last_payment_date: params.lastPaymentDate,
      existing_tenant_last_payment_receipt_path: params.lastPaymentReceiptPath,
      existing_tenant_last_payment_receipt_file_name:
        params.lastPaymentReceiptFileName,
      existing_tenant_last_payment_receipt_mime_type:
        params.lastPaymentReceiptMimeType,
      existing_tenant_last_payment_receipt_size_bytes:
        params.lastPaymentReceiptSizeBytes,
      tenant_payment_frequency: params.paymentFrequency,
      tenant_notes: params.tenantNotes,
      tenant_requirement_answers: params.requirementAnswers,
      tenant_screening_result: params.screeningResult,
      tenant_screening_reasons: params.screeningReasons,
      status: params.status,
      rejection_reason:
        params.status === "rejected"
          ? params.screeningReasons.join(" ")
          : null,
      token_used_at: now,
      submitted_at: now,
      reviewed_at: params.status === "rejected" ? now : null,
      updated_at: now,
    })
    .eq("id", params.requestId)
    .eq("status", "pending")
    .select(REQUEST_SELECT)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateManagerTenantOnboardingRequestReviewed(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    organizationId: string;
    status: ManagerTenantOnboardingStatus;
    approvedTenantId: string | null;
    approvedByProfileId: string;
    confirmedRentAmount: number | null;
    confirmedMoveInDate: string | null;
    confirmedNextRentDueDate: string | null;
    openingBalance: number;
    reviewNotes: string | null;
    rejectionReason?: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      status: params.status,
      approved_tenant_id: params.approvedTenantId,
      approved_by_profile_id: params.approvedByProfileId,
      manager_confirmed_rent_amount: params.confirmedRentAmount,
      manager_confirmed_move_in_date: params.confirmedMoveInDate,
      manager_confirmed_next_rent_due_date: params.confirmedNextRentDueDate,
      opening_balance: params.openingBalance,
      manager_review_notes: params.reviewNotes,
      rejection_reason: params.rejectionReason ?? null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: params.metadata,
    })
    .eq("id", params.requestId)
    .eq("organization_id", params.organizationId)
    .eq("status", "submitted")
    .select(REQUEST_SELECT)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerTenantAgreementDocument(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
    onboardingRequestId: string;
    agreementBody: string;
    tokenHash: string;
    tokenExpiresAt: string;
    finalizedByProfileId: string;
    managerSnapshot: Record<string, unknown>;
    landlordSnapshot: Record<string, unknown>;
    tenantSnapshot: Record<string, unknown>;
    propertySnapshot: Record<string, unknown>;
    tenancySnapshot: Record<string, unknown>;
    metadata: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      tenant_id: params.tenantId,
      onboarding_request_id: params.onboardingRequestId,
      document_status: "sent_to_tenant",
      title: "Tenancy Agreement",
      agreement_body: params.agreementBody,
      finalized_body: params.agreementBody,
      finalized_at: now,
      finalized_by_profile_id: params.finalizedByProfileId,
      tenant_acceptance_token_hash: params.tokenHash,
      tenant_acceptance_token_expires_at: params.tokenExpiresAt,
      manager_snapshot: params.managerSnapshot,
      landlord_snapshot: params.landlordSnapshot,
      tenant_snapshot: params.tenantSnapshot,
      property_snapshot: params.propertySnapshot,
      tenancy_snapshot: params.tenancySnapshot,
      metadata: params.metadata,
    })
    .select(AGREEMENT_SELECT)
    .single<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantAgreementByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("tenant_acceptance_token_hash", tokenHash)
    .maybeSingle<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantAgreementById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    agreementId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("id", params.agreementId)
    .maybeSingle<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerTenantAgreementDocuments(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId?: string;
    tenantId?: string;
  },
) {
  let query = supabase
    .from("manager_tenant_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("organization_id", params.organizationId);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  if (params.tenantId) {
    query = query.eq("tenant_id", params.tenantId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ManagerTenantAgreementDocumentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateManagerTenantAgreementPdfPath(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    pdfPath: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .update({
      pdf_bucket: "tenancy-agreement-pdfs",
      pdf_path: params.pdfPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .select(AGREEMENT_SELECT)
    .single<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function acceptManagerTenantAgreement(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .update({
      document_status: "accepted",
      tenant_accepted_at: new Date().toISOString(),
      tenant_acceptance_ip: params.ipAddress,
      tenant_acceptance_user_agent: params.userAgent,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .eq("document_status", "sent_to_tenant")
    .select(AGREEMENT_SELECT)
    .single<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function voidManagerTenantAgreement(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_agreement_documents")
    .update({
      document_status: "voided",
      tenant_acceptance_ip: params.ipAddress,
      tenant_acceptance_user_agent: params.userAgent,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .in("document_status", ["sent_to_tenant", "accepted"])
    .select(AGREEMENT_SELECT)
    .single<ManagerTenantAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markManagerOnboardingAgreementAccepted(
  supabase: SupabaseClient,
  params: {
    requestId: string;
  },
) {
  const { error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      status: "agreement_accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.requestId)
    .in("status", ["agreement_sent", "agreement_accepted"]);

  if (error) {
    throw error;
  }
}

export async function markManagerOnboardingPaymentInitialized(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    paymentRequestId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      status: "payment_initialized",
      updated_at: new Date().toISOString(),
      metadata: {
        ...(params.metadata ?? {}),
        payment_request_id: params.paymentRequestId,
      },
    })
    .eq("id", params.requestId)
    .in("status", [
      "agreement_accepted",
      "payment_initialized",
      "payment_expired",
    ]);

  if (error) {
    throw error;
  }
}

export async function cancelManagerOnboardingAfterAgreementDecline(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
    metadata: Record<string, unknown>;
  },
) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now,
      metadata: params.metadata,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.requestId)
    .neq("status", "payment_paid")
    .select(REQUEST_SELECT)
    .single<ManagerTenantOnboardingRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateManagerUnitStatusDirect(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    unitId: string;
    status: "vacant" | "reserved" | "occupied" | "inactive";
  },
) {
  const { error } = await supabase
    .from("manager_units")
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.unitId);

  if (error) {
    throw error;
  }
}

export async function updateManagerTenantOnboardingStatus(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
    status: ManagerTenantOnboardingStatus;
    metadata: Record<string, unknown>;
  },
) {
  const { error } = await supabase
    .from("manager_tenant_onboarding_requests")
    .update({
      status: params.status,
      metadata: params.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.requestId);

  if (error) {
    throw error;
  }
}

export async function deactivateManagerProspectiveTenant(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    tenantId: string;
  },
) {
  const { error } = await supabase
    .from("manager_tenants")
    .update({
      status: "inactive",
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.tenantId)
    .eq("status", "inactive");

  if (error) {
    throw error;
  }
}
