import { AdminDashboardMetrics } from "@/components/platform-admin/admin-dashboard-metrics";
import { AdminFreeToolUsage } from "@/components/platform-admin/admin-free-tool-usage";
import { AdminPeriodFilter } from "@/components/platform-admin/admin-period-filter";
import { AdminRecentActivity } from "@/components/platform-admin/admin-recent-activity";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { parsePlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";
import { getPlatformAdminDashboard } from "@/server/services/platform-admin-dashboard.service";

type PlatformAdminDashboardPageProps = {
  searchParams: Promise<{
    period?: string;
  }>;
};

export default async function PlatformAdminDashboardPage({
  searchParams,
}: PlatformAdminDashboardPageProps) {
  await requirePlatformAdminPage();

  const resolvedSearchParams = await searchParams;
  const period = parsePlatformAdminDashboardPeriod(resolvedSearchParams.period);
  const dashboard = await getPlatformAdminDashboard({ period });

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Admin dashboard"
        description="Monitor onboarding, free tool usage, payout verification activity, and platform health."
        action={<Badge tone="success">Protected</Badge>}
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-text-muted">Reporting period</p>
          <p className="mt-1 font-black text-text-strong">
            {dashboard.periodLabel}
          </p>
        </div>

        <AdminPeriodFilter activePeriod={dashboard.period} />
      </div>

      <AdminDashboardMetrics
        metrics={dashboard.metrics}
        periodLabel={dashboard.periodLabel}
      />

      <div className="mt-6">
        <AdminFreeToolUsage
          usage={dashboard.freeToolUsage}
          periodLabel={dashboard.periodLabel}
        />
      </div>

      <div className="mt-6">
        <AdminRecentActivity
          activity={dashboard.recentActivity}
          periodLabel={dashboard.periodLabel}
        />
      </div>
    </div>
  );
}
