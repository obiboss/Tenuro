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

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

function isManagerDocumentShareLinkRow(
  value: unknown,
): value is ManagerDocumentShareLinkRow {
  if (!isRecord(value)) {
    return false;
  }

  const status = value.status;

  return (
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.landlord_client_id === "string" &&
    typeof value.statement_document_id === "string" &&
    typeof value.token_hash === "string" &&
    (
      status === "active" ||
      status === "revoked" ||
      status === "expired"
    ) &&
    typeof value.expires_at === "string" &&
    typeof value.max_access_count === "number" &&
    typeof value.access_count === "number" &&
    isNullableString(value.first_accessed_at) &&
    isNullableString(value.last_accessed_at) &&
    isNullableString(value.revoked_at) &&
    isNullableString(value.created_by_profile_id) &&
    isRecord(value.metadata) &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function extractManagerDocumentShareLink(
  value: unknown,
): ManagerDocumentShareLinkRow | null {
  const candidate = Array.isArray(value)
    ? value[0]
    : value;

  return isManagerDocumentShareLinkRow(candidate)
    ? candidate
    : null;
}

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
): Promise<ManagerDocumentShareLinkRow> {
  const { data, error } = await supabase.rpc(
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
  );

  if (error) {
    throw error;
  }

  const shareLink =
    extractManagerDocumentShareLink(data);

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
): Promise<ManagerDocumentShareLinkRow | null> {
  const { data, error } = await supabase.rpc(
    "consume_manager_statement_document_share_link",
    {
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    throw error;
  }

  return extractManagerDocumentShareLink(data);
}