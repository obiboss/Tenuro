import "server-only";

import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { buildWaMeUrl } from "@/server/utils/whatsapp";

const RENEWAL_REMINDER_DAYS = [90, 60, 30] as const;

type RenewalReminderDay = (typeof RENEWAL_REMINDER_DAYS)[number];

type RenewalReminderTenancyRow = {
  id: string;
  tenancy_reference: string | null;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  rent_amount: number;
  currency_code: string;
  next_rent_charge_date: string | null;
  current_period_end: string | null;
  end_date: string | null;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
  units: {
    id: string;
    unit_identifier: string;
    building_name: string | null;
    properties: {
      id: string;
      property_name: string;
      address: string | null;
    } | null;
  } | null;
};

export type RenewalReminderPreparedItem = {
  tenancyId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  propertyId: string | null;
  daysUntilRenewal: RenewalReminderDay;
  renewalDate: string;
  reminderMarker: string;
  tenantName: string;
};

export type PrepareRenewalRemindersResult = {
  runDate: string;
  preparedCount: number;
  skippedCount: number;
  preparedReminders: RenewalReminderPreparedItem[];
};

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDays(value: string, days: number) {
  const date = parseDateOnly(value);

  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return toDateOnly(date);
}

function getDaysUntilDate(params: { runDate: string; targetDate: string }) {
  const runDate = parseDateOnly(params.runDate);
  const targetDate = parseDateOnly(params.targetDate);

  if (!runDate || !targetDate) {
    return null;
  }

  const differenceMs = targetDate.getTime() - runDate.getTime();

  return Math.round(differenceMs / 86_400_000);
}

function isRenewalReminderDay(value: number): value is RenewalReminderDay {
  return RENEWAL_REMINDER_DAYS.includes(value as RenewalReminderDay);
}

