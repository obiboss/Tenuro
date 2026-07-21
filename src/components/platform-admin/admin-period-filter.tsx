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
    <div className="grid w-full grid-cols-4 gap-1 rounded-button bg-white p-1 shadow-soft sm:w-auto">
      {periodOptions.map((option) => (
        <Link
          key={option.value}
          href={buildHref(option.value)}
          className={cn(
            "flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-bold transition-colors",
            activePeriod === option.value
              ? "bg-primary text-white"
              : "text-text-muted hover:bg-primary-soft hover:text-primary",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
