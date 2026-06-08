import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperEstateStatus =
  | "planning"
  | "selling"
  | "paused"
  | "sold_out"
  | "archived";

export type DeveloperPlotInventoryStatus =
  | "available"
  | "reserved"
  | "active"
  | "sold"
  | "blocked";

export type DeveloperEstateRow = {
  id: string;
  developer_account_id: string;
  estate_name: string;
  location: string;
  city: string | null;
  state: string | null;
  lga: string | null;
  country: string;
  description: string | null;
  status: DeveloperEstateStatus;
  created_at: string;
  updated_at: string;
};

export type DeveloperEstateSummaryRow = DeveloperEstateRow & {
  developer_plots: {
    id: string;
    status: DeveloperPlotInventoryStatus;
  }[];
};

const DEVELOPER_ESTATE_SELECT = `
  id,
  developer_account_id,
  estate_name,
  location,
  city,
  state,
  lga,
  country,
  description,
  status,
  created_at,
  updated_at
`;

const DEVELOPER_ESTATE_SUMMARY_SELECT = `
  id,
  developer_account_id,
  estate_name,
  location,
  city,
  state,
  lga,
  country,
  description,
  status,
  created_at,
  updated_at,
  developer_plots (
    id,
    status
  )
`;

export async function listDeveloperEstates(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_estates")
    .select(DEVELOPER_ESTATE_SUMMARY_SELECT)
    .eq("developer_account_id", developerAccountId)
    .order("created_at", { ascending: false })
    .returns<DeveloperEstateSummaryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperEstateById(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_estates")
    .select(DEVELOPER_ESTATE_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.estateId)
    .maybeSingle<DeveloperEstateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateName: string;
    location: string;
    city: string | null;
    state: string;
    lga: string;
    description: string | null;
    status: DeveloperEstateStatus;
  },
) {
  const { data, error } = await supabase
    .from("developer_estates")
    .insert({
      developer_account_id: params.developerAccountId,
      estate_name: params.estateName,
      location: params.location,
      city: params.city,
      state: params.state,
      lga: params.lga,
      description: params.description,
      status: params.status,
    })
    .select(DEVELOPER_ESTATE_SELECT)
    .single<DeveloperEstateRow>();

  if (error) {
    throw error;
  }

  return data;
}