function formatNairaAmount(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function buildReminderMarker(params: {
  tenancyId: string;
  renewalDate: string;
  daysUntilRenewal: RenewalReminderDay;
}) {
  return [
    "renewal-reminder",
    params.tenancyId,
    params.renewalDate,
    `${params.daysUntilRenewal}d`,
  ].join(":");
}

function buildTenantRenewalReminderMessage(params: {
  tenantName: string;
  propertyName: string;
  unitName: string;
  renewalDate: string;
  rentAmount: number;
  daysUntilRenewal: RenewalReminderDay;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `This is a Tenuro renewal reminder for ${params.unitName} at ${params.propertyName}.`,
    "",
    `Your next rent/renewal date is ${formatDate(params.renewalDate)}.`,
    `Days remaining: ${params.daysUntilRenewal}`,
    `Expected rent: ${formatNairaAmount(params.rentAmount)}`,
    "",
    "Please contact your landlord if you need to discuss renewal or payment arrangements.",
  ].join("\n");
}

async function hasPreparedReminder(params: {
  landlordId: string;
  tenancyId: string;
  reminderMarker: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("landlord_id", params.landlordId)
    .eq("tenancy_id", params.tenancyId)
    .eq("event_type", AUDIT_EVENT_TYPES.renewalReminderPrepared)
    .eq("metadata->>reminder_marker", params.reminderMarker)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function getRenewalReminderTenancies(runDate: string) {
  const supabase = createSupabaseAdminClient();
  const maxDate = addDays(runDate, 90);

  if (!maxDate) {
    return [];
  }

  const { data, error } = await supabase
    .from("tenancies")
    .select(
      `
      id,
      tenancy_reference,
      landlord_id,
      tenant_id,
      unit_id,
      rent_amount,
      currency_code,
      next_rent_charge_date,
      current_period_end,
      end_date,
      tenants (
        id,
        full_name,
        phone_number,
        email
      ),
      units (
        id,
        unit_identifier,
        building_name,
        properties (
          id,
          property_name,
          address
        )
      )
    `,
    )
    .eq("status", "active")
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("next_rent_charge_date", "is", null)
    .gte("next_rent_charge_date", runDate)
    .lte("next_rent_charge_date", maxDate)
    .returns<RenewalReminderTenancyRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

async function prepareReminderForTenancy(params: {
  tenancy: RenewalReminderTenancyRow;
  runDate: string;
  daysUntilRenewal: RenewalReminderDay;
  renewalDate: string;
  reminderMarker: string;
}) {
  const tenantName = params.tenancy.tenants?.full_name ?? "Tenant";
  const tenantPhoneNumber = params.tenancy.tenants?.phone_number ?? null;
  const propertyName =
    params.tenancy.units?.properties?.property_name ?? "the property";
  const propertyId = params.tenancy.units?.properties?.id ?? null;
  const unitName = params.tenancy.units?.unit_identifier ?? "your unit";

  const message = buildTenantRenewalReminderMessage({
    tenantName,
    propertyName,
    unitName,
    renewalDate: params.renewalDate,
    rentAmount: Number(params.tenancy.rent_amount),
    daysUntilRenewal: params.daysUntilRenewal,
  });

  const waMeUrl = buildWaMeUrl({
    phoneNumber: tenantPhoneNumber,
    message,
  });

  await writeSystemAuditLog({
    landlordId: params.tenancy.landlord_id,
    tenantId: params.tenancy.tenant_id,
    tenancyId: params.tenancy.id,
    unitId: params.tenancy.unit_id,
    propertyId,
    eventType: AUDIT_EVENT_TYPES.renewalReminderPrepared,
    entityType: AUDIT_ENTITY_TYPES.tenancy,
    entityId: params.tenancy.id,
    description: `${params.daysUntilRenewal}-day renewal reminder prepared for ${tenantName}.`,
    metadata: {
      reminder_marker: params.reminderMarker,
      reminder_channel: "whatsapp_wa_me_prepared",
      delivery_status: "prepared_not_sent",
      run_date: params.runDate,
      days_until_renewal: params.daysUntilRenewal,
      renewal_date: params.renewalDate,
      next_rent_charge_date: params.tenancy.next_rent_charge_date,
      current_period_end: params.tenancy.current_period_end,
      tenancy_end_date: params.tenancy.end_date,
      tenant_name: tenantName,
      tenant_phone_number: tenantPhoneNumber,
      property_name: propertyName,
      unit_identifier: unitName,
      rent_amount: Number(params.tenancy.rent_amount),
      currency_code: params.tenancy.currency_code,
      whatsapp_message: message,
      whatsapp_url: waMeUrl,
    },
  });

  return {
    tenancyId: params.tenancy.id,
    tenantId: params.tenancy.tenant_id,
    landlordId: params.tenancy.landlord_id,
    unitId: params.tenancy.unit_id,
    propertyId,
    daysUntilRenewal: params.daysUntilRenewal,
    renewalDate: params.renewalDate,
    reminderMarker: params.reminderMarker,
    tenantName,
  };
}

export async function prepareRenewalRemindersSystem(
  runDate = toDateOnly(new Date()),
): Promise<PrepareRenewalRemindersResult> {
  const tenancies = await getRenewalReminderTenancies(runDate);

  const preparedReminders: RenewalReminderPreparedItem[] = [];
  let skippedCount = 0;

  for (const tenancy of tenancies) {
    if (!tenancy.next_rent_charge_date) {
      skippedCount += 1;
      continue;
    }

    const daysUntilRenewal = getDaysUntilDate({
      runDate,
      targetDate: tenancy.next_rent_charge_date,
    });

    if (daysUntilRenewal === null || !isRenewalReminderDay(daysUntilRenewal)) {
      skippedCount += 1;
      continue;
    }

    const reminderMarker = buildReminderMarker({
      tenancyId: tenancy.id,
      renewalDate: tenancy.next_rent_charge_date,
      daysUntilRenewal,
    });

    const alreadyPrepared = await hasPreparedReminder({
      landlordId: tenancy.landlord_id,
      tenancyId: tenancy.id,
      reminderMarker,
    });

    if (alreadyPrepared) {
      skippedCount += 1;
      continue;
    }

    const preparedReminder = await prepareReminderForTenancy({
      tenancy,
      runDate,
      daysUntilRenewal,
      renewalDate: tenancy.next_rent_charge_date,
      reminderMarker,
    });

    preparedReminders.push(preparedReminder);
  }

  return {
    runDate,
    preparedCount: preparedReminders.length,
    skippedCount,
    preparedReminders,
  };
}
