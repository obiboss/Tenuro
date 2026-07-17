import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateLandlordStatementTotals,
  roundMoney,
} from "@/lib/manager-automation";
import type {
  ManagerMaintenancePriority,
  ManagerMaintenanceStatus,
  ManagerRemittanceStatus,
  ManagerRentPaymentStatus,
  ManagerTenantStatus,
  ManagerUnitStatus,
} from "@/constants/manager";

export const MANAGER_STATEMENT_DOCUMENTS_BUCKET =
  "manager-statement-documents";

export type ManagerStatementDocumentType =
  | "landlord_statement"
  | "remittance_summary"
  | "property_report";

export type ManagerStatementDocumentRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string | null;
  document_type: ManagerStatementDocumentType;
  idempotency_key: string;
  date_from: string | null;
  date_to: string | null;
  document_number: string;
  storage_bucket: typeof MANAGER_STATEMENT_DOCUMENTS_BUCKET;
  storage_path: string;
  file_name: string;
  generated_by_profile_id: string | null;
  generated_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ManagerStatementPaymentLine = {
  id: string;
  tenantName: string;
  propertyName: string;
  unitLabel: string;
  paymentDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountPaid: number;
  baseRentAmount: number;
  serviceChargeAmount: number;
  managerCommission: number;
  landlordShare: number;
  paymentReference: string | null;
  status: ManagerRentPaymentStatus;
};

export type ManagerStatementRemittanceLine = {
  id: string;
  remittanceDate: string;
  amountRemitted: number;
  reference: string | null;
  status: ManagerRemittanceStatus;
  notes: string | null;
};

export type ManagerLandlordStatementSnapshot = {
  organization: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  dateFrom: string | null;
  dateTo: string | null;
  generatedAt: string;
  payments: ManagerStatementPaymentLine[];
  remittances: ManagerStatementRemittanceLine[];
  totals: {
    totalRentRecorded: number;
    managerCommission: number;
    amountDueToLandlord: number;
    amountRemitted: number;
    pendingLandlordBalance: number;
    pendingConfirmationAmount: number;
  };
};

export type ManagerPropertyTenantPosition =
  | "paid_up"
  | "due_soon"
  | "owing"
  | "not_current";

export type ManagerPropertyReportTenantLine = {
  id: string;
  fullName: string;
  phoneNumber: string;
  unitLabel: string;
  unitStatus: ManagerUnitStatus;
  tenantStatus: ManagerTenantStatus;
  rentAmount: number;
  currentBalance: number;
  nextRentDueDate: string | null;
  rentPosition: ManagerPropertyTenantPosition;
};

export type ManagerPropertyReportMaintenanceLine = {
  id: string;
  unitLabel: string | null;
  tenantName: string | null;
  issueTitle: string;
  priority: ManagerMaintenancePriority;
  status: ManagerMaintenanceStatus;
  estimatedCost: number;
  actualCost: number;
  reportedDate: string;
  resolvedDate: string | null;
};

export type ManagerPropertyReportSnapshot = {
  organization: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
  property: {
    id: string;
    name: string;
    address: string;
    city: string | null;
    state: string | null;
    lga: string | null;
    status: string;
  };
  dateFrom: string | null;
  dateTo: string | null;
  generatedAt: string;
  occupancy: {
    totalUnits: number;
    occupiedUnits: number;
    reservedUnits: number;
    vacantUnits: number;
    inactiveUnits: number;
  };
  tenantPosition: {
    currentTenants: number;
    paidUpTenants: number;
    dueSoonTenants: number;
    owingTenants: number;
    outstandingBalance: number;
    currentListedRent: number;
  };
  payments: ManagerStatementPaymentLine[];
  tenants: ManagerPropertyReportTenantLine[];
  maintenance: ManagerPropertyReportMaintenanceLine[];
  totals: {
    totalReceived: number;
    baseRentReceived: number;
    serviceChargesReceived: number;
    managerCommission: number;
    landlordShare: number;
    pendingConfirmationAmount: number;
    openMaintenanceCount: number;
    estimatedOpenMaintenanceCost: number;
    actualMaintenanceCost: number;
  };
};

const MANAGER_STATEMENT_DOCUMENT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  document_type,
  idempotency_key,
  date_from,
  date_to,
  document_number,
  storage_bucket,
  storage_path,
  file_name,
  generated_by_profile_id,
  generated_at,
  metadata,
  created_at,
  updated_at
