import "server-only";

import {
  countActiveProfiles,
  countActiveUnverifiedPayoutAccounts,
  countPendingPayoutAccountsCreatedBetween,
  countProfilesCreatedBetween,
  countVerifiedPayoutAccounts,
  countVerifiedPayoutAccountsBetween,
  getProfileNamesByIds,
  listRecentPayoutAuditEvents,
  listRecentProfileSignups,
} from "@/server/repositories/platform-admin-dashboard.repository";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { PlatformAdminDashboardPeriod } from "@/lib/platform-admin-navigation";

export type PlatformAdminMetricTrendDirection = "up" | "down" | "neutral";

export type PlatformAdminDashboardMetric = {
  key: string;
  title: string;
  value: number;
  changePercent: number;
  trendDirection: PlatformAdminMetricTrendDirection;
  comparisonLabel: string;
};

export type PlatformAdminDashboardActivityItem = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  actorName: string;
  createdAt: string;
};

export type PlatformAdminDashboard = {
  period: PlatformAdminDashboardPeriod;
  periodLabel: string;
  metrics: PlatformAdminDashboardMetric[];
  recentActivity: PlatformAdminDashboardActivityItem[];
};

type PeriodBounds = {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
};

const PERIOD_LABELS: Record<PlatformAdminDashboardPeriod, string> = {
  day: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 12 months",
};

const COMPARISON_LABELS: Record<PlatformAdminDashboardPeriod, string> = {
  day: "vs yesterday",
  week: "vs previous 7 days",
  month: "vs previous 30 days",
  year: "vs previous 12 months",
};

function getPeriodBounds(period: PlatformAdminDashboardPeriod): PeriodBounds {
  const now = new Date();
  const currentEnd = now.toISOString();
  const currentStartDate = new Date(now);

  if (period === "day") {
    currentStartDate.setHours(0, 0, 0, 0);
    const previousEndDate = new Date(currentStartDate);
    const previousStartDate = new Date(currentStartDate);
    previousStartDate.setDate(previousStartDate.getDate() - 1);

    return {
      currentStart: currentStartDate.toISOString(),
      currentEnd,
      previousStart: previousStartDate.toISOString(),
      previousEnd: previousEndDate.toISOString(),
    };
  }

  const dayOffsets: Record<
    Exclude<PlatformAdminDashboardPeriod, "day">,
    number
  > = {
    week: 7,
    month: 30,
    year: 365,
  };

  const offsetDays = dayOffsets[period];
  currentStartDate.setDate(currentStartDate.getDate() - offsetDays);

  const previousEndDate = new Date(currentStartDate);
  const previousStartDate = new Date(currentStartDate);
  previousStartDate.setDate(previousStartDate.getDate() - offsetDays);

  return {
    currentStart: currentStartDate.toISOString(),
    currentEnd,
    previousStart: previousStartDate.toISOString(),
    previousEnd: previousEndDate.toISOString(),
  };
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return {
        changePercent: 0,
        trendDirection: "neutral" as const,
      };
    }

    return {
      changePercent: 100,
      trendDirection: "up" as const,
    };
  }

  const rawChange = ((current - previous) / previous) * 100;
  const changePercent = Number.isFinite(rawChange) ? Math.abs(rawChange) : 0;

  return {
    changePercent,
    trendDirection:
      rawChange > 0
        ? ("up" as const)
        : rawChange < 0
          ? ("down" as const)
          : ("neutral" as const),
  };
}

function readMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function formatRoleLabel(role: string) {
  if (role === "platform_admin") {
    return "Platform admin";
  }

  if (role === "landlord") {
    return "Landlord";
  }

  if (role === "agent") {
    return "Agent";
  }

  if (role === "tenant") {
    return "Tenant";
  }

  return role;
}

function mapSignupActivity(
  signup: Awaited<ReturnType<typeof listRecentProfileSignups>>[number],
): PlatformAdminDashboardActivityItem {
  return {
    id: `signup-${signup.id}`,
    eventType: "user.signup",
    title: "New sign-up",
    description: `${formatRoleLabel(signup.role)} account created on BOPA.`,
    actorName: signup.full_name?.trim() || "Unknown user",
    createdAt: signup.created_at ?? "",
  };
}

function mapPayoutAuditActivity(params: {
  event: Awaited<ReturnType<typeof listRecentPayoutAuditEvents>>[number];
  actorNames: Map<string, string>;
}): PlatformAdminDashboardActivityItem {
  const metadata = params.event.metadata ?? {};
  const metadataName =
    readMetadataText(metadata, "business_name") ??
    readMetadataText(metadata, "owner_name") ??
    readMetadataText(metadata, "account_name");
  const actorName =
    (params.event.actor_profile_id
      ? params.actorNames.get(params.event.actor_profile_id)
      : null) ??
    metadataName ??
    "System";

  return {
    id: `audit-${params.event.id}`,
    eventType: params.event.event_type,
    title: "Payout verification activity",
    description: params.event.description,
    actorName,
    createdAt: params.event.created_at ?? "",
  };
}

