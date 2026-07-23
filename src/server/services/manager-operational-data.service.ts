import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordRemittanceRow,
  ManagerRentPaymentRow,
} from "@/server/repositories/manager.repository";

const PAGE_SIZE = 1000;

async function readAllRows<T>(
  readPage: (from: number, to: number) => Promise<{
    data: T[] | null;
    error: unknown;
  }>,
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

export function listAllManagerRentPayments(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return readAllRows<ManagerRentPaymentRow>(async (from, to) => {
    const result = await supabase
      .from("manager_rent_payments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<ManagerRentPaymentRow[]>();

    return {
      data: result.data,
      error: result.error,
    };
  });
}

export function listAllManagerLandlordRemittances(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return readAllRows<ManagerLandlordRemittanceRow>(async (from, to) => {
    const result = await supabase
      .from("manager_landlord_remittances")
      .select("*")
      .eq("organization_id", organizationId)
      .order("remittance_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<ManagerLandlordRemittanceRow[]>();

    return {
      data: result.data,
      error: result.error,
    };
  });
}

export function listAllManagerMaintenanceRequests(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return readAllRows<ManagerMaintenanceRequestRow>(async (from, to) => {
    const result = await supabase
      .from("manager_maintenance_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("reported_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<ManagerMaintenanceRequestRow[]>();

    return {
      data: result.data,
      error: result.error,
    };
  });
}
