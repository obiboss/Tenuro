import { AdminDashboardMetrics } from "@/components/platform-admin/admin-dashboard-metrics";
import { AdminPayoutVerificationPreview } from "@/components/platform-admin/admin-payout-verification-preview";
import { AdminPeriodFilter } from "@/components/platform-admin/admin-period-filter";
import { AdminRecentActivity } from "@/components/platform-admin/admin-recent-activity";
import { PageHeader } from "@/components/ui/page-header";
import { parsePlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";
import { getPlatformAdminDashboard } from "@/server/services/platform-admin-dashboard.service";
import { getPlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";
import { requirePlatformAdminPage } from "@/server/services/platform-admin.service";

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
  const [dashboard, payoutVerifications] = await Promise.all([
    getPlatformAdminDashboard({ period }),
    getPlatformAdminPayoutVerificationQueue(),
  ]);

  return (
    <div>
      <PageHeader
        title="Admin dashboard"
        description="See what needs your attention across BOPA."
        compact
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Reporting period
          </p>
          <p className="mt-0.5 text-sm font-black text-text-strong">
            {dashboard.periodLabel}
          </p>
        </div>

        <AdminPeriodFilter activePeriod={dashboard.period} />
      </div>

      <AdminDashboardMetrics
        metrics={dashboard.metrics}
        periodLabel={dashboard.periodLabel}
      />

      <div className="mt-5 md:mt-6">
        <AdminPayoutVerificationPreview
          accounts={payoutVerifications.pending}
          total={payoutVerifications.totals.pending}
        />
      </div>

      <div className="mt-5 md:mt-6">
        <AdminRecentActivity
          activity={dashboard.recentActivity}
          periodLabel={dashboard.periodLabel}
        />
      </div>
    </div>
  );
}
