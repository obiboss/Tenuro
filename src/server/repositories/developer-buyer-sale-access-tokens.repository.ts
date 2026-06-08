import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperBuyerSaleAccessTokenRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  buyer_id: string;
  token_hash: string;
  label: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_BUYER_SALE_ACCESS_TOKEN_SELECT = `
  id,
  developer_account_id,
  sale_id,
  buyer_id,
  token_hash,
  label,
  expires_at,
  revoked_at,
  last_used_at,
  created_by_profile_id,
  created_at,
  updated_at
`;

export async function revokeActiveBuyerSaleAccessTokens(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { error } = await supabase
    .from("developer_buyer_sale_access_tokens")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .is("revoked_at", null);

  if (error) {
    throw error;
  }
}

export async function createBuyerSaleAccessToken(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    buyerId: string;
    tokenHash: string;
    createdByProfileId: string;
    expiresAt: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyer_sale_access_tokens")
    .insert({
      developer_account_id: params.developerAccountId,
      sale_id: params.saleId,
      buyer_id: params.buyerId,
      token_hash: params.tokenHash,
      label: "Buyer payment portal",
      expires_at: params.expiresAt,
      created_by_profile_id: params.createdByProfileId,
    })
    .select(DEVELOPER_BUYER_SALE_ACCESS_TOKEN_SELECT)
    .single<DeveloperBuyerSaleAccessTokenRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getActiveBuyerSaleAccessTokenByHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("developer_buyer_sale_access_tokens")
    .select(DEVELOPER_BUYER_SALE_ACCESS_TOKEN_SELECT)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle<DeveloperBuyerSaleAccessTokenRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markBuyerSaleAccessTokenUsed(
  supabase: SupabaseClient,
  tokenId: string,
) {
  const { error } = await supabase
    .from("developer_buyer_sale_access_tokens")
    .update({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenId);

  if (error) {
    throw error;
  }
}
