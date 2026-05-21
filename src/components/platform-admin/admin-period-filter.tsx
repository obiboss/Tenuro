import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";

type AdminPeriodFilterProps = {
  activePeriod: PlatformAdminDashboardPeriod;
};

const periodOptions: Array<{
  value: PlatformAdminDashboardPeriod;
  label: string;
}> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

function buildHref(period: PlatformAdminDashboardPeriod) {
  if (period === "week") {
    return "/admin";
  }

  return `/admin?period=${period}`;
}

export function AdminPeriodFilter({ activePeriod }: AdminPeriodFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {periodOptions.map((option) => (
        <Link
          key={option.value}
          href={buildHref(option.value)}
          className={cn(
            "rounded-button px-3 py-2 text-sm font-bold transition-colors",
            activePeriod === option.value
              ? "bg-primary text-white"
              : "bg-background text-text-muted hover:text-text-strong",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
