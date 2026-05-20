import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { PlatformAdminPaymentOperationsFilter } from "@/server/services/platform-admin-payments.service";

type PaymentOperationsFiltersProps = {
  filters: PlatformAdminPaymentOperationsFilter;
};

const statusOptions = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "initialized", label: "Initialized" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function buildHref(params: {
  status?: string;
  query?: string;
  page?: number;
}) {
  const searchParams = new URLSearchParams();

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  if (params.query?.trim()) {
    searchParams.set("q", params.query.trim());
  }

  if (params.page && params.page > 1) {
    searchParams.set("page", String(params.page));
  }

  const queryString = searchParams.toString();

  return queryString ? `/admin/payments?${queryString}` : "/admin/payments";
}

export function PaymentOperationsFilters({
  filters,
}: PaymentOperationsFiltersProps) {
  const activeStatus = filters.status ?? "all";
  const queryValue = filters.query ?? "";

  return (
    <div className="space-y-4 rounded-card border border-border-soft bg-surface p-4 shadow-card">
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <Link
            key={option.value}
            href={buildHref({
              status: option.value,
              query: queryValue,
            })}
            className={cn(
              "rounded-button px-3 py-2 text-sm font-bold transition-colors",
              activeStatus === option.value
                ? "bg-primary text-white"
                : "bg-background text-text-muted hover:text-text-strong",
            )}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <form action="/admin/payments" method="get" className="flex flex-col gap-3 md:flex-row">
        {activeStatus !== "all" ? (
          <input type="hidden" name="status" value={activeStatus} />
        ) : null}

        <label className="flex-1">
          <span className="sr-only">Search by Paystack reference</span>
          <input
            type="search"
            name="q"
            defaultValue={queryValue}
            placeholder="Search Paystack reference"
            className="w-full rounded-button border border-border-soft bg-background px-4 py-3 text-sm font-semibold text-text-strong outline-none ring-primary/20 focus:ring-2"
          />
        </label>

        <Button type="submit" variant="primary">
          Search
        </Button>

        {queryValue || activeStatus !== "all" ? (
          <Link
            href="/admin/payments"
            className="inline-flex items-center justify-center rounded-button border border-border-soft bg-background px-4 py-3 text-sm font-bold text-text-muted hover:text-text-strong"
          >
            Clear
          </Link>
        ) : null}
      </form>
    </div>
  );
}
