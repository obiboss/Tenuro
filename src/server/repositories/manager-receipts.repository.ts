import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagerRentPaymentStatus } from "@/constants/manager";
import type { ManagerServiceChargePaymentSnapshotItem } from "@/server/repositories/manager.repository";

export const MANAGER_RENT_RECEIPTS_BUCKET = "manager-rent-receipts";

export type ManagerRentPaymentReceiptRow = {
  id: string;
  organization_id: string;
  rent_payment_id: string;
  receipt_number: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  generated_by_profile_id: string | null;
  generated_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ManagerRentReceiptSnapshot = {
  payment: {
    id: string;
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
    amountPaid: number;
    baseRentAmount: number;
    serviceChargeAmount: number;
    serviceChargeItems: ManagerServiceChargePaymentSnapshotItem[];
    managementFeeAmount: number;
    landlordNetAmount: number;
    bopaPlatformFee: number;
    paystackChargeAmount: number;
    otherChargesAmount: number;
    totalPaid: number;
    paymentReceiver: string;
    paymentDate: string;
    periodStart: string | null;
    periodEnd: string | null;
    status: ManagerRentPaymentStatus;
    paymentMethod: string;
    paymentReference: string | null;
    notes: string | null;
    createdAt: string;
  };
  organization: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  landlord: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  property: {
    name: string;
    address: string | null;
  };
  unit: {
    label: string;
  };
  tenant: {
    name: string;
    phone: string | null;
    email: string | null;
    balanceAfterPayment: number;
    nextRentDueDate: string | null;
  };
};

const MANAGER_RECEIPT_SELECT = `
  id,
  organization_id,
  rent_payment_id,
  receipt_number,
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

function readRequiredText(
  row: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  return readText(row, key) ?? fallback;
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

function readStatus(row: Record<string, unknown>) {
  const value = readText(row, "status");

  if (
    value === "recorded" ||
    value === "pending_confirmation" ||
    value === "verified" ||
    value === "rejected" ||
    value === "reversed"
  ) {
    return value;
  }

  return "pending_confirmation";
}

function readMetadataNumber(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readServiceChargeItems(
  value: unknown,
): ManagerServiceChargePaymentSnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const amount =
      typeof record.amount === "number" && Number.isFinite(record.amount)
        ? record.amount
        : 0;

    if (!name || amount <= 0) {
      return [];
    }

    return [
      {
        chargeId:
          typeof record.chargeId === "string" ? record.chargeId : name,
        code: typeof record.code === "string" ? record.code : null,
        name,
        amount,
        currencyCode: "NGN",
      },
    ];
  });
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

export async function getManagerRentPaymentReceiptByPaymentId(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    rentPaymentId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_receipts")
    .select(MANAGER_RECEIPT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("rent_payment_id", params.rentPaymentId)
    .maybeSingle<ManagerRentPaymentReceiptRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerRentPaymentReceipt(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    rentPaymentId: string;
    receiptNumber: string;
    storagePath: string;
    fileName: string;
    generatedByProfileId: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payment_receipts")
    .insert({
      organization_id: params.organizationId,
      rent_payment_id: params.rentPaymentId,
      receipt_number: params.receiptNumber,
      storage_bucket: MANAGER_RENT_RECEIPTS_BUCKET,
      storage_path: params.storagePath,
      file_name: params.fileName,
      generated_by_profile_id: params.generatedByProfileId,
      metadata: params.metadata,
    })
    .select(MANAGER_RECEIPT_SELECT)
    .single<ManagerRentPaymentReceiptRow>();

  if (!error && data) {
    return data;
  }

  if (error?.code !== "23505") {
    throw error;
  }

  const existingReceipt = await getManagerRentPaymentReceiptByPaymentId(
    supabase,
    {
      organizationId: params.organizationId,
      rentPaymentId: params.rentPaymentId,
    },
  );

  if (!existingReceipt) {
    throw error;
  }

  return existingReceipt;
}

export async function getManagerRentReceiptSnapshot(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    rentPaymentId: string;
  },
): Promise<ManagerRentReceiptSnapshot | null> {
  const { data: paymentData, error: paymentError } = await supabase
    .from("manager_rent_payments")
    .select("*")
    .eq("organization_id", params.organizationId)
    .eq("id", params.rentPaymentId)
    .maybeSingle<Record<string, unknown>>();

  if (paymentError) {
    throw paymentError;
  }

  if (!paymentData) {
    return null;
  }

  const payment = toRecord(paymentData);
  const paymentMetadata = toRecord(payment.metadata);

  const organizationId = readRequiredText(
    payment,
    "organization_id",
    params.organizationId,
  );
  const landlordClientId = readRequiredText(payment, "landlord_client_id", "");
  const propertyId = readRequiredText(payment, "property_id", "");
  const unitId = readRequiredText(payment, "unit_id", "");
  const tenantId = readRequiredText(payment, "tenant_id", "");

  const [organization, landlordClient, property, unit, tenant] =
    await Promise.all([
      getRecordById(supabase, "manager_organizations", organizationId),
      getRecordById(supabase, "manager_landlord_clients", landlordClientId),
      getRecordById(supabase, "manager_properties", propertyId),
      getRecordById(supabase, "manager_units", unitId),
      getRecordById(supabase, "manager_tenants", tenantId),
    ]);

  return {
    payment: {
      id: readRequiredText(payment, "id", params.rentPaymentId),
      organizationId,
      landlordClientId,
      propertyId,
      unitId,
      tenantId,
      amountPaid: readNumber(payment, "amount_paid"),
      baseRentAmount: readNumber(payment, "base_rent_amount"),
      serviceChargeAmount: readNumber(payment, "service_charge_amount"),
      serviceChargeItems: readServiceChargeItems(
        payment.service_charge_items_snapshot,
      ),
      managementFeeAmount: readNumber(payment, "management_fee_amount"),
      landlordNetAmount: readNumber(payment, "landlord_net_amount"),
      bopaPlatformFee: readMetadataNumber(paymentMetadata, "bopa_platform_fee"),
      paystackChargeAmount: readMetadataNumber(
        paymentMetadata,
        "paystack_charge",
      ),
      otherChargesAmount: readMetadataNumber(paymentMetadata, "other_charges"),
      totalPaid: readNumber(payment, "amount_paid"),
      paymentReceiver:
        readText(paymentMetadata, "payment_receiver_snapshot") ??
        readText(payment, "payment_receiver") ??
        "BOPA verified collection",
      paymentDate:
        readText(payment, "payment_date") ??
        readText(payment, "created_at") ??
        new Date().toISOString(),
      periodStart: readText(payment, "period_start"),
      periodEnd: readText(payment, "period_end"),
      status: readStatus(payment),
      paymentMethod: readRequiredText(payment, "payment_method", "recorded"),
      paymentReference: readText(payment, "payment_reference"),
      notes: readText(payment, "notes"),
      createdAt: readRequiredText(
        payment,
        "created_at",
        new Date().toISOString(),
      ),
    },
    organization: {
      name: readRequiredText(
        organization ?? {},
        "organization_name",
        "Property Manager",
      ),
      phone: readText(organization, "organization_phone"),
      email: readText(organization, "organization_email"),
    },
    landlord: {
      name: readRequiredText(landlordClient ?? {}, "landlord_name", "Landlord"),
      phone: readText(landlordClient, "landlord_phone"),
      email: readText(landlordClient, "landlord_email"),
    },
    property: {
      name: readRequiredText(property ?? {}, "property_name", "Property"),
      address:
        readText(property, "property_address") ??
        readText(property, "address") ??
        null,
    },
    unit: {
      label: readRequiredText(unit ?? {}, "unit_label", "Unit"),
    },
    tenant: {
      name: readRequiredText(tenant ?? {}, "full_name", "Tenant"),
      phone: readText(tenant, "phone_number"),
      email: readText(tenant, "email"),
      balanceAfterPayment: readNumber(tenant ?? {}, "current_balance"),
      nextRentDueDate: readText(tenant, "next_rent_due_date"),
    },
  };
}
