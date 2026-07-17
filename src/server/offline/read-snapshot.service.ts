import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";
import type {
  OfflineReadEntity,
  OfflineReadMode,
  OfflineReadResponse,
} from "@/lib/offline/read-sync.types";
import type {
  OfflineEntityPayload,
  OfflineEntityType,
} from "@/lib/offline/types";
import {
  getDeveloperAccountByOwnerProfileId,
  getDeveloperAccountByProfileId,
} from "@/server/repositories/developer.repository";
import {
  getManagerOrganizationAccessForCurrentUser,
} from "@/server/repositories/manager.repository";
import {
  getSessionUser,
} from "@/server/services/auth.service";
import {
  createSupabaseAdminClient,
} from "@/server/supabase/admin";
import {
  createSupabaseServerClient,
} from "@/server/supabase/server";

const PAGE_SIZE = 500;
const MAX_PAGES = 100;

type ReadSnapshotOptions = {
  cursor: string | null;
  forceFull: boolean;
};

type PageResult<T> = {
  data: T[] | null;
  error: {
    message: string;
  } | null;
};

type ManagerPropertyOfflineRow = {
  id: string;
  landlord_client_id: string;
  property_name: string;
  property_address: string;
  city: string | null;
  state: string | null;
  lga: string | null;
  status: string;
  existing_tenant_setup_required: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ManagerUnitOfflineRow = {
  id: string;
  property_id: string;
  unit_label: string;
  unit_type: string | null;
  rent_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type ManagerTenantOfflineRow = {
  id: string;
  property_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  occupation: string | null;
  rent_amount: number;
  current_balance: number;
  move_in_date: string | null;
  next_rent_due_date: string | null;
  move_out_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ManagerMaintenanceOfflineRow = {
  id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  issue_title: string;
  issue_description: string | null;
  priority: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  vendor_name: string | null;
  reported_date: string;
  resolved_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DeveloperEstateOfflineRow = {
  id: string;
  estate_name: string;
  location: string;
  city: string | null;
  state: string | null;
  lga: string | null;
  status: string;
  description: string | null;
  initial_payment_percentage: number;
  balance_spread_months: number;
  land_size_value: number | null;
  land_size_unit: string | null;
  default_plot_size_sqm: number | null;
  planned_plot_count: number | null;
  created_at: string;
  updated_at: string;
};

type DeveloperPlotOfflineRow = {
  id: string;
  estate_id: string;
  plot_number: string;
  size_label: string;
  price: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DeveloperBuyerOfflineRow = {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type DeveloperSaleOfflineRow = {
  id: string;
  estate_id: string;
  plot_id: string;
  buyer_id: string;
  sale_reference: string;
  payment_plan_mode: string;
  total_price_locked: number;
  initial_deposit_amount: number;
  sale_date: string;
  expected_completion_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function isValidCursor(
  value: string | null,
) {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);

  return (
    Number.isFinite(parsed) &&
    parsed > 0 &&
    parsed <= Date.now()
  );
}

function getReadMode(
  options: ReadSnapshotOptions,
): {
  mode: OfflineReadMode;
  cursor: string | null;
} {
  if (
    options.forceFull ||
    !isValidCursor(options.cursor)
  ) {
    return {
      mode: "full",
      cursor: null,
    };
  }

  return {
    mode: "delta",
    cursor: options.cursor,
  };
}

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<PageResult<T>>,
) {
  const rows: T[] = [];

  for (
    let pageIndex = 0;
    pageIndex < MAX_PAGES;
    pageIndex += 1
  ) {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const result = await fetchPage(from, to);

    if (result.error) {
      throw new Error(result.error.message);
    }

    const page = result.data ?? [];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }

  throw new Error(
    "Offline read limit exceeded for this workspace.",
  );
}

function toOfflineEntity<T extends {
  id: string;
  updated_at: string;
}>(
  entityType: OfflineEntityType,
  row: T,
): OfflineReadEntity {
  const serverRevision =
    Date.parse(row.updated_at) || 0;

  return {
    entityType,
    entityId: row.id,
    serverRevision,
    updatedAt: row.updated_at,
    deletedAt: null,
    data: row as unknown as OfflineEntityPayload,
  };
}

async function loadManagerSnapshot(params: {
  supabase: SupabaseClient;
  organizationId: string;
  cursor: string | null;
  generatedAt: string;
}) {
  const [
    properties,
    units,
    tenants,
    maintenanceRequests,
  ] = await Promise.all([
    fetchAllPages<ManagerPropertyOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("manager_properties")
          .select(`
            id,
            landlord_client_id,
            property_name,
            property_address,
            city,
            state,
            lga,
            status,
            existing_tenant_setup_required,
            notes,
            created_at,
            updated_at
          `)
          .eq(
            "organization_id",
            params.organizationId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            ManagerPropertyOfflineRow[]
          >();
      },
    ),
    fetchAllPages<ManagerUnitOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("manager_units")
          .select(`
            id,
            property_id,
            unit_label,
            unit_type,
            rent_amount,
            status,
            created_at,
            updated_at
          `)
          .eq(
            "organization_id",
            params.organizationId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<ManagerUnitOfflineRow[]>();
      },
    ),
    fetchAllPages<ManagerTenantOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("manager_tenants")
          .select(`
            id,
            property_id,
            unit_id,
            full_name,
            phone_number,
            email,
            occupation,
            rent_amount,
            current_balance,
            move_in_date,
            next_rent_due_date,
            move_out_date,
            status,
            notes,
            created_at,
            updated_at
          `)
          .eq(
            "organization_id",
            params.organizationId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            ManagerTenantOfflineRow[]
          >();
      },
    ),
    fetchAllPages<ManagerMaintenanceOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from(
            "manager_maintenance_requests",
          )
          .select(`
            id,
            property_id,
            unit_id,
            tenant_id,
            issue_title,
            issue_description,
            priority,
            status,
            estimated_cost,
            actual_cost,
            vendor_name,
            reported_date,
            resolved_date,
            notes,
            created_at,
            updated_at
          `)
          .eq(
            "organization_id",
            params.organizationId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            ManagerMaintenanceOfflineRow[]
          >();
      },
    ),
  ]);

  return [
    ...properties.map((row) =>
      toOfflineEntity(
        "manager_property",
        row,
      ),
    ),
    ...units.map((row) =>
      toOfflineEntity("manager_unit", row),
    ),
    ...tenants.map((row) =>
      toOfflineEntity("manager_tenant", row),
    ),
    ...maintenanceRequests.map((row) =>
      toOfflineEntity(
        "manager_maintenance_request",
        row,
      ),
    ),
  ];
}

async function loadDeveloperSnapshot(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  cursor: string | null;
  generatedAt: string;
}) {
  const [
    estates,
    plots,
    buyers,
    sales,
  ] = await Promise.all([
    fetchAllPages<DeveloperEstateOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("developer_estates")
          .select(`
            id,
            estate_name,
            location,
            city,
            state,
            lga,
            status,
            description,
            initial_payment_percentage,
            balance_spread_months,
            land_size_value,
            land_size_unit,
            default_plot_size_sqm,
            planned_plot_count,
            created_at,
            updated_at
          `)
          .eq(
            "developer_account_id",
            params.developerAccountId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            DeveloperEstateOfflineRow[]
          >();
      },
    ),
    fetchAllPages<DeveloperPlotOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("developer_plots")
          .select(`
            id,
            estate_id,
            plot_number,
            size_label,
            price,
            status,
            notes,
            created_at,
            updated_at
          `)
          .eq(
            "developer_account_id",
            params.developerAccountId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            DeveloperPlotOfflineRow[]
          >();
      },
    ),
    fetchAllPages<DeveloperBuyerOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("developer_buyers")
          .select(`
            id,
            full_name,
            phone_number,
            email,
            status,
            created_at,
            updated_at
          `)
          .eq(
            "developer_account_id",
            params.developerAccountId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            DeveloperBuyerOfflineRow[]
          >();
      },
    ),
    fetchAllPages<DeveloperSaleOfflineRow>(
      async (from, to) => {
        let query = params.supabase
          .from("developer_sales")
          .select(`
            id,
            estate_id,
            plot_id,
            buyer_id,
            sale_reference,
            payment_plan_mode,
            total_price_locked,
            initial_deposit_amount,
            sale_date,
            expected_completion_date,
            status,
            created_at,
            updated_at
          `)
          .eq(
            "developer_account_id",
            params.developerAccountId,
          )
          .lte("updated_at", params.generatedAt);

        if (params.cursor) {
          query = query.gt(
            "updated_at",
            params.cursor,
          );
        }

        return query
          .order("updated_at", {
            ascending: true,
          })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<
            DeveloperSaleOfflineRow[]
          >();
      },
    ),
  ]);

  return [
    ...estates.map((row) =>
      toOfflineEntity(
        "developer_estate",
        row,
      ),
    ),
    ...plots.map((row) =>
      toOfflineEntity("developer_plot", row),
    ),
    ...buyers.map((row) =>
      toOfflineEntity("developer_buyer", row),
    ),
    ...sales.map((row) =>
      toOfflineEntity("developer_sale", row),
    ),
  ];
}

