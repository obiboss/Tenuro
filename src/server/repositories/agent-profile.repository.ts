import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentProfileRow = {
  id: string;
  agent_id: string;
  business_name: string;
  business_phone: string;
  service_state: string;
  service_lga: string;
  business_address: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

const AGENT_PROFILE_SELECT = `
  id,
  agent_id,
  business_name,
  business_phone,
  service_state,
  service_lga,
  business_address,
  is_verified,
  verified_at,
  created_at,
  updated_at
`;

export async function getAgentProfileByAgentId(
  supabase: SupabaseClient,
  agentId: string,
) {
  const { data, error } = await supabase
    .from("agent_profiles")
    .select(AGENT_PROFILE_SELECT)
    .eq("agent_id", agentId)
    .maybeSingle<AgentProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertAgentProfile(
  supabase: SupabaseClient,
  params: {
    agentId: string;
    businessName: string;
    businessPhone: string;
    serviceState: string;
    serviceLga: string;
    businessAddress: string | null;
  },
) {
  const { data, error } = await supabase
    .from("agent_profiles")
    .upsert(
      {
        agent_id: params.agentId,
        business_name: params.businessName,
        business_phone: params.businessPhone,
        service_state: params.serviceState,
        service_lga: params.serviceLga,
        business_address: params.businessAddress,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "agent_id",
      },
    )
    .select(AGENT_PROFILE_SELECT)
    .single<AgentProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}
