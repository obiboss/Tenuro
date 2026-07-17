import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperEditableTemplateType } from "@/constants/developer-document-templates";

export type DeveloperDocumentTemplateRow = {
  id: string;
  developer_account_id: string;
  template_type: DeveloperEditableTemplateType;
  template_name: string;
  template_body: string;
  is_default_copy: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_DOCUMENT_TEMPLATE_SELECT = `
  id,
  developer_account_id,
  template_type,
  template_name,
  template_body,
  is_default_copy,
  is_active,
  created_at,
  updated_at
`;

export async function listDeveloperDocumentTemplates(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_document_templates")
    .select(DEVELOPER_DOCUMENT_TEMPLATE_SELECT)
    .eq("developer_account_id", developerAccountId)
    .eq("is_active", true)
    .order("template_type", { ascending: true })
    .returns<DeveloperDocumentTemplateRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperDocumentTemplateByType(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    templateType: DeveloperEditableTemplateType;
  },
) {
  const { data, error } = await supabase
    .from("developer_document_templates")
    .select(DEVELOPER_DOCUMENT_TEMPLATE_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("template_type", params.templateType)
    .eq("is_active", true)
    .maybeSingle<DeveloperDocumentTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertDeveloperDocumentTemplate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    templateType: DeveloperEditableTemplateType;
    templateName: string;
    templateBody: string;
    isDefaultCopy: boolean;
  },
) {
  const { data, error } = await supabase
    .from("developer_document_templates")
    .upsert(
      {
        developer_account_id: params.developerAccountId,
        template_type: params.templateType,
        template_name: params.templateName,
        template_body: params.templateBody,
        is_default_copy: params.isDefaultCopy,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "developer_account_id,template_type",
      },
    )
    .select(DEVELOPER_DOCUMENT_TEMPLATE_SELECT)
    .single<DeveloperDocumentTemplateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_DOCUMENT_TEMPLATE_SELECT };
