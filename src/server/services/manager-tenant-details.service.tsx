import "server-only";

import { Readable } from "node:stream";
import { pdf } from "@react-pdf/renderer";
import { AppError } from "@/server/errors/app-error";
import {
  ManagerTenantDetailsPdf,
  type ManagerTenantDetailsSnapshot,
} from "@/server/pdf/manager-tenant-details-pdf";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type PdfOutput =
  Buffer | Readable | ReadableStream<Uint8Array<ArrayBufferLike>>;

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readText(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(row: Record<string, unknown>, key: string) {
  const value = row[key];
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isWebReadableStream(
  output: PdfOutput,
): output is ReadableStream<Uint8Array<ArrayBufferLike>> {
  return typeof (output as { getReader?: unknown }).getReader === "function";
}

async function pdfOutputToBuffer(output: PdfOutput) {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  const chunks: Buffer[] = [];

  if (isWebReadableStream(output)) {
    const reader = output.getReader();

    try {
      let complete = false;

      while (!complete) {
        const result = await reader.read();
        complete = result.done;

        if (result.value) {
          chunks.push(Buffer.from(result.value));
        }
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks);
  }

  for await (const chunk of output as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function safeFilePart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || "tenant";
}

export async function getManagerTenantDetailsDownload(tenantId: string) {
  const { access } = await requireManagerWorkspacePermission("property.manage");
  const organization = access.organization;
  const supabase = createSupabaseAdminClient();

  const { data: tenantData, error: tenantError } = await supabase
    .from("manager_tenants")
    .select(
      "id, organization_id, landlord_client_id, property_id, unit_id, full_name, phone_number, email, occupation, rent_amount, current_balance, move_in_date, next_rent_due_date, status, notes",
    )
    .eq("organization_id", organization.id)
    .eq("id", tenantId)
    .maybeSingle<Record<string, unknown>>();

  if (tenantError) {
    throw tenantError;
  }

  if (!tenantData) {
    throw new AppError(
      "MANAGER_TENANT_NOT_FOUND",
      "The tenant record could not be found.",
      404,
    );
  }

  const tenant = toRecord(tenantData);
  const landlordClientId = readText(tenant, "landlord_client_id");
  const propertyId = readText(tenant, "property_id");
  const unitId = readText(tenant, "unit_id");

  if (!landlordClientId || !propertyId || !unitId) {
    throw new AppError(
      "MANAGER_TENANT_RECORD_INCOMPLETE",
      "The tenant record is missing its property or unit.",
      409,
    );
  }

  const [landlordResult, propertyResult, unitResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("manager_landlord_clients")
        .select("id, landlord_name, landlord_phone, landlord_email")
        .eq("organization_id", organization.id)
        .eq("id", landlordClientId)
        .maybeSingle<Record<string, unknown>>(),
      supabase
        .from("manager_properties")
        .select("id, property_name, property_address")
        .eq("organization_id", organization.id)
        .eq("id", propertyId)
        .maybeSingle<Record<string, unknown>>(),
      supabase
        .from("manager_units")
        .select("id, unit_label, unit_type")
        .eq("organization_id", organization.id)
        .eq("id", unitId)
        .maybeSingle<Record<string, unknown>>(),
      supabase
        .from("manager_rent_payments")
        .select(
          "id, payment_date, amount_paid, period_start, period_end, payment_reference, status, created_at",
        )
        .eq("organization_id", organization.id)
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100)
        .returns<Record<string, unknown>[]>(),
    ]);

  const relatedError =
    landlordResult.error ??
    propertyResult.error ??
    unitResult.error ??
    paymentsResult.error;

  if (relatedError) {
    throw relatedError;
  }

  if (!landlordResult.data || !propertyResult.data || !unitResult.data) {
    throw new AppError(
      "MANAGER_TENANT_RELATION_NOT_FOUND",
      "The tenant’s landlord, property, or unit could not be found.",
      409,
    );
  }

  const landlord = toRecord(landlordResult.data);
  const property = toRecord(propertyResult.data);
  const unit = toRecord(unitResult.data);
  const payments = (paymentsResult.data ?? []).map(toRecord);
  const reliablePayments = payments.filter((payment) => {
    const status = readText(payment, "status");
    return status === "recorded" || status === "verified";
  });
  const pendingPayments = payments.filter(
    (payment) => readText(payment, "status") === "pending_confirmation",
  );

  const snapshot: ManagerTenantDetailsSnapshot = {
    generatedAt: new Date().toISOString(),
    organization: {
      name: organization.organization_name,
      phone: organization.organization_phone,
      email: organization.organization_email,
    },
    landlord: {
      name: readText(landlord, "landlord_name") ?? "Landlord",
      phone: readText(landlord, "landlord_phone"),
      email: readText(landlord, "landlord_email"),
    },
    property: {
      name: readText(property, "property_name") ?? "Property",
      address: readText(property, "property_address") ?? "Address not provided",
    },
    unit: {
      label: readText(unit, "unit_label") ?? "Unit",
      type: readText(unit, "unit_type"),
    },
    tenant: {
      name: readText(tenant, "full_name") ?? "Tenant",
      phone: readText(tenant, "phone_number") ?? "Not provided",
      email: readText(tenant, "email"),
      occupation: readText(tenant, "occupation"),
      moveInDate: readText(tenant, "move_in_date"),
      nextRentDueDate: readText(tenant, "next_rent_due_date"),
      rentAmount: readNumber(tenant, "rent_amount"),
      currentBalance: readNumber(tenant, "current_balance"),
      status: readText(tenant, "status") ?? "inactive",
      notes: readText(tenant, "notes"),
    },
    payments: payments.map((payment, index) => ({
      id: readText(payment, "id") ?? `payment-${index}`,
      date:
        readText(payment, "payment_date") ??
        readText(payment, "created_at") ??
        new Date().toISOString(),
      amount: readNumber(payment, "amount_paid"),
      periodStart: readText(payment, "period_start"),
      periodEnd: readText(payment, "period_end"),
      reference: readText(payment, "payment_reference"),
      status: readText(payment, "status") ?? "pending_confirmation",
    })),
    totals: {
      confirmedOrRecorded: reliablePayments.reduce(
        (total, payment) => total + readNumber(payment, "amount_paid"),
        0,
      ),
      awaitingConfirmation: pendingPayments.reduce(
        (total, payment) => total + readNumber(payment, "amount_paid"),
        0,
      ),
    },
  };

  const rendered = (await pdf(
    <ManagerTenantDetailsPdf snapshot={snapshot} />,
  ).toBuffer()) as PdfOutput;
  const fileBuffer = await pdfOutputToBuffer(rendered);

  return {
    fileName: `tenant-details-${safeFilePart(snapshot.tenant.name)}.pdf`,
    fileBuffer,
  };
}
