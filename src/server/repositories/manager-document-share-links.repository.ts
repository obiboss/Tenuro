import type { SupabaseClient } from "@supabase/supabase-js";

export type ManagerDocumentShareLinkRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  statement_document_id: string;
  token_hash: string;
  status: "active" | "revoked" | "expired";
  expires_at: string;
  max_access_count: number;
  access_count: number;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  revoked_at: string | null;
  created_by_profile_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function createManagerDocumentShareLink(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    statementDocumentId: string;
    tokenHash: string;
    expiresAt: string;
    createdByProfileId: string;
    maxAccessCount: number;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .rpc(
      "create_manager_statement_document_share_link",
      {
        p_organization_id: params.organizationId,
        p_landlord_client_id: params.landlordClientId,
        p_statement_document_id:
          params.statementDocumentId,
        p_token_hash: params.tokenHash,
        p_expires_at: params.expiresAt,
        p_created_by_profile_id:
          params.createdByProfileId,
        p_max_access_count: params.maxAccessCount,
        p_metadata: params.metadata,
      },
    )
    .returns<ManagerDocumentShareLinkRow[]>();

  if (error) {
    throw error;
  }

  const shareLink = data[0];

  if (!shareLink) {
    throw new Error(
      "Manager document share link was not created.",
    );
  }

  return shareLink;
}

export async function consumeManagerDocumentShareLink(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .rpc(
      "consume_manager_statement_document_share_link",
      {
        p_token_hash: tokenHash,
      },
    )
    .returns<ManagerDocumentShareLinkRow[]>();

  if (error) {
    throw error;
  }

  return data[0] ?? null;
}
