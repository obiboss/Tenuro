import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTenancyBalanceSummary } from "@/server/utils/tenancy-balance";

export type TenancyBalanceSummary = {
  tenancy_id: string;
  total_debit: number;
  total_credit: number;
  outstanding_balance: number;
};

export type LedgerEntryRow = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  payment_id: string | null;
  entry_type:
    | "rent_charge"
    | "opening_balance"
    | "payment"
    | "adjustment"
    | "reversal";
  direction: "debit" | "credit";
  amount: number;
  currency_code: string;
  description: string;
  entry_date: string;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PostedRentChargeRow = {
  tenancy_id: string;
  landlord_id: string;
  tenant_id: string;
  unit_id: string;
  ledger_entry_id: string;
  rent_amount: number;
  currency_code: string;
  period_start: string;
  period_end: string;
  next_rent_charge_date: string;
};

export async function postInitialTenancyLedgerEntries(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { error } = await supabase.rpc("post_initial_tenancy_ledger_entries", {
    p_tenancy_id: tenancyId,
  });

  if (error) {
    throw error;
  }
}

export async function postExistingTenantOpeningBalanceEntry(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    amount: number;
    currencyCode: string;
    description: string;
    entryDate: string;
    metadata: Record<string, unknown>;
  },
) {
  if (params.amount <= 0) {
    return null;
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      payment_id: null,
      entry_type: "opening_balance",
      direction: "debit",
      amount: params.amount,
      currency_code: params.currencyCode,
      description: params.description,
      entry_date: params.entryDate,
      period_start: null,
      period_end: null,
      metadata: params.metadata,
    })
    .select(
      "id, landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction, amount, currency_code, description, entry_date, period_start, period_end, metadata, created_at",
    )
    .single<LedgerEntryRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function postExistingTenantHistoricalRentCharges(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    currencyCode: string;
    cycles: Array<{
      periodStart: string;
      periodEnd: string;
      rentCharged: number;
    }>;
    metadata: Record<string, unknown>;
  },
) {
  const chargeRows = params.cycles
    .filter((cycle) => cycle.rentCharged > 0)
    .map((cycle) => ({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      payment_id: null,
      entry_type: "rent_charge" as const,
      direction: "debit" as const,
      amount: cycle.rentCharged,
      currency_code: params.currencyCode,
      description: "Historical rent charge from existing tenant onboarding.",
      entry_date: cycle.periodStart,
      period_start: cycle.periodStart,
      period_end: cycle.periodEnd,
      metadata: {
        ...params.metadata,
        source: "existing_tenant_claim",
        cycle_period_start: cycle.periodStart,
        cycle_period_end: cycle.periodEnd,
      },
    }));

  if (chargeRows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert(chargeRows)
    .select(
      "id, landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction, amount, currency_code, description, entry_date, period_start, period_end, metadata, created_at",
    )
    .returns<LedgerEntryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function postExistingTenantHistoricalPayments(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId: string;
    tenancyId: string;
    currencyCode: string;
    payments: Array<{
      amount: number;
      paidAt: string;
      note?: string;
      periodStart?: string;
      periodEnd?: string;
    }>;
    metadata: Record<string, unknown>;
  },
) {
  const paymentRows = params.payments
    .filter((payment) => payment.amount > 0)
    .map((payment) => ({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId,
      tenancy_id: params.tenancyId,
      payment_id: null,
      entry_type: "payment" as const,
      direction: "credit" as const,
      amount: payment.amount,
      currency_code: params.currencyCode,
      description:
        payment.note?.trim() ||
        "Historical payment recorded during existing tenant onboarding.",
      entry_date: payment.paidAt,
      period_start: payment.periodStart ?? null,
      period_end: payment.periodEnd ?? null,
      metadata: {
        ...params.metadata,
        source: "existing_tenant_claim",
        payment_note: payment.note?.trim() || null,
      },
    }));

  if (paymentRows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert(paymentRows)
    .select(
      "id, landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction, amount, currency_code, description, entry_date, period_start, period_end, metadata, created_at",
    )
    .returns<LedgerEntryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function postDueRentCharges(
  supabase: SupabaseClient,
  runDate?: string,
): Promise<PostedRentChargeRow[]> {
  const { data, error } = await supabase.rpc("post_due_rent_charges", {
    p_run_date: runDate ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => {
    const charge = row as Record<string, unknown>;

    return {
      tenancy_id: String(charge.tenancy_id),
      landlord_id: String(charge.landlord_id),
      tenant_id: String(charge.tenant_id),
      unit_id: String(charge.unit_id),
      ledger_entry_id: String(charge.ledger_entry_id),
      rent_amount: Number(charge.rent_amount),
      currency_code: String(charge.currency_code),
      period_start: String(charge.period_start),
      period_end: String(charge.period_end),
      next_rent_charge_date: String(charge.next_rent_charge_date),
    };
  });
}

export async function getTenancyBalanceSummary(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .rpc("get_tenancy_balance_summary", {
      p_tenancy_id: tenancyId,
    })
    .maybeSingle<TenancyBalanceSummary>();

  if (error) {
    throw error;
  }

  return normalizeTenancyBalanceSummary(
    (data as Record<string, unknown> | null) ?? null,
    tenancyId,
  );
}

export async function getLedgerEntriesForTenancy(
  supabase: SupabaseClient,
  tenancyId: string,
) {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select(
      "id, landlord_id, tenant_id, tenancy_id, payment_id, entry_type, direction, amount, currency_code, description, entry_date, period_start, period_end, metadata, created_at",
    )
    .eq("tenancy_id", tenancyId)
    .order("entry_date", { ascending: false })
    .returns<LedgerEntryRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
