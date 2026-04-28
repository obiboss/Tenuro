import type { SupabaseClient } from "@supabase/supabase-js";

export async function saveTenantOnboardingToken(
  supabase: SupabaseClient,
  params: {
    tenantId: string;
    tokenHash: string;
    expiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("tenants")
    .update({
      onboarding_token_hash: params.tokenHash,
      onboarding_token_expires_at: params.expiresAt,
      onboarding_token_used_at: null,
      onboarding_status: "invited",
    })
    .eq("id", params.tenantId)
    .is("deleted_at", null)
    .select("id, full_name, phone_number, landlord_id, unit_id")
    .single<{
      id: string;
      full_name: string;
      phone_number: string;
      landlord_id: string;
      unit_id: string;
    }>();

  if (error) {
    throw error;
  }

  return data;
}
