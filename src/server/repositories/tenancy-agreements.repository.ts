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
  tenant_accepted_at: string | null;
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
  tenant_accepted_at,
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
