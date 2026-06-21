import type { SupabaseClient } from "@supabase/supabase-js";
import type { LandSizeUnit } from "@/lib/developer/land-capacity";

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

export type DeveloperEstatePaymentPlanMode = "outright" | "fixed_installment";

export type DeveloperEstateInstallmentInterval = "monthly";

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
  initial_payment_percentage: number;
  balance_spread_months: number;
  installment_interval: DeveloperEstateInstallmentInterval;
  default_payment_plan_mode: DeveloperEstatePaymentPlanMode;
  land_size_value: number | null;
  land_size_unit: LandSizeUnit | null;
  gross_land_size_sqm: number | null;
  reserved_land_percentage: number | null;
  usable_land_size_sqm: number | null;
  default_plot_size_sqm: number | null;
  planned_plot_count: number | null;
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
  initial_payment_percentage,
  balance_spread_months,
  installment_interval,
  default_payment_plan_mode,
  land_size_value,
  land_size_unit,
  gross_land_size_sqm,
  reserved_land_percentage,
  usable_land_size_sqm,
  default_plot_size_sqm,
  planned_plot_count,
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
  initial_payment_percentage,
  balance_spread_months,
  installment_interval,
  default_payment_plan_mode,
  land_size_value,
  land_size_unit,
  gross_land_size_sqm,
  reserved_land_percentage,
  usable_land_size_sqm,
  default_plot_size_sqm,
  planned_plot_count,
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
    initialPaymentPercentage: number;
    balanceSpreadMonths: number;
    installmentInterval: DeveloperEstateInstallmentInterval;
    defaultPaymentPlanMode: DeveloperEstatePaymentPlanMode;
    landSizeValue: number;
    landSizeUnit: LandSizeUnit;
    grossLandSizeSqm: number;
    reservedLandPercentage: number;
    usableLandSizeSqm: number;
    defaultPlotSizeSqm: number;
    plannedPlotCount: number;
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
      initial_payment_percentage: params.initialPaymentPercentage,
      balance_spread_months: params.balanceSpreadMonths,
      installment_interval: params.installmentInterval,
      default_payment_plan_mode: params.defaultPaymentPlanMode,
      land_size_value: params.landSizeValue,
      land_size_unit: params.landSizeUnit,
      gross_land_size_sqm: params.grossLandSizeSqm,
      reserved_land_percentage: params.reservedLandPercentage,
      usable_land_size_sqm: params.usableLandSizeSqm,
      default_plot_size_sqm: params.defaultPlotSizeSqm,
      planned_plot_count: params.plannedPlotCount,
    })
    .select(DEVELOPER_ESTATE_SELECT)
    .single<DeveloperEstateRow>();

  if (error) {
    throw error;
  }

  return data;
}