`;

function toRecord(value: unknown): Record<string, unknown> {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readText(
  row: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = row?.[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(row: Record<string, unknown>, key: string) {
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readRentPaymentStatus(
  row: Record<string, unknown>,
): ManagerRentPaymentStatus {
  const status = readText(row, "status");

  if (
    status === "recorded" ||
    status === "pending_confirmation" ||
    status === "verified" ||
    status === "rejected" ||
    status === "reversed"
  ) {
    return status;
  }

  return "pending_confirmation";
}

function readRemittanceStatus(
  row: Record<string, unknown>,
): ManagerRemittanceStatus {
  const status = readText(row, "status");

  if (
    status === "recorded" ||
    status === "pending_confirmation" ||
    status === "confirmed" ||
    status === "rejected" ||
    status === "reversed"
  ) {
    return status;
  }

  return "pending_confirmation";
}

function readUnitStatus(row: Record<string, unknown>): ManagerUnitStatus {
  const status = readText(row, "status");

  if (
    status === "vacant" ||
    status === "reserved" ||
    status === "occupied" ||
    status === "inactive"
  ) {
    return status;
  }

  return "inactive";
}

function readTenantStatus(
  row: Record<string, unknown>,
): ManagerTenantStatus {
  const status = readText(row, "status");

  if (
    status === "active" ||
    status === "inactive" ||
    status === "moved_out" ||
    status === "eviction_notice"
  ) {
    return status;
  }

  return "inactive";
}

function readMaintenancePriority(
  row: Record<string, unknown>,
): ManagerMaintenancePriority {
  const priority = readText(row, "priority");

  if (
    priority === "low" ||
    priority === "medium" ||
    priority === "high" ||
    priority === "urgent"
  ) {
    return priority;
  }

  return "medium";
}

function readMaintenanceStatus(
  row: Record<string, unknown>,
): ManagerMaintenanceStatus {
  const status = readText(row, "status");

  if (
    status === "reported" ||
    status === "in_progress" ||
    status === "resolved" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "reported";
}

function isCurrentTenantStatus(status: ManagerTenantStatus) {
  return status === "active" || status === "eviction_notice";
}

function isReliablePaymentStatus(status: ManagerRentPaymentStatus) {
  return status === "recorded" || status === "verified";
}

function getLagosDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDaysFromToday(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date(`${getLagosDate()}T00:00:00Z`);
  const target = new Date(`${value}T00:00:00Z`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (target.getTime() - today.getTime()) / millisecondsPerDay,
  );
}

function getTenantRentPosition(params: {
  tenantStatus: ManagerTenantStatus;
  currentBalance: number;
  nextRentDueDate: string | null;
}): ManagerPropertyTenantPosition {
  if (!isCurrentTenantStatus(params.tenantStatus)) {
    return "not_current";
  }

  if (params.currentBalance > 0) {
    return "owing";
  }

  const daysFromToday = getDaysFromToday(params.nextRentDueDate);

  if (daysFromToday !== null && daysFromToday < 0) {
    return "owing";
  }

  if (daysFromToday !== null && daysFromToday <= 30) {
    return "due_soon";
  }

  return "paid_up";
}

async function getScopedOrganization(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_organizations")
    .select(
      "id, organization_name, organization_phone, organization_email, status",
    )
    .eq("id", organizationId)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw error;
  }

  return data ? toRecord(data) : null;
}

async function getScopedLandlord(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_landlord_clients")
    .select(
      "id, organization_id, landlord_name, landlord_phone, landlord_email, status",
    )
    .eq("organization_id", params.organizationId)
    .eq("id", params.landlordClientId)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw error;
  }

  return data ? toRecord(data) : null;
}

async function getScopedProperty(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_properties")
    .select(
      "id, organization_id, landlord_client_id, property_name, property_address, city, state, lga, status",
    )
    .eq("organization_id", params.organizationId)
    .eq("id", params.propertyId)
    .maybeSingle<Record<string, unknown>>();

  if (error) {
    throw error;
  }

  return data ? toRecord(data) : null;
}

async function listPaymentRows(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId?: string;
    dateFrom: string | null;
    dateTo: string | null;
  },
) {
  let query = supabase
    .from("manager_rent_payments")
    .select(
      "id, organization_id, landlord_client_id, property_id, unit_id, tenant_id, payment_date, period_start, period_end, amount_paid, base_rent_amount, service_charge_amount, management_fee_amount, landlord_net_amount, payment_reference, status, created_at",
    )
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .order("payment_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  if (params.dateFrom) {
    query = query.gte("payment_date", params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte("payment_date", params.dateTo);
  }

  const { data, error } = await query
    .limit(500)
    .returns<Record<string, unknown>[]>();

  if (error) {
    throw error;
  }

  return data.map(toRecord);
}

async function listRemittanceRows(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    dateFrom: string | null;
    dateTo: string | null;
  },
) {
  let query = supabase
    .from("manager_landlord_remittances")
    .select(
      "id, organization_id, landlord_client_id, amount_remitted, remittance_date, payment_reference, status, notes, created_at",
    )
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .order("remittance_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (params.dateFrom) {
    query = query.gte("remittance_date", params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte("remittance_date", params.dateTo);
  }

  const { data, error } = await query
    .limit(500)
    .returns<Record<string, unknown>[]>();

  if (error) {
    throw error;
  }

  return data.map(toRecord);
}

async function getRelatedNames(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    paymentRows: Record<string, unknown>[];
  },
) {
  const tenantIds = Array.from(
    new Set(
      params.paymentRows
        .map((row) => readText(row, "tenant_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const propertyIds = Array.from(
    new Set(
      params.paymentRows
        .map((row) => readText(row, "property_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const unitIds = Array.from(
    new Set(
      params.paymentRows
        .map((row) => readText(row, "unit_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [tenantsResult, propertiesResult, unitsResult] =
    await Promise.all([
      tenantIds.length > 0
        ? supabase
            .from("manager_tenants")
            .select("id, full_name")
            .eq("organization_id", params.organizationId)
            .in("id", tenantIds)
            .returns<Record<string, unknown>[]>()
        : Promise.resolve({ data: [], error: null }),
      propertyIds.length > 0
        ? supabase
            .from("manager_properties")
            .select("id, property_name")
            .eq("organization_id", params.organizationId)
            .in("id", propertyIds)
            .returns<Record<string, unknown>[]>()
        : Promise.resolve({ data: [], error: null }),
      unitIds.length > 0
        ? supabase
            .from("manager_units")
            .select("id, unit_label")
            .eq("organization_id", params.organizationId)
            .in("id", unitIds)
            .returns<Record<string, unknown>[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (tenantsResult.error) {
    throw tenantsResult.error;
  }

  if (propertiesResult.error) {
    throw propertiesResult.error;
  }

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  return {
    tenantNameById: new Map(
      (tenantsResult.data ?? []).map((row) => {
        const record = toRecord(row);

        return [
          readText(record, "id") ?? "",
          readText(record, "full_name") ?? "",
        ];
      }),
    ),
    propertyNameById: new Map(
      (propertiesResult.data ?? []).map((row) => {
        const record = toRecord(row);

        return [
          readText(record, "id") ?? "",
          readText(record, "property_name") ?? "",
        ];
      }),
    ),
    unitLabelById: new Map(
      (unitsResult.data ?? []).map((row) => {
        const record = toRecord(row);

        return [
          readText(record, "id") ?? "",
          readText(record, "unit_label") ?? "",
        ];
      }),
    ),
  };
}

function mapPaymentLines(params: {
  paymentRows: Record<string, unknown>[];
  tenantNameById: Map<string, string>;
  propertyNameById: Map<string, string>;
  unitLabelById: Map<string, string>;
}) {
  return params.paymentRows.map(
    (payment): ManagerStatementPaymentLine => {
      const tenantId = readText(payment, "tenant_id") ?? "";
      const propertyId = readText(payment, "property_id") ?? "";
      const unitId = readText(payment, "unit_id") ?? "";

      return {
        id: readText(payment, "id") ?? "",
        tenantName:
          params.tenantNameById.get(tenantId) || "Tenant",
        propertyName:
          params.propertyNameById.get(propertyId) || "Property",
        unitLabel: params.unitLabelById.get(unitId) || "Unit",
        paymentDate:
          readText(payment, "payment_date") ??
          readText(payment, "created_at") ??
          new Date().toISOString(),
        periodStart: readText(payment, "period_start"),
        periodEnd: readText(payment, "period_end"),
        amountPaid: readNumber(payment, "amount_paid"),
        baseRentAmount: readNumber(payment, "base_rent_amount"),
        serviceChargeAmount: readNumber(
          payment,
          "service_charge_amount",
        ),
        managerCommission: readNumber(
          payment,
          "management_fee_amount",
        ),
        landlordShare: readNumber(payment, "landlord_net_amount"),
        paymentReference: readText(
          payment,
          "payment_reference",
        ),
        status: readRentPaymentStatus(payment),
      };
    },
  );
}

export async function getManagerLandlordStatementSnapshot(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    dateFrom: string | null;
    dateTo: string | null;
  },
): Promise<ManagerLandlordStatementSnapshot | null> {
  const [organization, landlord, paymentRows, remittanceRows] =
    await Promise.all([
      getScopedOrganization(supabase, params.organizationId),
      getScopedLandlord(supabase, params),
      listPaymentRows(supabase, params),
      listRemittanceRows(supabase, params),
    ]);

  if (!organization || !landlord) {
    return null;
  }

  const names = await getRelatedNames({
    supabase,
    organizationId: params.organizationId,
    paymentRows,
  });

  const payments = mapPaymentLines({
    paymentRows,
    ...names,
  });

  const remittances: ManagerStatementRemittanceLine[] =
    remittanceRows.map((remittance) => ({
      id: readText(remittance, "id") ?? "",
      remittanceDate:
        readText(remittance, "remittance_date") ??
        readText(remittance, "created_at") ??
        new Date().toISOString(),
      amountRemitted: readNumber(remittance, "amount_remitted"),
      reference: readText(remittance, "payment_reference"),
      status: readRemittanceStatus(remittance),
      notes: readText(remittance, "notes"),
    }));

  const totals = calculateLandlordStatementTotals({
    payments: payments.map((payment) => ({
      status: payment.status,
      amountPaid: payment.amountPaid,
      managerCommission: payment.managerCommission,
      landlordShare: payment.landlordShare,
    })),
    remittances: remittances.map((remittance) => ({
      status: remittance.status,
      amountRemitted: remittance.amountRemitted,
    })),
  });

  return {
    organization: {
      id: params.organizationId,
      name:
        readText(organization, "organization_name") ??
        "Property Manager",
      phone: readText(organization, "organization_phone"),
      email: readText(organization, "organization_email"),
    },
    landlord: {
      id: params.landlordClientId,
      name: readText(landlord, "landlord_name") ?? "Landlord",
      phone: readText(landlord, "landlord_phone"),
      email: readText(landlord, "landlord_email"),
    },
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    generatedAt: new Date().toISOString(),
    payments,
    remittances,
    totals,
  };
}

export async function getManagerPropertyReportSnapshot(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId: string;
    dateFrom: string | null;
    dateTo: string | null;
  },
): Promise<ManagerPropertyReportSnapshot | null> {
  const property = await getScopedProperty(supabase, params);

  if (!property) {
    return null;
  }

  const landlordClientId = readText(
    property,
    "landlord_client_id",
  );

  if (!landlordClientId) {
    return null;
  }

  const [
    organization,
    landlord,
    paymentRows,
    unitsResult,
    tenantsResult,
    maintenanceResult,
  ] = await Promise.all([
    getScopedOrganization(supabase, params.organizationId),
    getScopedLandlord(supabase, {
      organizationId: params.organizationId,
      landlordClientId,
    }),
    listPaymentRows(supabase, {
      organizationId: params.organizationId,
      landlordClientId,
      propertyId: params.propertyId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    supabase
      .from("manager_units")
      .select(
        "id, organization_id, property_id, unit_label, unit_type, rent_amount, status",
      )
      .eq("organization_id", params.organizationId)
      .eq("property_id", params.propertyId)
      .order("unit_label", { ascending: true })
      .returns<Record<string, unknown>[]>(),
    supabase
      .from("manager_tenants")
      .select(
        "id, organization_id, property_id, unit_id, full_name, phone_number, rent_amount, current_balance, next_rent_due_date, status",
      )
      .eq("organization_id", params.organizationId)
      .eq("property_id", params.propertyId)
      .order("full_name", { ascending: true })
      .returns<Record<string, unknown>[]>(),
    (() => {
      let query = supabase
        .from("manager_maintenance_requests")
        .select(
          "id, organization_id, property_id, unit_id, tenant_id, issue_title, priority, status, estimated_cost, actual_cost, reported_date, resolved_date",
        )
        .eq("organization_id", params.organizationId)
        .eq("property_id", params.propertyId)
        .order("reported_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (params.dateFrom) {
        query = query.gte("reported_date", params.dateFrom);
      }

      if (params.dateTo) {
        query = query.lte("reported_date", params.dateTo);
      }

      return query.limit(200).returns<Record<string, unknown>[]>();
    })(),
  ]);

  if (!organization || !landlord) {
    return null;
  }

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  if (tenantsResult.error) {
    throw tenantsResult.error;
  }

  if (maintenanceResult.error) {
    throw maintenanceResult.error;
  }

  const unitRows = (unitsResult.data ?? []).map(toRecord);
  const tenantRows = (tenantsResult.data ?? []).map(toRecord);
  const maintenanceRows = (maintenanceResult.data ?? []).map(toRecord);

  const unitLabelById = new Map(
    unitRows.map((unit) => [
      readText(unit, "id") ?? "",
      readText(unit, "unit_label") ?? "Unit",
    ]),
  );
  const unitStatusById = new Map(
    unitRows.map((unit) => [
      readText(unit, "id") ?? "",
      readUnitStatus(unit),
    ]),
  );
  const tenantNameById = new Map(
    tenantRows.map((tenant) => [
      readText(tenant, "id") ?? "",
      readText(tenant, "full_name") ?? "Tenant",
    ]),
  );

  const propertyName =
    readText(property, "property_name") ?? "Property";

  const paymentNames = await getRelatedNames({
    supabase,
    organizationId: params.organizationId,
    paymentRows,
  });

  paymentNames.propertyNameById.set(
    params.propertyId,
    propertyName,
  );

  const payments = mapPaymentLines({
    paymentRows,
    ...paymentNames,
  });

  const tenants = tenantRows
    .map((tenant): ManagerPropertyReportTenantLine => {
      const unitId = readText(tenant, "unit_id") ?? "";
      const tenantStatus = readTenantStatus(tenant);
      const currentBalance = readNumber(
        tenant,
        "current_balance",
      );
      const nextRentDueDate = readText(
        tenant,
        "next_rent_due_date",
      );

      return {
        id: readText(tenant, "id") ?? "",
        fullName:
          readText(tenant, "full_name") ?? "Tenant",
        phoneNumber:
          readText(tenant, "phone_number") ?? "Not provided",
        unitLabel:
          unitLabelById.get(unitId) ?? "Unit",
        unitStatus:
          unitStatusById.get(unitId) ?? "inactive",
        tenantStatus,
        rentAmount: readNumber(tenant, "rent_amount"),
        currentBalance,
        nextRentDueDate,
        rentPosition: getTenantRentPosition({
          tenantStatus,
          currentBalance,
          nextRentDueDate,
        }),
      };
    })
    .filter((tenant) => isCurrentTenantStatus(tenant.tenantStatus));

  const maintenance = maintenanceRows.map(
    (
      item,
    ): ManagerPropertyReportMaintenanceLine => {
      const unitId = readText(item, "unit_id");
      const tenantId = readText(item, "tenant_id");

      return {
        id: readText(item, "id") ?? "",
        unitLabel: unitId
          ? unitLabelById.get(unitId) ?? "Unit"
          : null,
        tenantName: tenantId
          ? tenantNameById.get(tenantId) ?? "Tenant"
          : null,
        issueTitle:
          readText(item, "issue_title") ??
          "Maintenance issue",
        priority: readMaintenancePriority(item),
        status: readMaintenanceStatus(item),
        estimatedCost: readNumber(item, "estimated_cost"),
        actualCost: readNumber(item, "actual_cost"),
        reportedDate:
          readText(item, "reported_date") ??
          readText(item, "created_at") ??
          new Date().toISOString(),
        resolvedDate: readText(item, "resolved_date"),
      };
    },
  );

  const reliablePayments = payments.filter((payment) =>
    isReliablePaymentStatus(payment.status),
  );
  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending_confirmation",
  );
  const openMaintenance = maintenance.filter(
    (item) =>
      item.status === "reported" ||
      item.status === "in_progress",
  );

  return {
    organization: {
      id: params.organizationId,
      name:
        readText(organization, "organization_name") ??
        "Property Manager",
      phone: readText(organization, "organization_phone"),
      email: readText(organization, "organization_email"),
    },
    landlord: {
      id: landlordClientId,
      name:
        readText(landlord, "landlord_name") ?? "Landlord",
      phone: readText(landlord, "landlord_phone"),
      email: readText(landlord, "landlord_email"),
    },
    property: {
      id: params.propertyId,
      name: propertyName,
      address:
        readText(property, "property_address") ??
        "Address not provided",
      city: readText(property, "city"),
      state: readText(property, "state"),
      lga: readText(property, "lga"),
      status: readText(property, "status") ?? "active",
    },
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    generatedAt: new Date().toISOString(),
    occupancy: {
      totalUnits: unitRows.length,
      occupiedUnits: unitRows.filter(
        (unit) => readUnitStatus(unit) === "occupied",
      ).length,
      reservedUnits: unitRows.filter(
        (unit) => readUnitStatus(unit) === "reserved",
      ).length,
      vacantUnits: unitRows.filter(
        (unit) => readUnitStatus(unit) === "vacant",
      ).length,
      inactiveUnits: unitRows.filter(
        (unit) => readUnitStatus(unit) === "inactive",
      ).length,
    },
    tenantPosition: {
      currentTenants: tenants.length,
      paidUpTenants: tenants.filter(
        (tenant) => tenant.rentPosition === "paid_up",
      ).length,
      dueSoonTenants: tenants.filter(
        (tenant) => tenant.rentPosition === "due_soon",
      ).length,
      owingTenants: tenants.filter(
        (tenant) => tenant.rentPosition === "owing",
      ).length,
      outstandingBalance: roundMoney(
        tenants.reduce(
          (total, tenant) =>
            total + Math.max(0, tenant.currentBalance),
          0,
        ),
      ),
      currentListedRent: roundMoney(
        tenants.reduce(
          (total, tenant) => total + tenant.rentAmount,
          0,
        ),
      ),
    },
    payments,
    tenants,
    maintenance,
    totals: {
      totalReceived: roundMoney(
        reliablePayments.reduce(
          (total, payment) => total + payment.amountPaid,
          0,
        ),
      ),
      baseRentReceived: roundMoney(
        reliablePayments.reduce(
          (total, payment) =>
            total + payment.baseRentAmount,
          0,
        ),
      ),
      serviceChargesReceived: roundMoney(
        reliablePayments.reduce(
          (total, payment) =>
            total + payment.serviceChargeAmount,
          0,
        ),
      ),
      managerCommission: roundMoney(
        reliablePayments.reduce(
          (total, payment) =>
            total + payment.managerCommission,
          0,
        ),
      ),
      landlordShare: roundMoney(
        reliablePayments.reduce(
          (total, payment) =>
            total + payment.landlordShare,
          0,
        ),
      ),
      pendingConfirmationAmount: roundMoney(
        pendingPayments.reduce(
          (total, payment) => total + payment.amountPaid,
          0,
        ),
      ),
      openMaintenanceCount: openMaintenance.length,
      estimatedOpenMaintenanceCost: roundMoney(
        openMaintenance.reduce(
          (total, item) => total + item.estimatedCost,
          0,
        ),
      ),
      actualMaintenanceCost: roundMoney(
        maintenance.reduce(
          (total, item) => total + item.actualCost,
          0,
        ),
      ),
    },
  };
}

export async function upsertManagerStatementDocument(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string | null;
    documentType: ManagerStatementDocumentType;
    idempotencyKey: string;
    dateFrom: string | null;
    dateTo: string | null;
    documentNumber: string;
    storagePath: string;
    fileName: string;
    generatedByProfileId: string;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_statement_documents")
    .upsert(
      {
        organization_id: params.organizationId,
        landlord_client_id: params.landlordClientId,
        property_id: params.propertyId,
        document_type: params.documentType,
        idempotency_key: params.idempotencyKey,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        document_number: params.documentNumber,
        storage_bucket: MANAGER_STATEMENT_DOCUMENTS_BUCKET,
        storage_path: params.storagePath,
        file_name: params.fileName,
        generated_by_profile_id:
          params.generatedByProfileId,
        generated_at: new Date().toISOString(),
        metadata: params.metadata,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "idempotency_key",
      },
    )
    .select(MANAGER_STATEMENT_DOCUMENT_SELECT)
    .single<ManagerStatementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerStatementDocuments(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId?: string;
    documentType?: ManagerStatementDocumentType;
    limit?: number;
  },
) {
  const safeLimit = Math.min(
    Math.max(params.limit ?? 20, 1),
    100,
  );

  let query = supabase
    .from("manager_statement_documents")
    .select(MANAGER_STATEMENT_DOCUMENT_SELECT)
    .eq("organization_id", params.organizationId)
    .order("generated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  if (params.documentType) {
    query = query.eq("document_type", params.documentType);
  }

  const { data, error } = await query.returns<
    ManagerStatementDocumentRow[]
  >();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerStatementDocumentById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    documentId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_statement_documents")
    .select(MANAGER_STATEMENT_DOCUMENT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("id", params.documentId)
    .maybeSingle<ManagerStatementDocumentRow>();

  if (error) {
    throw error;
  }

  return data;
}
