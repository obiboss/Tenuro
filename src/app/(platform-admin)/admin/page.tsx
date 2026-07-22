import { AdminLiveDashboard } from "@/components/platform-admin/admin-live-dashboard";
import { AdminPeriodFilter } from "@/components/platform-admin/admin-period-filter";
import { PageHeader } from "@/components/ui/page-header";
import { parsePlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";
import { getPlatformAdminDemoRequests } from "@/server/services/demo-request.service";
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
  const [dashboard, demoRequests, payoutVerifications] = await Promise.all([
    getPlatformAdminDashboard({ period }),
    getPlatformAdminDemoRequests(),
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

      <AdminLiveDashboard
        period={period}
        initialData={{
          dashboard,
          demoRequests: {
            requests: demoRequests.requests,
            totals: {
              active: demoRequests.totals.active,
              all: demoRequests.totals.all,
            },
          },
          payoutVerifications,
          updatedAt: new Date().toISOString(),
        }}
      />
    </div>
  );
}
