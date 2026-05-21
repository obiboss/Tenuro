import type { SupabaseClient } from "@supabase/supabase-js";

export type AgreementTemplateRow = {
  id: string;
  landlord_id: string;
  property_id: string | null;
  name: string;
  template_body: string;
  is_default: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const AGREEMENT_TEMPLATE_SELECT = `
  id,
  landlord_id,
  property_id,
  name,
  template_body,
  is_default,
  is_active,
  metadata,
  created_at,
  updated_at,
  deleted_at
`;

export async function getLandlordDefaultAgreementTemplate(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select(AGREEMENT_TEMPLATE_SELECT)
    .eq("landlord_id", landlordId)
    .is("property_id", null)
    .eq("is_default", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle<AgreementTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPropertyDefaultAgreementTemplate(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    propertyId: string;
  },
) {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select(AGREEMENT_TEMPLATE_SELECT)
    .eq("landlord_id", params.landlordId)
    .eq("property_id", params.propertyId)
    .eq("is_default", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle<AgreementTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAgreementTemplateById(
  supabase: SupabaseClient,
  templateId: string,
) {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select(AGREEMENT_TEMPLATE_SELECT)
    .eq("id", templateId)
    .is("deleted_at", null)
    .single<AgreementTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAgreementTemplatesForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
) {
  const { data, error } = await supabase
    .from("agreement_templates")
    .select(AGREEMENT_TEMPLATE_SELECT)
    .eq("landlord_id", landlordId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("property_id", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .returns<AgreementTemplateRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertLandlordDefaultAgreementTemplate(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    name: string;
    templateBody: string;
  },
) {
  const existing = await getLandlordDefaultAgreementTemplate(
    supabase,
    params.landlordId,
  );

  if (existing) {
    const { data, error } = await supabase
      .from("agreement_templates")
      .update({
        name: params.name.trim(),
        template_body: params.templateBody,
        is_default: true,
        is_active: true,
      })
      .eq("id", existing.id)
      .select(AGREEMENT_TEMPLATE_SELECT)
      .single<AgreementTemplateRow>();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("agreement_templates")
    .insert({
      landlord_id: params.landlordId,
      property_id: null,
      name: params.name.trim(),
      template_body: params.templateBody,
      is_default: true,
      is_active: true,
    })
    .select(AGREEMENT_TEMPLATE_SELECT)
    .single<AgreementTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertPropertyDefaultAgreementTemplate(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    propertyId: string;
    name: string;
    templateBody: string;
  },
) {
  const existing = await getPropertyDefaultAgreementTemplate(supabase, {
    landlordId: params.landlordId,
    propertyId: params.propertyId,
  });

  if (existing) {
    const { data, error } = await supabase
      .from("agreement_templates")
      .update({
        name: params.name.trim(),
        template_body: params.templateBody,
        is_default: true,
        is_active: true,
      })
      .eq("id", existing.id)
      .select(AGREEMENT_TEMPLATE_SELECT)
      .single<AgreementTemplateRow>();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("agreement_templates")
    .insert({
      landlord_id: params.landlordId,
      property_id: params.propertyId,
      name: params.name.trim(),
      template_body: params.templateBody,
      is_default: true,
      is_active: true,
    })
    .select(AGREEMENT_TEMPLATE_SELECT)
    .single<AgreementTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}
