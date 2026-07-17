import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperBuyerStatus =
  | "prospective"
  | "assigned"
  | "active"
  | "cancelled";

export type DeveloperBuyerRow = {
  id: string;
  developer_account_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  nin: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  residential_address: string | null;
  status: DeveloperBuyerStatus;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_BUYER_SELECT = `
  id,
  developer_account_id,
  full_name,
  phone_number,
  email,
  nin,
  next_of_kin_name,
  next_of_kin_phone,
  residential_address,
  status,
  created_at,
  updated_at
`;

export async function listDeveloperBuyers(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_buyers")
    .select(DEVELOPER_BUYER_SELECT)
    .eq("developer_account_id", developerAccountId)
    .order("created_at", { ascending: false })
    .returns<DeveloperBuyerRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAssignableDeveloperBuyers(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_buyers")
    .select(DEVELOPER_BUYER_SELECT)
    .eq("developer_account_id", developerAccountId)
    .eq("status", "prospective")
    .order("created_at", { ascending: false })
    .returns<DeveloperBuyerRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function findDeveloperBuyerByPhone(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    phoneNumber: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyers")
    .select(DEVELOPER_BUYER_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("phone_number", params.phoneNumber)
    .maybeSingle<DeveloperBuyerRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDeveloperBuyer(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    buyerId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    nin: string;
    nextOfKinName: string;
    nextOfKinPhone: string;
    residentialAddress: string;
    status?: DeveloperBuyerStatus;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyers")
    .update({
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      nin: params.nin,
      next_of_kin_name: params.nextOfKinName,
      next_of_kin_phone: params.nextOfKinPhone,
      residential_address: params.residentialAddress,
      ...(params.status ? { status: params.status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.buyerId)
    .select(DEVELOPER_BUYER_SELECT)
    .maybeSingle<DeveloperBuyerRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperBuyer(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    nin: string;
    nextOfKinName: string;
    nextOfKinPhone: string;
    residentialAddress: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyers")
    .insert({
      developer_account_id: params.developerAccountId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      nin: params.nin,
      next_of_kin_name: params.nextOfKinName,
      next_of_kin_phone: params.nextOfKinPhone,
      residential_address: params.residentialAddress,
      status: "prospective",
    })
    .select(DEVELOPER_BUYER_SELECT)
    .single<DeveloperBuyerRow>();

  if (error) {
    throw error;
  }

  return data;
}
