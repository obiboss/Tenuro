import { NextResponse } from "next/server";
import { parsePlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";
import { getPlatformAdminDemoRequests } from "@/server/services/demo-request.service";
import { getPlatformAdminDashboard } from "@/server/services/platform-admin-dashboard.service";
import { getPlatformAdminPayoutVerificationQueue } from "@/server/services/platform-admin-payout-verification.service";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requirePlatformAdmin();

  const url = new URL(request.url);
  const period = parsePlatformAdminDashboardPeriod(
    url.searchParams.get("period") ?? undefined,
  );
  const [dashboard, demoRequests, payoutVerifications] = await Promise.all([
    getPlatformAdminDashboard({ period }),
    getPlatformAdminDemoRequests(),
    getPlatformAdminPayoutVerificationQueue(),
  ]);

  return NextResponse.json(
    {
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
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
