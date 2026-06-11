import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperPaymentPlanMode } from "@/server/validators/developer-payment-plan.schema";

export type DeveloperBuyerPurchaseLinkStatus =
  | "pending"
  | "details_submitted"
  | "payment_started"
  | "paid"
  | "cancelled"
  | "expired";

export type DeveloperBuyerPurchaseLinkRow = {
  id: string;
  developer_account_id: string;
  estate_id: string;
  plot_id: string;
  buyer_id: string | null;
  sale_id: string | null;
  token_hash: string;
  buyer_name: string | null;
  buyer_phone: string;
  buyer_email: string | null;
  buyer_full_name: string | null;
  buyer_nin: string | null;
  buyer_address: string | null;
  buyer_next_of_kin_name: string | null;
  buyer_next_of_kin_phone: string | null;
  payment_plan_mode: DeveloperPaymentPlanMode;
  first_payment_amount: number;
  total_price: number;
  note: string | null;
  status: DeveloperBuyerPurchaseLinkStatus;
  expires_at: string | null;
  used_at: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperBuyerPurchaseLinkWithDetails =
  DeveloperBuyerPurchaseLinkRow & {
    developer_estates: {
      id: string;
      estate_name: string;
      location: string;
      city: string | null;
      state: string | null;
    } | null;
    developer_plots: {
      id: string;
      plot_number: string;
      size_label: string;
      price: number;
      status: string;
    } | null;
  };

const DEVELOPER_BUYER_PURCHASE_LINK_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  sale_id,
  token_hash,
  buyer_name,
  buyer_phone,
  buyer_email,
  buyer_full_name,
  buyer_nin,
  buyer_address,
  buyer_next_of_kin_name,
  buyer_next_of_kin_phone,
  payment_plan_mode,
  first_payment_amount,
  total_price,
  note,
  status,
  expires_at,
  used_at,
  created_by_profile_id,
  created_at,
  updated_at
`;

const DEVELOPER_BUYER_PURCHASE_LINK_DETAILS_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  sale_id,
  token_hash,
  buyer_name,
  buyer_phone,
  buyer_email,
  buyer_full_name,
  buyer_nin,
  buyer_address,
  buyer_next_of_kin_name,
  buyer_next_of_kin_phone,
  payment_plan_mode,
  first_payment_amount,
  total_price,
  note,
  status,
  expires_at,
  used_at,
  created_by_profile_id,
  created_at,
  updated_at,
  developer_estates (
    id,
    estate_name,
    location,
    city,
    state
  ),
  developer_plots (
    id,
    plot_number,
    size_label,
    price,
    status
  )
`;

export async function createDeveloperBuyerPurchaseLink(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotId: string;
    tokenHash: string;
    buyerPhone: string;
    buyerName: string | null;
    buyerEmail: string | null;
    paymentPlanMode: DeveloperPaymentPlanMode;
    firstPaymentAmount: number;
    totalPrice: number;
    note: string | null;
    createdByProfileId: string;
    expiresAt: string | null;
  },
) {
  const { data, error } = await supabase
    .rpc("create_developer_buyer_purchase_link", {
      p_developer_account_id: params.developerAccountId,
      p_estate_id: params.estateId,
      p_plot_id: params.plotId,
      p_token_hash: params.tokenHash,
      p_buyer_phone: params.buyerPhone,
      p_buyer_name: params.buyerName,
      p_buyer_email: params.buyerEmail,
      p_payment_plan_mode: params.paymentPlanMode,
      p_first_payment_amount: params.firstPaymentAmount,
      p_total_price: params.totalPrice,
      p_note: params.note,
      p_created_by_profile_id: params.createdByProfileId,
      p_expires_at: params.expiresAt,
    })
    .single<DeveloperBuyerPurchaseLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperBuyerPurchaseLinkByHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("developer_buyer_purchase_links")
    .select(DEVELOPER_BUYER_PURCHASE_LINK_DETAILS_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle<DeveloperBuyerPurchaseLinkWithDetails>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDeveloperBuyerPurchaseLinkBuyerDetails(
  supabase: SupabaseClient,
  params: {
    linkId: string;
    buyerFullName: string;
    buyerPhone: string;
    buyerEmail: string | null;
    buyerNin: string;
    buyerAddress: string;
    buyerNextOfKinName: string;
    buyerNextOfKinPhone: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyer_purchase_links")
    .update({
      buyer_full_name: params.buyerFullName,
      buyer_phone: params.buyerPhone,
      buyer_email: params.buyerEmail,
      buyer_nin: params.buyerNin,
      buyer_address: params.buyerAddress,
      buyer_next_of_kin_name: params.buyerNextOfKinName,
      buyer_next_of_kin_phone: params.buyerNextOfKinPhone,
      status: "details_submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.linkId)
    .in("status", ["pending", "details_submitted"])
    .select(DEVELOPER_BUYER_PURCHASE_LINK_SELECT)
    .maybeSingle<DeveloperBuyerPurchaseLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markDeveloperBuyerPurchaseLinkPaymentStarted(
  supabase: SupabaseClient,
  params: {
    linkId: string;
    buyerId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_buyer_purchase_links")
    .update({
      buyer_id: params.buyerId,
      sale_id: params.saleId,
      status: "payment_started",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.linkId)
    .in("status", ["pending", "details_submitted", "payment_started"])
    .select(DEVELOPER_BUYER_PURCHASE_LINK_SELECT)
    .maybeSingle<DeveloperBuyerPurchaseLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function markDeveloperBuyerPurchaseLinkPaid(
  supabase: SupabaseClient,
  linkId: string,
) {
  const { data, error } = await supabase
    .from("developer_buyer_purchase_links")
    .update({
      status: "paid",
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", linkId)
    .neq("status", "paid")
    .select(DEVELOPER_BUYER_PURCHASE_LINK_SELECT)
    .maybeSingle<DeveloperBuyerPurchaseLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_BUYER_PURCHASE_LINK_SELECT };