export async function getPlatformAdminDashboard(params: {
  period: PlatformAdminDashboardPeriod;
}): Promise<PlatformAdminDashboard> {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();
  const bounds = getPeriodBounds(params.period);
  const comparisonLabel = COMPARISON_LABELS[params.period];

  const [
    totalActiveUsers,
    previousTotalActiveUsers,
    newSignupsCurrent,
    newSignupsPrevious,
    verifiedPayoutTotal,
    verifiedPayoutCurrent,
    verifiedPayoutPrevious,
    pendingPayoutCurrent,
    pendingPayoutCreatedCurrent,
    pendingPayoutCreatedPrevious,
    recentSignups,
    recentPayoutEvents,
  ] = await Promise.all([
    countActiveProfiles(supabase),
    countActiveProfiles(supabase, {
      createdBefore: bounds.currentStart,
    }),
    countProfilesCreatedBetween(supabase, {
      startInclusive: bounds.currentStart,
      endExclusive: bounds.currentEnd,
    }),
    countProfilesCreatedBetween(supabase, {
      startInclusive: bounds.previousStart,
      endExclusive: bounds.previousEnd,
    }),
    countVerifiedPayoutAccounts(supabase),
    countVerifiedPayoutAccountsBetween(supabase, {
      startInclusive: bounds.currentStart,
      endExclusive: bounds.currentEnd,
    }),
    countVerifiedPayoutAccountsBetween(supabase, {
      startInclusive: bounds.previousStart,
      endExclusive: bounds.previousEnd,
    }),
    countActiveUnverifiedPayoutAccounts(supabase),
    countPendingPayoutAccountsCreatedBetween(supabase, {
      startInclusive: bounds.currentStart,
      endExclusive: bounds.currentEnd,
    }),
    countPendingPayoutAccountsCreatedBetween(supabase, {
      startInclusive: bounds.previousStart,
      endExclusive: bounds.previousEnd,
    }),
    listRecentProfileSignups(supabase, 10),
    listRecentPayoutAuditEvents(supabase, 10),
  ]);

  const totalUsersTrend = calculateTrend(totalActiveUsers, previousTotalActiveUsers);
  const signupTrend = calculateTrend(newSignupsCurrent, newSignupsPrevious);
  const verifiedTrend = calculateTrend(
    verifiedPayoutCurrent,
    verifiedPayoutPrevious,
  );
  const pendingTrend = calculateTrend(
    pendingPayoutCreatedCurrent,
    pendingPayoutCreatedPrevious,
  );

  const signups = recentSignups ?? [];
  const payoutEvents = recentPayoutEvents ?? [];

  const actorIds = payoutEvents
    .map((event) => event.actor_profile_id)
    .filter((value): value is string => Boolean(value));
  const actorNames = await getProfileNamesByIds(supabase, actorIds);

  const recentActivity = [
    ...signups.map(mapSignupActivity),
    ...payoutEvents.map((event) =>
      mapPayoutAuditActivity({ event, actorNames }),
    ),
  ]
    .sort((left, right) => {
      const rightTime = Date.parse(right.createdAt);
      const leftTime = Date.parse(left.createdAt);

      return (
        (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0)
      );
    })
    .slice(0, 10);

  return {
    period: params.period,
    periodLabel: PERIOD_LABELS[params.period],
    metrics: [
      {
        key: "total_active_users",
        title: "Total Active Users",
        value: totalActiveUsers,
        changePercent: totalUsersTrend.changePercent,
        trendDirection: totalUsersTrend.trendDirection,
        comparisonLabel,
      },
      {
        key: "new_signups",
        title: "New Sign-ups",
        value: newSignupsCurrent,
        changePercent: signupTrend.changePercent,
        trendDirection: signupTrend.trendDirection,
        comparisonLabel,
      },
      {
        key: "verified_payout_accounts",
        title: "Verified Payout Accounts",
        value: verifiedPayoutTotal,
        changePercent: verifiedTrend.changePercent,
        trendDirection: verifiedTrend.trendDirection,
        comparisonLabel: `${comparisonLabel} verifications`,
      },
      {
        key: "pending_payout_accounts",
        title: "Pending Payout Accounts",
        value: pendingPayoutCurrent,
        changePercent: pendingTrend.changePercent,
        trendDirection: pendingTrend.trendDirection,
        comparisonLabel: `${comparisonLabel} new submissions`,
      },
    ],
    recentActivity,
  };
}
