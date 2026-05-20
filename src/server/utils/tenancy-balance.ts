import type { TenancyBalanceSummary } from "@/server/repositories/ledger.repository";

export function normalizeTenancyBalanceSummary(
  raw: Record<string, unknown> | TenancyBalanceSummary | null | undefined,
  tenancyId: string,
): TenancyBalanceSummary {
  if (!raw) {
    return {
      tenancy_id: tenancyId,
      total_debit: 0,
      total_credit: 0,
      outstanding_balance: 0,
    };
  }

  if (
    "outstanding_balance" in raw &&
    typeof raw.outstanding_balance === "number"
  ) {
    return raw as TenancyBalanceSummary;
  }

  const row = raw as Record<string, unknown>;

  return {
    tenancy_id: String(row.tenancy_id ?? tenancyId),
    total_debit: Number(row.total_debit ?? row.total_debits ?? 0),
    total_credit: Number(row.total_credit ?? row.total_credits ?? 0),
    outstanding_balance: Number(
      row.outstanding_balance ?? row.outstanding ?? 0,
    ),
  };
}

export function getPayableOutstandingBalance(outstandingBalance: number) {
  const normalized = Number(outstandingBalance);

  if (!Number.isFinite(normalized)) {
    return 0;
  }

  return Math.max(0, normalized);
}
