import { ArrowDownCircle, ArrowUpCircle, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/server/utils/money";
import type {
  LedgerEntryRow,
  TenancyBalanceSummary,
} from "@/server/repositories/ledger.repository";

type TenantBalanceCardProps = {
  balance: TenancyBalanceSummary;
  entries: LedgerEntryRow[];
};

function entryTypeLabel(type: LedgerEntryRow["entry_type"]) {
  if (type === "rent_charge") {
    return "Rent Charged";
  }

  if (type === "opening_balance") {
    return "Opening Balance";
  }

  if (type === "payment") {
    return "Payment";
  }

  if (type === "adjustment") {
    return "Adjustment";
  }

  return "Reversal";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatPeriodDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getEntryPeriodLabel(metadata: Record<string, unknown>) {
  const periodStart = formatPeriodDate(metadata.period_start);
  const periodEnd = formatPeriodDate(metadata.period_end);

  if (!periodStart || !periodEnd) {
    return null;
  }

  return `${periodStart} – ${periodEnd}`;
}

function getEntrySourceLabel(metadata: Record<string, unknown>) {
  const source = metadata.source;

  if (source === "initial_tenancy_charge") {
    return "Initial rent period";
  }

  if (source === "tenancy_creation") {
    return "Opening balance";
  }

  return null;
}

export function TenantBalanceCard({
  balance,
  entries,
}: TenantBalanceCardProps) {
  const isOwing = balance.outstanding_balance > 0;
  const isCleared = balance.outstanding_balance === 0;
  const isCredit = balance.outstanding_balance < 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Rent Balance</CardTitle>
            <p className="mt-1 text-sm text-text-muted">
              Balance is calculated from period-aware rent ledger entries.
            </p>
          </div>

          <Badge tone={isCleared ? "success" : isOwing ? "warning" : "primary"}>
            {isCleared ? "Cleared" : isOwing ? "Outstanding" : "Tenant Credit"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-button bg-background p-4">
            <div className="flex items-center gap-2 text-warning">
              <ArrowUpCircle aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Rent Charged</p>
            </div>
            <p className="mt-2 text-xl font-extrabold text-text-strong">
              {formatNaira(balance.total_debit)}
            </p>
          </div>

          <div className="rounded-button bg-success-soft p-4">
            <div className="flex items-center gap-2 text-success">
              <ArrowDownCircle aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Amount Paid</p>
            </div>
            <p className="mt-2 text-xl font-extrabold text-text-strong">
              {formatNaira(balance.total_credit)}
            </p>
          </div>

          <div className="rounded-button bg-primary-soft p-4">
            <div className="flex items-center gap-2 text-primary">
              <WalletCards aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">
                {isCredit ? "Tenant Credit" : "Outstanding"}
              </p>
            </div>
            <p className="mt-2 text-xl font-extrabold text-text-strong">
              {formatNaira(Math.abs(balance.outstanding_balance))}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-text-strong">
            Ledger History
          </h3>

          {entries.length === 0 ? (
            <p className="mt-3 rounded-button bg-background p-4 text-sm text-text-muted">
              No ledger entries yet.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border-soft overflow-hidden rounded-card border border-border-soft bg-white">
              {entries.map((entry) => {
                const periodLabel = getEntryPeriodLabel(entry.metadata);
                const sourceLabel = getEntrySourceLabel(entry.metadata);

                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-text-strong">
                          {entryTypeLabel(entry.entry_type)}
                        </p>

                        {sourceLabel ? (
                          <Badge tone="primary">{sourceLabel}</Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-text-muted">
                        {entry.description}
                      </p>

                      {periodLabel ? (
                        <p className="mt-1 text-xs font-bold text-text-muted">
                          Period: {periodLabel}
                        </p>
                      ) : null}

                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        Entry date: {formatDate(entry.entry_date)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <Badge
                        tone={
                          entry.direction === "credit" ? "success" : "warning"
                        }
                      >
                        {entry.direction === "credit" ? "Credit" : "Debit"}
                      </Badge>
                      <p className="mt-2 font-extrabold text-text-strong">
                        {formatNaira(entry.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
