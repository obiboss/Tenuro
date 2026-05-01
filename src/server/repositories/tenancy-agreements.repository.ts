import type { SupabaseClient } from "@supabase/supabase-js";

export type TenancyAgreementDocumentStatus =
  | "draft"
  | "finalized"
  | "sent_to_tenant"
  | "accepted"
  | "voided";

export type TenancyAgreementDocumentRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  document_status: TenancyAgreementDocumentStatus;
  title: string;
  landlord_snapshot: Record<string, unknown>;
  tenant_snapshot: Record<string, unknown>;
  property_snapshot: Record<string, unknown>;
  tenancy_snapshot: Record<string, unknown>;
  agreement_body: string;
  finalized_body: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  tenant_acceptance_token_hash: string | null;
  tenant_acceptance_token_expires_at: string | null;
  tenant_accepted_at: string | null;
  tenant_acceptance_ip: string | null;
  tenant_acceptance_user_agent: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
};

const AGREEMENT_SELECT = `
  id,
  landlord_id,
  tenant_id,
  tenancy_id,
  document_status,
  title,
  landlord_snapshot,
  tenant_snapshot,
  property_snapshot,
  tenancy_snapshot,
  agreement_body,
  finalized_body,
  finalized_at,
  finalized_by,
  tenant_acceptance_token_hash,
  tenant_acceptance_token_expires_at,
  tenant_accepted_at,
  tenant_acceptance_ip,
  tenant_acceptance_user_agent,
  pdf_path,
  created_at,
  updated_at
`;

export async function getTenancyAgreementByTenancyId(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("tenancy_id", tenancyId)
    .is("deleted_at", null)
    .maybeSingle<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenancyAgreementById(
  supabase: SupabaseClient,
  agreementId: string,
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("id", agreementId)
    .is("deleted_at", null)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTenancyAgreementByAcceptanceTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .select(AGREEMENT_SELECT)
    .eq("tenant_acceptance_token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createTenancyAgreementDraft(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    landlordSnapshot: Record<string, unknown>;
    tenantSnapshot: Record<string, unknown>;
    propertySnapshot: Record<string, unknown>;
    tenancySnapshot: Record<string, unknown>;
    agreementBody: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      document_status: "draft",
      title: "Tenancy Agreement",
      landlord_snapshot: params.landlordSnapshot,
      tenant_snapshot: params.tenantSnapshot,
      property_snapshot: params.propertySnapshot,
      tenancy_snapshot: params.tenancySnapshot,
      agreement_body: params.agreementBody,
    })
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenancyAgreementDraft(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    agreementBody: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .update({
      agreement_body: params.agreementBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .eq("document_status", "draft")
    .is("deleted_at", null)
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function finalizeTenancyAgreement(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    finalizedBy: string;
    tokenHash: string;
    tokenExpiresAt: string;
  },
) {
  const agreement = await getTenancyAgreementById(supabase, params.agreementId);

  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .update({
      document_status: "sent_to_tenant",
      finalized_body: agreement.agreement_body,
      finalized_at: new Date().toISOString(),
      finalized_by: params.finalizedBy,
      tenant_acceptance_token_hash: params.tokenHash,
      tenant_acceptance_token_expires_at: params.tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .eq("document_status", "draft")
    .is("deleted_at", null)
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function refreshAgreementAcceptanceToken(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    tokenHash: string;
    tokenExpiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .update({
      document_status: "sent_to_tenant",
      tenant_acceptance_token_hash: params.tokenHash,
      tenant_acceptance_token_expires_at: params.tokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .in("document_status", ["sent_to_tenant", "finalized"])
    .is("deleted_at", null)
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function acceptTenancyAgreement(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .update({
      document_status: "accepted",
      tenant_accepted_at: new Date().toISOString(),
      tenant_acceptance_ip: params.ipAddress,
      tenant_acceptance_user_agent: params.userAgent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .eq("document_status", "sent_to_tenant")
    .is("deleted_at", null)
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTenancyAgreementPdfPath(
  supabase: SupabaseClient,
  params: {
    agreementId: string;
    pdfPath: string;
  },
) {
  const { data, error } = await supabase
    .from("tenancy_agreement_documents")
    .update({
      pdf_path: params.pdfPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.agreementId)
    .is("deleted_at", null)
    .select(AGREEMENT_SELECT)
    .single<TenancyAgreementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}
