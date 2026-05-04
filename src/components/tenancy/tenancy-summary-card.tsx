import {
  CalendarDays,
  FileCheck2,
  ReceiptText,
  RefreshCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenancyDetailRow } from "@/server/repositories/tenancies.repository";

type TenancySummaryCardProps = {
  tenancy: TenancyDetailRow;
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatAnchorDate(day: number | null, month: number | null) {
  if (!day || !month) {
    return "Not set";
  }

  const anchorDate = new Date(Date.UTC(2026, month - 1, day));

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "long",
  }).format(anchorDate);
}

export function TenancySummaryCard({ tenancy }: TenancySummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Active Tenancy Record</CardTitle>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {tenancy.tenancy_reference}
            </p>
          </div>

          <Badge tone="success">Active</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-5 rounded-button bg-primary-soft p-4 text-sm leading-6 text-text-normal">
          This record tracks rent, the tenant’s rent calendar, renewal anchor,
          opening balance, and ledger status. It is not the full tenancy
          agreement document.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-button bg-background p-4">
            <div className="flex items-center gap-2 text-text-muted">
              <ReceiptText aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Rent Amount</p>
            </div>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatMoney(tenancy.rent_amount, tenancy.currency_code)}
            </p>
            <p className="mt-1 text-sm text-text-muted capitalize">
              {tenancy.payment_frequency}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <div className="flex items-center gap-2 text-text-muted">
              <FileCheck2 aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Opening Balance</p>
            </div>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatMoney(tenancy.opening_balance, tenancy.currency_code)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <div className="flex items-center gap-2 text-text-muted">
              <CalendarDays aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Current Rent Period</p>
            </div>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatDate(tenancy.current_period_start ?? tenancy.start_date)} –{" "}
              {formatDate(tenancy.current_period_end ?? tenancy.end_date)}
            </p>
          </div>

          <div className="rounded-button bg-background p-4">
            <div className="flex items-center gap-2 text-text-muted">
              <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.5} />
              <p className="text-sm font-bold">Renewal Anchor</p>
            </div>
            <p className="mt-2 font-extrabold text-text-strong">
              {formatAnchorDate(
                tenancy.rent_due_day,
                tenancy.rent_anchor_month,
              )}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Next rent charge: {formatDate(tenancy.next_rent_charge_date)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
