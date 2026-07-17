import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperSaleStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled"
  | "defaulting"
  | "exited";

export type DeveloperPaymentPlanMode =
  | "outright"
  | "fixed_installment"
  | "milestone_based"
  | "flexible";

export type DeveloperSaleRow = {
  id: string;
  developer_account_id: string;
  estate_id: string;
  plot_id: string;
  buyer_id: string;
  plot_assignment_id: string;
  sale_reference: string;
  payment_plan_mode: DeveloperPaymentPlanMode;
  total_price_locked: number;
  initial_deposit_amount: number;
  sale_date: string;
  expected_completion_date: string | null;
  status: DeveloperSaleStatus;
  agreement_generated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperSaleWithDetails = DeveloperSaleRow & {
  developer_estates: {
    id: string;
    estate_name: string;
    location: string;
    city: string | null;
    state: string | null;
    lga: string | null;
    country: string | null;
  } | null;
  developer_plots: {
    id: string;
    plot_number: string;
    size_label: string;
    price: number;
    status: string;
    notes: string | null;
  } | null;
  developer_buyers: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
    nin: string | null;
    residential_address: string | null;
    status: string;
  } | null;
};

const DEVELOPER_SALE_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  plot_assignment_id,
  sale_reference,
  payment_plan_mode,
  total_price_locked,
  initial_deposit_amount,
  sale_date,
  expected_completion_date,
  status,
  agreement_generated_at,
  notes,
  created_at,
  updated_at
`;

const DEVELOPER_SALE_DETAILS_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  plot_assignment_id,
  sale_reference,
  payment_plan_mode,
  total_price_locked,
  initial_deposit_amount,
  sale_date,
  expected_completion_date,
  status,
  agreement_generated_at,
  notes,
  created_at,
  updated_at,
  developer_estates (
    id,
    estate_name,
    location,
    city,
    state,
    lga,
    country
  ),
  developer_plots (
    id,
    plot_number,
    size_label,
    price,
    status,
    notes
  ),
  developer_buyers (
    id,
    full_name,
    phone_number,
    email,
    nin,
    residential_address,
    status
  )
`;

export async function listDeveloperSales(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_sales")
    .select(DEVELOPER_SALE_DETAILS_SELECT)
    .eq("developer_account_id", developerAccountId)
    .order("created_at", { ascending: false })
    .returns<DeveloperSaleWithDetails[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperSaleById(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_sales")
    .select(DEVELOPER_SALE_DETAILS_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.saleId)
    .maybeSingle<DeveloperSaleWithDetails>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperSaleFromAssignment(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    plotAssignmentId: string;
    paymentPlanMode: DeveloperPaymentPlanMode;
    totalPriceLocked: number;
    initialDepositAmount: number;
    saleDate: string;
    expectedCompletionDate: string | null;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .rpc("create_developer_sale_from_assignment", {
      p_developer_account_id: params.developerAccountId,
      p_plot_assignment_id: params.plotAssignmentId,
      p_payment_plan_mode: params.paymentPlanMode,
      p_total_price_locked: params.totalPriceLocked,
      p_initial_deposit_amount: params.initialDepositAmount,
      p_sale_date: params.saleDate,
      p_expected_completion_date: params.expectedCompletionDate,
      p_notes: params.notes,
    })
    .single<DeveloperSaleRow>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_SALE_SELECT, DEVELOPER_SALE_DETAILS_SELECT };
