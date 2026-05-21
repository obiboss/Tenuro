import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Minus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/cn";
import type { PlatformAdminDashboardMetric } from "@/server/services/platform-admin-dashboard.service";

type AdminDashboardMetricsProps = {
  metrics: PlatformAdminDashboardMetric[];
  periodLabel: string;
};

const metricIcons: Record<string, ReactNode> = {
  total_active_users: <Users aria-hidden="true" size={22} strokeWidth={2.6} />,
  new_signups: <UserPlus aria-hidden="true" size={22} strokeWidth={2.6} />,
  verified_payout_accounts: (
    <ShieldCheck aria-hidden="true" size={22} strokeWidth={2.6} />
  ),
  pending_payout_accounts: (
    <CreditCard aria-hidden="true" size={22} strokeWidth={2.6} />
  ),
};

const metricTones: Record<
  string,
  "primary" | "success" | "warning" | "danger"
> = {
  total_active_users: "primary",
  new_signups: "success",
  verified_payout_accounts: "success",
  pending_payout_accounts: "warning",
};

function formatMetricValue(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-NG").format(safeValue);
}

function formatChangePercent(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "0%";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function TrendIndicator({
  trendDirection,
  changePercent,
}: {
  trendDirection: PlatformAdminDashboardMetric["trendDirection"];
  changePercent: number;
}) {
  if (trendDirection === "neutral") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-text-muted">
        <Minus aria-hidden="true" size={14} strokeWidth={2.6} />
        No change
      </span>
    );
  }

  const isUp = trendDirection === "up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-bold",
        isUp ? "text-success" : "text-danger",
      )}
    >
      {isUp ? (
        <ArrowUpRight aria-hidden="true" size={14} strokeWidth={2.6} />
      ) : (
        <ArrowDownRight aria-hidden="true" size={14} strokeWidth={2.6} />
      )}
      {formatChangePercent(changePercent)}
    </span>
  );
}

export function AdminDashboardMetrics({
  metrics,
  periodLabel,
}: AdminDashboardMetricsProps) {
  const items = metrics ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((metric) => (
        <StatCard
          key={metric.key}
          title={metric.title}
          value={formatMetricValue(metric.value)}
          description={
            <span className="flex flex-col gap-1">
              <TrendIndicator
                trendDirection={metric.trendDirection}
                changePercent={metric.changePercent}
              />
              <span>{metric.comparisonLabel}</span>
            </span>
          }
          icon={metricIcons[metric.key]}
          tone={metricTones[metric.key] ?? "primary"}
        />
      ))}

      <p className="sr-only">Metrics filtered for {periodLabel}</p>
    </div>
  );
}
