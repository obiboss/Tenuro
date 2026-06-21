import "server-only";

import {
  buildRentReminderWhatsappMessage,
  getPropertyUnitLabel,
} from "@/lib/rent-reminder-message";
import {
  DUE_SOON_DAYS,
  getDaysUntilDueDate,
  isDueWithinDays,
} from "@/lib/rent-status-labels";
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

function buildRentAlertWhatsappMessage(params: {
  tenancy: LandlordRentAlertTenancyRow;
  status: RentAlertStatus;
  amountDue: number;
  dueDate: string | null;
  daysUntilDue: number | null;
  landlordName: string;
}) {
  return buildRentReminderWhatsappMessage({
    tenantName: params.tenancy.tenants?.full_name ?? "Tenant",
    propertyUnitLabel: getPropertyUnitLabel({
      propertyName: params.tenancy.units?.properties?.property_name,
      unitIdentifier: params.tenancy.units?.unit_identifier,
    }),
    amount: params.amountDue,
    outstandingBalance: params.status === "owing" ? params.amountDue : 0,
    dueDate: params.dueDate,
    daysUntilDue: params.daysUntilDue,
    landlordName: params.landlordName,
  });
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
      const dueSoon = isDueWithinDays(
        tenancy.next_rent_charge_date,
        DUE_SOON_DAYS,
      );

      if (!isOwing && !dueSoon) {
        return null;
      }

      const status: RentAlertStatus = isOwing ? "owing" : "due_soon";
      const amountDue = isOwing
        ? outstandingBalance
        : Number(tenancy.rent_amount);
      const dueDate = tenancy.next_rent_charge_date;
      const daysUntilDue = getDaysUntilDueDate(dueDate);

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
          landlordName: landlord.fullName,
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
