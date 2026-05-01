import type { SupabaseClient } from "@supabase/supabase-js";

export type GuarantorRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  address: string;
  relationship_to_tenant: string;
  id_document_path: string | null;
  created_at: string;
};

export type ReplaceTenantGuarantorInput = {
  tenantId: string;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  address: string;
  relationshipToTenant: string;
  idDocumentPath?: string | null;
};

const GUARANTOR_SELECT = `
  id,
  tenant_id,
  full_name,
  phone_number,
  email,
  address,
  relationship_to_tenant,
  id_document_path,
  created_at
`;

export async function getActiveGuarantorForTenant(
  supabase: SupabaseClient,
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("guarantors")
    .select(GUARANTOR_SELECT)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<GuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function replaceTenantGuarantor(
  supabase: SupabaseClient,
  input: ReplaceTenantGuarantorInput,
) {
  const now = new Date().toISOString();

  const { error: archiveError } = await supabase
    .from("guarantors")
    .update({
      archived_at: now,
    })
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null)
    .is("archived_at", null);

  if (archiveError) {
    throw archiveError;
  }

  const { data, error } = await supabase
    .from("guarantors")
    .insert({
      tenant_id: input.tenantId,
      full_name: input.fullName,
      phone_number: input.phoneNumber,
      email: input.email || null,
      address: input.address,
      relationship_to_tenant: input.relationshipToTenant,
      id_document_path: input.idDocumentPath || null,
    })
    .select(GUARANTOR_SELECT)
    .single<GuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}
