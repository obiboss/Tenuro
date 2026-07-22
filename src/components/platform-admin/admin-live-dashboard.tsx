"use client";

import { useEffect, useState } from "react";
import { AdminDashboardMetrics } from "@/components/platform-admin/admin-dashboard-metrics";
import { AdminDemoRequestPreview } from "@/components/platform-admin/admin-demo-request-preview";
import { AdminPayoutVerificationPreview } from "@/components/platform-admin/admin-payout-verification-preview";
import { AdminRecentActivity } from "@/components/platform-admin/admin-recent-activity";
import type { PlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";
import type { DemoRequestRow } from "@/server/repositories/demo-requests.repository";
import type { PlatformAdminDashboard } from "@/server/services/platform-admin-dashboard.service";
import type { PlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";

type AdminLiveDashboardData = {
  dashboard: PlatformAdminDashboard;
  demoRequests: {
    requests: DemoRequestRow[];
    totals: {
      active: number;
      all: number;
    };
  };
  payoutVerifications: PlatformAdminPayoutVerificationQueue;
  updatedAt: string;
};

type AdminLiveDashboardProps = {
  period: PlatformAdminDashboardPeriod;
  initialData: AdminLiveDashboardData;
};

const LIVE_UPDATE_INTERVAL_MS = 10_000;

export function AdminLiveDashboard({
  period,
  initialData,
}: AdminLiveDashboardProps) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const controller = new AbortController();
    let requestInFlight = false;

    async function updateDashboard() {
      if (requestInFlight || controller.signal.aborted) {
        return;
      }

      requestInFlight = true;

      try {
        const response = await fetch(
          `/api/admin/dashboard?period=${encodeURIComponent(period)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const nextData = (await response.json()) as AdminLiveDashboardData;

        if (!controller.signal.aborted) {
          setData(nextData);
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          // A later update will retry after a temporary connection failure.
        }
      } finally {
        requestInFlight = false;
      }
    }

    const intervalId = window.setInterval(
      () => void updateDashboard(),
      LIVE_UPDATE_INTERVAL_MS,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void updateDashboard();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [period]);

  return (
    <>
      <p className="sr-only" aria-live="polite">
        Dashboard last updated {data.updatedAt}
      </p>

      <AdminDashboardMetrics
        metrics={data.dashboard.metrics}
        periodLabel={data.dashboard.periodLabel}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-2 xl:gap-6">
        <AdminDemoRequestPreview
          requests={data.demoRequests.requests}
          total={data.demoRequests.totals.active}
        />

        <AdminPayoutVerificationPreview
          accounts={data.payoutVerifications.pending}
          total={data.payoutVerifications.totals.pending}
        />
      </div>

      <div className="mt-5 md:mt-6">
        <AdminRecentActivity
          activity={data.dashboard.recentActivity}
          periodLabel={data.dashboard.periodLabel}
        />
      </div>
    </>
  );
}
