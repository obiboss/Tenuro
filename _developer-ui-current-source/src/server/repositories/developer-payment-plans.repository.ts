import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeveloperPaymentPlanMode } from "@/server/validators/developer-payment-plan.schema";

export type DeveloperPaymentPlanStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled";

export type DeveloperPaymentScheduleItemStatus =
  | "pending"
  | "part_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type DeveloperPaymentPlanRow = {
  id: string;
  developer_account_id: string;
  sale_id: string;
  payment_plan_mode: DeveloperPaymentPlanMode;
  total_amount: number;
  schedule_start_date: string;
  status: DeveloperPaymentPlanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperPaymentScheduleItemRow = {
  id: string;
  developer_account_id: string;
  payment_plan_id: string;
  sale_id: string;
  label: string;
  due_date: string;
  expected_amount: number;
  amount_paid: number;
  status: DeveloperPaymentScheduleItemStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const DEVELOPER_PAYMENT_PLAN_SELECT = `
  id,
  developer_account_id,
  sale_id,
  payment_plan_mode,
  total_amount,
  schedule_start_date,
  status,
  notes,
  created_at,
  updated_at
`;

const DEVELOPER_PAYMENT_SCHEDULE_ITEM_SELECT = `
  id,
  developer_account_id,
  payment_plan_id,
  sale_id,
  label,
  due_date,
  expected_amount,
  amount_paid,
  status,
  sort_order,
  created_at,
  updated_at
`;

export async function getActiveDeveloperPaymentPlanForSale(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_plans")
    .select(DEVELOPER_PAYMENT_PLAN_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .eq("status", "active")
    .maybeSingle<DeveloperPaymentPlanRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPaymentScheduleItemById(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    scheduleItemId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_schedule_items")
    .select(DEVELOPER_PAYMENT_SCHEDULE_ITEM_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .eq("id", params.scheduleItemId)
    .maybeSingle<DeveloperPaymentScheduleItemRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listDeveloperPaymentScheduleItemsForSale(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_payment_schedule_items")
    .select(DEVELOPER_PAYMENT_SCHEDULE_ITEM_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("sale_id", params.saleId)
    .order("sort_order", { ascending: true })
    .order("due_date", { ascending: true })
    .returns<DeveloperPaymentScheduleItemRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperPaymentPlan(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    saleId: string;
    paymentPlanMode: DeveloperPaymentPlanMode;
    scheduleStartDate: string;
    notes: string | null;
    items: {
      label: string;
      due_date: string;
      expected_amount: number;
      sort_order: number;
    }[];
  },
) {
  const { data, error } = await supabase
    .rpc("create_developer_payment_plan", {
      p_developer_account_id: params.developerAccountId,
      p_sale_id: params.saleId,
      p_payment_plan_mode: params.paymentPlanMode,
      p_schedule_start_date: params.scheduleStartDate,
      p_notes: params.notes,
      p_items: params.items,
    })
    .single<DeveloperPaymentPlanRow>();

  if (error) {
    throw error;
  }

  return data;
}

export {
  DEVELOPER_PAYMENT_PLAN_SELECT,
  DEVELOPER_PAYMENT_SCHEDULE_ITEM_SELECT,
};
