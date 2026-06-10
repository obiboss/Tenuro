import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperDocumentType } from "@/constants/developer-document-templates";

export type DeveloperSaleDocumentType = Exclude<
  DeveloperDocumentType,
  "payment_receipts"
>;

export type DeveloperSaleDocumentStatus =
  | "generated"
  | "signed_copy_uploaded"
  | "ready_for_physical_collection"
  | "original_issued"
  | "voided";

export type DeveloperSaleDocumentRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  document_type: DeveloperSaleDocumentType;
  title: string;
  storage_path: string;
  status: DeveloperSaleDocumentStatus;
  generated_at: string;
  physical_original_issued_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_SALE_DOCUMENT_SELECT = `
  id,
  developer_account_id,
  sale_id,
  document_type,
  title,
  storage_path,
  status,
  generated_at,
  physical_original_issued_at,
  metadata,
  created_at,
  updated_at
`;

export async function getDeveloperSaleDocumentByType(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    documentType: DeveloperSaleDocumentType;
  },
) {
  const { data, error } = await supabase
    .from("developer_sale_documents")
    .select(DEVELOPER_SALE_DOCUMENT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .eq("document_type", params.documentType)
    .maybeSingle<DeveloperSaleDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listDeveloperSaleDocumentsForSale(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_sale_documents")
    .select(DEVELOPER_SALE_DOCUMENT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .neq("status", "voided")
    .order("created_at", { ascending: true })
    .returns<DeveloperSaleDocumentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertGeneratedDeveloperSaleDocument(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    documentType: DeveloperSaleDocumentType;
    title: string;
    storagePath: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("developer_sale_documents")
    .upsert(
      {
        developer_account_id: params.developerAccountId,
        sale_id: params.saleId,
        document_type: params.documentType,
        title: params.title,
        storage_path: params.storagePath,
        status: "generated",
        generated_at: new Date().toISOString(),
        metadata: params.metadata,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "developer_account_id,sale_id,document_type",
      },
    )
    .select(DEVELOPER_SALE_DOCUMENT_SELECT)
    .single<DeveloperSaleDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_SALE_DOCUMENT_SELECT };
