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

type PublicDeveloperBuyerPurchaseLinkRpcRow = DeveloperBuyerPurchaseLinkRow & {
  estate_name: string;
  estate_location: string;
  estate_city: string | null;
  estate_state: string | null;
  plot_number: string;
  plot_size_label: string;
  plot_price: number;
  plot_status: string;
};

export async function getDeveloperBuyerPurchaseLinkByHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .rpc("get_public_developer_buyer_purchase_link_by_hash", {
      p_token_hash: tokenHash,
    })
    .maybeSingle<PublicDeveloperBuyerPurchaseLinkRpcRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    developer_account_id: data.developer_account_id,
    estate_id: data.estate_id,
    plot_id: data.plot_id,
    buyer_id: data.buyer_id,
    sale_id: data.sale_id,
    token_hash: data.token_hash,
    buyer_name: data.buyer_name,
    buyer_phone: data.buyer_phone,
    buyer_email: data.buyer_email,
    buyer_full_name: data.buyer_full_name,
    buyer_nin: data.buyer_nin,
    buyer_address: data.buyer_address,
    buyer_next_of_kin_name: data.buyer_next_of_kin_name,
    buyer_next_of_kin_phone: data.buyer_next_of_kin_phone,
    payment_plan_mode: data.payment_plan_mode,
    first_payment_amount: data.first_payment_amount,
    total_price: data.total_price,
    note: data.note,
    status: data.status,
    expires_at: data.expires_at,
    used_at: data.used_at,
    created_by_profile_id: data.created_by_profile_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    developer_estates: {
      id: data.estate_id,
      estate_name: data.estate_name,
      location: data.estate_location,
      city: data.estate_city,
      state: data.estate_state,
    },
    developer_plots: {
      id: data.plot_id,
      plot_number: data.plot_number,
      size_label: data.plot_size_label,
      price: data.plot_price,
      status: data.plot_status,
    },
  } satisfies DeveloperBuyerPurchaseLinkWithDetails;
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

export type PrepareBuyerPurchaseSaleFromLinkResult = {
  saleId: string;
  scheduleItemId: string;
  buyerId: string;
};

type PrepareBuyerPurchaseSaleFromLinkRpcRow = {
  sale_id: string;
  schedule_item_id: string;
  buyer_id: string;
};

export async function prepareBuyerPurchaseSaleFromLink(
  supabase: SupabaseClient,
  params: {
    purchaseLinkId: string;
    buyerFullName: string;
    buyerPhone: string;
    buyerEmail: string | null;
    buyerNin: string;
    buyerAddress: string;
    buyerNextOfKinName: string;
    buyerNextOfKinPhone: string;
  },
): Promise<PrepareBuyerPurchaseSaleFromLinkResult> {
  const { data, error } = await supabase
    .rpc("create_public_buyer_purchase_sale_from_link", {
      p_purchase_link_id: params.purchaseLinkId,
      p_buyer_full_name: params.buyerFullName,
      p_buyer_phone: params.buyerPhone,
      p_buyer_email: params.buyerEmail,
      p_buyer_nin: params.buyerNin,
      p_buyer_address: params.buyerAddress,
      p_buyer_next_of_kin_name: params.buyerNextOfKinName,
      p_buyer_next_of_kin_phone: params.buyerNextOfKinPhone,
    })
    .single<PrepareBuyerPurchaseSaleFromLinkRpcRow>();

  if (error) {
    throw error;
  }

  return {
    saleId: data.sale_id,
    scheduleItemId: data.schedule_item_id,
    buyerId: data.buyer_id,
  };
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
