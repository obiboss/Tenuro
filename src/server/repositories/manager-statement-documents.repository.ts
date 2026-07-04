import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLandlordStatementTotals } from "@/lib/manager-automation";
import type {
  ManagerRemittanceStatus,
  ManagerRentPaymentStatus,
} from "@/constants/manager";

export const MANAGER_STATEMENT_DOCUMENTS_BUCKET = "manager-statement-documents";

export type ManagerStatementDocumentType =
  | "landlord_statement"
  | "remittance_summary";

export type ManagerStatementDocumentRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
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

const MANAGER_STATEMENT_DOCUMENT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
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
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
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

async function getRecordById(
  supabase: SupabaseClient,
  table: string,
  id: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
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
    dateFrom: string | null;
    dateTo: string | null;
  },
) {
  let query = supabase
    .from("manager_rent_payments")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .order("payment_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (params.dateFrom) {
    query = query.gte("payment_date", params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte("payment_date", params.dateTo);
  }

  const { data, error } = await query.returns<Record<string, unknown>[]>();

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
    .select("*")
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

  const { data, error } = await query.returns<Record<string, unknown>[]>();

  if (error) {
    throw error;
  }

  return data.map(toRecord);
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
      getRecordById(supabase, "manager_organizations", params.organizationId),
      getRecordById(
        supabase,
        "manager_landlord_clients",
        params.landlordClientId,
      ),
      listPaymentRows(supabase, params),
      listRemittanceRows(supabase, params),
    ]);

  if (!organization || !landlord) {
    return null;
  }

  const tenantIds = Array.from(
    new Set(
      paymentRows
        .map((row) => readText(row, "tenant_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const propertyIds = Array.from(
    new Set(
      paymentRows
        .map((row) => readText(row, "property_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const unitIds = Array.from(
    new Set(
      paymentRows
        .map((row) => readText(row, "unit_id"))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [tenantsResult, propertiesResult, unitsResult] = await Promise.all([
    tenantIds.length > 0
      ? supabase
          .from("manager_tenants")
          .select("id, full_name")
          .in("id", tenantIds)
          .returns<Record<string, unknown>[]>()
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length > 0
      ? supabase
          .from("manager_properties")
          .select("id, property_name")
          .in("id", propertyIds)
          .returns<Record<string, unknown>[]>()
      : Promise.resolve({ data: [], error: null }),
    unitIds.length > 0
      ? supabase
          .from("manager_units")
          .select("id, unit_label")
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

  const tenantNameById = new Map(
    (tenantsResult.data ?? []).map((row) => {
      const record = toRecord(row);
      return [
        readText(record, "id") ?? "",
        readText(record, "full_name") ?? "",
      ];
    }),
  );

  const propertyNameById = new Map(
    (propertiesResult.data ?? []).map((row) => {
      const record = toRecord(row);
      return [
        readText(record, "id") ?? "",
        readText(record, "property_name") ?? "",
      ];
    }),
  );

  const unitLabelById = new Map(
    (unitsResult.data ?? []).map((row) => {
      const record = toRecord(row);
      return [
        readText(record, "id") ?? "",
        readText(record, "unit_label") ?? "",
      ];
    }),
  );

  const payments: ManagerStatementPaymentLine[] = paymentRows.map((payment) => {
    const tenantId = readText(payment, "tenant_id") ?? "";
    const propertyId = readText(payment, "property_id") ?? "";
    const unitId = readText(payment, "unit_id") ?? "";

    return {
      id: readText(payment, "id") ?? "",
      tenantName: tenantNameById.get(tenantId) || "Tenant",
      propertyName: propertyNameById.get(propertyId) || "Property",
      unitLabel: unitLabelById.get(unitId) || "Unit",
      paymentDate:
        readText(payment, "payment_date") ??
        readText(payment, "created_at") ??
        new Date().toISOString(),
      periodStart: readText(payment, "period_start"),
      periodEnd: readText(payment, "period_end"),
      amountPaid: readNumber(payment, "amount_paid"),
      managerCommission: readNumber(payment, "management_fee_amount"),
      landlordShare: readNumber(payment, "landlord_net_amount"),
      paymentReference: readText(payment, "payment_reference"),
      status: readRentPaymentStatus(payment),
    };
  });

  const remittances: ManagerStatementRemittanceLine[] = remittanceRows.map(
    (remittance) => ({
      id: readText(remittance, "id") ?? "",
      remittanceDate:
        readText(remittance, "remittance_date") ??
        readText(remittance, "created_at") ??
        new Date().toISOString(),
      amountRemitted: readNumber(remittance, "amount_remitted"),
      reference:
        readText(remittance, "remittance_reference") ??
        readText(remittance, "reference"),
      status: readRemittanceStatus(remittance),
      notes: readText(remittance, "notes"),
    }),
  );

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
      name: readText(organization, "organization_name") ?? "Property Manager",
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

export async function upsertManagerStatementDocument(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
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
        document_type: params.documentType,
        idempotency_key: params.idempotencyKey,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        document_number: params.documentNumber,
        storage_bucket: MANAGER_STATEMENT_DOCUMENTS_BUCKET,
        storage_path: params.storagePath,
        file_name: params.fileName,
        generated_by_profile_id: params.generatedByProfileId,
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
