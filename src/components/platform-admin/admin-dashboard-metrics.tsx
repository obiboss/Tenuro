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
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { PlatformAdminDashboardMetric } from "@/server/services/platform-admin-dashboard.service";

type AdminDashboardMetricsProps = {
  metrics: PlatformAdminDashboardMetric[];
  periodLabel: string;
};

const metricIcons: Record<string, ReactNode> = {
  total_active_users: <Users aria-hidden="true" size={21} strokeWidth={2.6} />,
  new_signups: <UserPlus aria-hidden="true" size={21} strokeWidth={2.6} />,
  verified_payout_accounts: (
    <ShieldCheck aria-hidden="true" size={21} strokeWidth={2.6} />
  ),
  pending_payout_accounts: (
    <CreditCard aria-hidden="true" size={21} strokeWidth={2.6} />
  ),
};

const metricTones: Record<string, { icon: string; trend: string }> = {
  total_active_users: {
    icon: "bg-primary-soft text-primary",
    trend: "text-success",
  },
  new_signups: {
    icon: "bg-success-soft text-success",
    trend: "text-success",
  },
  verified_payout_accounts: {
    icon: "bg-success-soft text-success",
    trend: "text-success",
  },
  pending_payout_accounts: {
    icon: "bg-warning-soft text-warning",
    trend: "text-warning",
  },
};

const compactMetricTitles: Record<string, string> = {
  total_active_users: "Active users",
  new_signups: "New sign-ups",
  verified_payout_accounts: "Verified banks",
  pending_payout_accounts: "Awaiting review",
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
  trendClassName,
}: {
  trendDirection: PlatformAdminDashboardMetric["trendDirection"];
  changePercent: number;
  trendClassName: string;
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
        isUp ? trendClassName : "text-danger",
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map((metric) => {
        const tone = metricTones[metric.key] ?? metricTones.total_active_users;

        return (
          <Card key={metric.key} className="min-h-40 p-4 sm:min-h-44 sm:p-5">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold leading-4 text-text-muted sm:text-sm sm:leading-5">
                  <span className="sm:hidden">
                    {compactMetricTitles[metric.key] ?? metric.title}
                  </span>
                  <span className="hidden sm:inline">{metric.title}</span>
                </p>

                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11 sm:rounded-2xl",
                    tone.icon,
                  )}
                  aria-hidden="true"
                >
                  {metricIcons[metric.key]}
                </div>
              </div>

              <div>
                <p className="text-2xl font-black tracking-tight text-text-strong sm:text-3xl">
                  {formatMetricValue(metric.value)}
                </p>

                <div className="mt-2 flex flex-col gap-1 text-[11px] leading-4 text-text-muted sm:text-xs">
                  <TrendIndicator
                    trendDirection={metric.trendDirection}
                    changePercent={metric.changePercent}
                    trendClassName={tone.trend}
                  />
                  <span>{metric.comparisonLabel}</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <p className="sr-only">Metrics filtered for {periodLabel}</p>
    </div>
  );
}
