import "server-only";

import { getActiveRentAlertTenanciesForLandlord } from "@/server/repositories/renewals.repository";
import type { LandlordRentAlertTenancyRow } from "@/server/repositories/renewals.repository";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";
import { getCanonicalTenancyBalance } from "@/server/services/tenancy-financial-integrity.service";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getPayableOutstandingBalance } from "@/server/utils/tenancy-balance";

export type RentAlertStatus = "owing" | "due_soon";

export type LandlordRentAlertItem = {
  tenancy: LandlordRentAlertTenancyRow;
  status: RentAlertStatus;
  amountDue: number;
  outstandingBalance: number;
  dueDate: string | null;
  daysUntilDue: number | null;
  whatsappMessage: string;
};

export type LandlordRentAlerts = {
  items: LandlordRentAlertItem[];
  dueSoonCount: number;
  owingCount: number;
};

const DUE_SOON_DAYS = 30;

function startOfToday() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getDaysUntil(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const dueDate = new Date(`${dateValue}T00:00:00`);
  const today = startOfToday();
  const differenceMs = dueDate.getTime() - today.getTime();

  return Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
}

function isDueWithinThirtyDays(nextRentChargeDate: string | null) {
  const daysUntilDue = getDaysUntil(nextRentChargeDate);

  return (
    daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= DUE_SOON_DAYS
  );
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function getPropertyUnitLabel(tenancy: LandlordRentAlertTenancyRow) {
  const propertyName =
    tenancy.units?.properties?.property_name ?? "the property";
  const unitIdentifier = tenancy.units?.unit_identifier ?? "the unit";

  return `${propertyName}, ${unitIdentifier}`;
}

function buildRentAlertWhatsappMessage(params: {
  tenancy: LandlordRentAlertTenancyRow;
  status: RentAlertStatus;
  amountDue: number;
  dueDate: string | null;
  daysUntilDue: number | null;
}) {
  const tenantName = params.tenancy.tenants?.full_name ?? "Tenant";
  const propertyUnit = getPropertyUnitLabel(params.tenancy);

  if (params.status === "owing") {
    return [
      `Hello ${tenantName},`,
      "",
      `This is a reminder that your rent balance of ${formatNaira(
        params.amountDue,
      )} for ${propertyUnit} is still outstanding.`,
      "",
      "Please make payment or contact the landlord if you have already paid.",
    ].join("\n");
  }

  const dueText =
    params.daysUntilDue === 0
      ? "today"
      : params.daysUntilDue === 1
        ? "in 1 day"
        : params.daysUntilDue !== null
          ? `in ${params.daysUntilDue} days`
          : `on ${formatDate(params.dueDate)}`;

  return [
    `Hello ${tenantName},`,
    "",
    `This is a rent reminder for ${propertyUnit}.`,
    "",
    `Amount due: ${formatNaira(params.amountDue)}`,
    `Due date: ${formatDate(params.dueDate)} (${dueText})`,
    "",
    "Please prepare for payment before the due date.",
  ].join("\n");
}

function sortRentAlerts(a: LandlordRentAlertItem, b: LandlordRentAlertItem) {
  if (a.status !== b.status) {
    return a.status === "owing" ? -1 : 1;
  }

  const aDays = a.daysUntilDue ?? Number.MAX_SAFE_INTEGER;
  const bDays = b.daysUntilDue ?? Number.MAX_SAFE_INTEGER;

  return aDays - bDays;
}

function isLandlordRentAlertItem(
  item: LandlordRentAlertItem | null,
): item is LandlordRentAlertItem {
  return item !== null;
}

export async function getCurrentLandlordRentAlerts(): Promise<LandlordRentAlerts> {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const tenancies = await getActiveRentAlertTenanciesForLandlord(
    supabase,
    landlord.id,
  );

  const items = await Promise.all(
    tenancies.map(async (tenancy): Promise<LandlordRentAlertItem | null> => {
      const balance = await getCanonicalTenancyBalance(supabase, tenancy.id);
      const outstandingBalance = getPayableOutstandingBalance(
        balance.outstanding_balance,
      );
      const isOwing = outstandingBalance > 0;
      const dueSoon = isDueWithinThirtyDays(tenancy.next_rent_charge_date);

      if (!isOwing && !dueSoon) {
        return null;
      }

      const status: RentAlertStatus = isOwing ? "owing" : "due_soon";
      const amountDue = isOwing
        ? outstandingBalance
        : Number(tenancy.rent_amount);
      const dueDate = tenancy.next_rent_charge_date;
      const daysUntilDue = getDaysUntil(dueDate);

      return {
        tenancy,
        status,
        amountDue,
        outstandingBalance,
        dueDate,
        daysUntilDue,
        whatsappMessage: buildRentAlertWhatsappMessage({
          tenancy,
          status,
          amountDue,
          dueDate,
          daysUntilDue,
        }),
      };
    }),
  );

  const filteredItems = items.filter(isLandlordRentAlertItem);

  filteredItems.sort(sortRentAlerts);

  return {
    items: filteredItems,
    owingCount: filteredItems.filter((item) => item.status === "owing").length,
    dueSoonCount: filteredItems.filter((item) => item.status === "due_soon")
      .length,
  };
}
