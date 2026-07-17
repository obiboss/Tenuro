import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperPlotAssignmentStatus =
  | "reserved"
  | "active"
  | "cancelled"
  | "converted_to_sale";

export type DeveloperPlotAssignmentRow = {
  id: string;
  developer_account_id: string;
  estate_id: string;
  plot_id: string;
  buyer_id: string;
  status: DeveloperPlotAssignmentStatus;
  assignment_note: string | null;
  assigned_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperPlotAssignmentWithDetails = DeveloperPlotAssignmentRow & {
  developer_buyers: {
    id: string;
    full_name: string;
    phone_number: string;
    status: string;
  } | null;
  developer_plots: {
    id: string;
    plot_number: string;
    size_label: string;
    price: number;
    status: string;
  } | null;
};

const DEVELOPER_PLOT_ASSIGNMENT_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  status,
  assignment_note,
  assigned_at,
  cancelled_at,
  created_at,
  updated_at
`;

const DEVELOPER_PLOT_ASSIGNMENT_DETAILS_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_id,
  buyer_id,
  status,
  assignment_note,
  assigned_at,
  cancelled_at,
  created_at,
  updated_at,
  developer_buyers (
    id,
    full_name,
    phone_number,
    status
  ),
  developer_plots (
    id,
    plot_number,
    size_label,
    price,
    status
  )
`;

export async function listDeveloperPlotAssignmentsForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_plot_assignments")
    .select(DEVELOPER_PLOT_ASSIGNMENT_DETAILS_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .in("status", ["reserved", "active"])
    .order("assigned_at", { ascending: false })
    .returns<DeveloperPlotAssignmentWithDetails[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listReservedDeveloperPlotAssignments(
  supabase: SupabaseClient,
  developerAccountId: string,
) {
  const { data, error } = await supabase
    .from("developer_plot_assignments")
    .select(DEVELOPER_PLOT_ASSIGNMENT_DETAILS_SELECT)
    .eq("developer_account_id", developerAccountId)
    .eq("status", "reserved")
    .order("assigned_at", { ascending: false })
    .returns<DeveloperPlotAssignmentWithDetails[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function assignDeveloperBuyerToPlot(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotId: string;
    buyerId: string;
    assignmentNote: string | null;
  },
) {
  const { data, error } = await supabase
    .rpc("create_developer_plot_assignment", {
      p_developer_account_id: params.developerAccountId,
      p_estate_id: params.estateId,
      p_plot_id: params.plotId,
      p_buyer_id: params.buyerId,
      p_assignment_note: params.assignmentNote,
    })
    .single<DeveloperPlotAssignmentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export { DEVELOPER_PLOT_ASSIGNMENT_SELECT };