export async function getOfflineReadSnapshot(
  options: ReadSnapshotOptions,
): Promise<OfflineReadResponse | null> {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const {
    mode,
    cursor,
  } = getReadMode(options);
  const generatedAt = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  if (user.role === "manager") {
    const serverSupabase =
      await createSupabaseServerClient();
    const access =
      await getManagerOrganizationAccessForCurrentUser(
        serverSupabase,
        user.id,
      );

    if (
      !access ||
      access.organization.status !== "active"
    ) {
      return null;
    }

    const entities = await loadManagerSnapshot({
      supabase: admin,
      organizationId:
        access.organization.id,
      cursor,
      generatedAt,
    });

    return {
      ownerProfileId: user.id,
      workspaceType: "manager",
      workspaceId:
        access.organization.id,
      workspaceName:
        access.organization.organization_name,
      mode,
      cursor: generatedAt,
      generatedAt,
      entities,
    };
  }

  if (user.role === "developer") {
    const profileAccess =
      await getDeveloperAccountByProfileId(
        admin,
        user.id,
      );
    const ownerAccount =
      profileAccess?.account ??
      (await getDeveloperAccountByOwnerProfileId(
        admin,
        user.id,
      ));

    if (
      !ownerAccount ||
      ownerAccount.status !== "active"
    ) {
      return null;
    }

    const entities =
      await loadDeveloperSnapshot({
        supabase: admin,
        developerAccountId:
          ownerAccount.id,
        cursor,
        generatedAt,
      });

    return {
      ownerProfileId: user.id,
      workspaceType: "developer",
      workspaceId: ownerAccount.id,
      workspaceName:
        ownerAccount.company_name,
      mode,
      cursor: generatedAt,
      generatedAt,
      entities,
    };
  }

  return null;
}
