import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperPlotStatus =
  | "available"
  | "reserved"
  | "active"
  | "sold"
  | "blocked";

export type DeveloperPlotTypeRow = {
  id: string;
  developer_account_id: string;
  estate_id: string;
  type_name: string;
  size_label: string;
  default_price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperPlotRow = {
  id: string;
  developer_account_id: string;
  estate_id: string;
  plot_type_id: string | null;
  plot_number: string;
  size_label: string;
  price: number;
  status: DeveloperPlotStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  developer_plot_types: {
    id: string;
    type_name: string;
    size_label: string;
    default_price: number;
  } | null;
};

const DEVELOPER_PLOT_TYPE_SELECT = `
  id,
  developer_account_id,
  estate_id,
  type_name,
  size_label,
  default_price,
  description,
  created_at,
  updated_at
`;

const DEVELOPER_PLOT_SELECT = `
  id,
  developer_account_id,
  estate_id,
  plot_type_id,
  plot_number,
  size_label,
  price,
  status,
  notes,
  created_at,
  updated_at,
  developer_plot_types (
    id,
    type_name,
    size_label,
    default_price
  )
`;

export async function listDeveloperPlotTypesForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_plot_types")
    .select(DEVELOPER_PLOT_TYPE_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .order("created_at", { ascending: false })
    .returns<DeveloperPlotTypeRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listDeveloperPlotsForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_plots")
    .select(DEVELOPER_PLOT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .order("plot_number", { ascending: true })
    .returns<DeveloperPlotRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listDeveloperPlotNumbersForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_plots")
    .select("plot_number")
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .returns<{ plot_number: string }[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getDeveloperPlotsByIdsForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotIds: string[];
  },
) {
  if (params.plotIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("developer_plots")
    .select("id, plot_number, status")
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .in("id", params.plotIds)
    .returns<
      {
        id: string;
        plot_number: string;
        status: DeveloperPlotStatus;
      }[]
    >();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAvailableDeveloperPlotsForEstate(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
  },
) {
  const { data, error } = await supabase
    .from("developer_plots")
    .select(DEVELOPER_PLOT_SELECT)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .eq("status", "available")
    .order("plot_number", { ascending: true })
    .returns<DeveloperPlotRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperPlotType(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    typeName: string;
    sizeLabel: string;
    defaultPrice: number;
    description: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_plot_types")
    .insert({
      developer_account_id: params.developerAccountId,
      estate_id: params.estateId,
      type_name: params.typeName,
      size_label: params.sizeLabel,
      default_price: params.defaultPrice,
      description: params.description,
    })
    .select(DEVELOPER_PLOT_TYPE_SELECT)
    .single<DeveloperPlotTypeRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperPlot(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotTypeId: string | null;
    plotNumber: string;
    sizeLabel: string;
    price: number;
    status: DeveloperPlotStatus;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .from("developer_plots")
    .insert({
      developer_account_id: params.developerAccountId,
      estate_id: params.estateId,
      plot_type_id: params.plotTypeId,
      plot_number: params.plotNumber,
      size_label: params.sizeLabel,
      price: params.price,
      status: params.status,
      notes: params.notes,
    })
    .select(DEVELOPER_PLOT_SELECT)
    .single<DeveloperPlotRow>();

  if (error) {
    throw error;
  }

  return data;
}

const DEVELOPER_PLOT_BULK_INSERT_BATCH_SIZE = 50;

export async function createDeveloperPlotsBulk(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plots: {
      plotNumber: string;
      sizeLabel: string;
      price: number;
      notes: string | null;
    }[];
  },
) {
  if (params.plots.length === 0) {
    return 0;
  }

  let insertedCount = 0;

  for (
    let index = 0;
    index < params.plots.length;
    index += DEVELOPER_PLOT_BULK_INSERT_BATCH_SIZE
  ) {
    const batch = params.plots.slice(
      index,
      index + DEVELOPER_PLOT_BULK_INSERT_BATCH_SIZE,
    );

    const { error } = await supabase.from("developer_plots").insert(
      batch.map((plot) => ({
        developer_account_id: params.developerAccountId,
        estate_id: params.estateId,
        plot_type_id: null,
        plot_number: plot.plotNumber,
        size_label: plot.sizeLabel,
        price: plot.price,
        status: "available",
        notes: plot.notes,
      })),
    );

    if (error) {
      throw error;
    }

    insertedCount += batch.length;
  }

  return insertedCount;
}

export async function updateDeveloperPlot(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotId: string;
    updates: {
      plotTypeId?: string | null;
      sizeLabel?: string;
      price?: number;
      status?: DeveloperPlotStatus;
      notes?: string | null;
    };
  },
) {
  const updatePayload: Record<string, string | number | null> = {};

  if ("plotTypeId" in params.updates) {
    updatePayload.plot_type_id = params.updates.plotTypeId ?? null;
  }

  if (params.updates.sizeLabel !== undefined) {
    updatePayload.size_label = params.updates.sizeLabel;
  }

  if (params.updates.price !== undefined) {
    updatePayload.price = params.updates.price;
  }

  if (params.updates.status !== undefined) {
    updatePayload.status = params.updates.status;
  }

  if ("notes" in params.updates) {
    updatePayload.notes = params.updates.notes ?? null;
  }

  const { data, error } = await supabase
    .from("developer_plots")
    .update(updatePayload)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .eq("id", params.plotId)
    .in("status", ["available", "blocked"])
    .select(DEVELOPER_PLOT_SELECT)
    .maybeSingle<DeveloperPlotRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDeveloperPlotsBulk(
  supabase: SupabaseClient,
  params: {
    developerAccountId: string;
    estateId: string;
    plotIds: string[];
    updates: {
      plotTypeId?: string | null;
      sizeLabel?: string;
      price?: number;
      status?: DeveloperPlotStatus;
      notes?: string | null;
    };
  },
) {
  if (params.plotIds.length === 0) {
    return 0;
  }

  const updatePayload: Record<string, string | number | null> = {};

  if ("plotTypeId" in params.updates) {
    updatePayload.plot_type_id = params.updates.plotTypeId ?? null;
  }

  if (params.updates.sizeLabel !== undefined) {
    updatePayload.size_label = params.updates.sizeLabel;
  }

  if (params.updates.price !== undefined) {
    updatePayload.price = params.updates.price;
  }

  if (params.updates.status !== undefined) {
    updatePayload.status = params.updates.status;
  }

  if ("notes" in params.updates) {
    updatePayload.notes = params.updates.notes ?? null;
  }

  const { data, error } = await supabase
    .from("developer_plots")
    .update(updatePayload)
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .in("id", params.plotIds)
    .in("status", ["available", "blocked"])
    .select("id")
    .returns<{ id: string }[]>();

  if (error) {
    throw error;
  }

  return data.length;
}

export { DEVELOPER_PLOT_SELECT, DEVELOPER_PLOT_TYPE_SELECT };
