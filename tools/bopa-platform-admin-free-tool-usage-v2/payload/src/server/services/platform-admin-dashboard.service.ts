import "server-only";

import {
  countActiveProfiles,
  countActiveUnverifiedPayoutAccounts,
  countPendingPayoutAccountsCreatedBetween,
  countProfilesCreatedBetween,
  countVerifiedPayoutAccounts,
  countVerifiedPayoutAccountsBetween,
  getGeneratedAgreementSummariesByIds,
  getGeneratedReceiptSummariesByIds,
  getProfileNamesByIds,
  getPublicToolLeadsByIds,
  listAgreementUsageEventsBetween,
  listReceiptUsageEventsBetween,
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

export type PlatformAdminFreeToolUsageItem = {
  id: string;
  tool: "receipt" | "agreement";
  eventType: string;
  actionLabel: string;
  personName: string;
  phoneNumber: string | null;
  email: string | null;
  accountStatus: "visitor" | "bopa_account";
  documentReference: string;
  sourcePath: string;
  createdAt: string;
};

export type PlatformAdminDashboard = {
  period: PlatformAdminDashboardPeriod;
  periodLabel: string;
  metrics: PlatformAdminDashboardMetric[];
  freeToolUsage: PlatformAdminFreeToolUsageItem[];
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


const FREE_TOOL_ACTION_LABELS: Record<string, string> = {
  receipt_generated: "Generated a free receipt",
  receipt_downloaded: "Downloaded a free receipt",
  receipt_whatsapp_shared: "Shared a free receipt on WhatsApp",
  receipt_attached_to_account: "Saved a free receipt to BOPA",
  agreement_generated: "Generated a tenancy agreement",
  agreement_previewed: "Viewed a tenancy agreement preview",
  agreement_downloaded: "Downloaded a tenancy agreement",
  agreement_whatsapp_shared: "Shared a tenancy agreement on WhatsApp",
  agreement_attached_to_account: "Saved a tenancy agreement to BOPA",
  signup_prompt_viewed: "Viewed the account invitation",
  signup_started: "Started creating a BOPA account",
  signup_completed: "Created a BOPA account",
};

function getFreeToolActionLabel(eventType: string, tool: "receipt" | "agreement") {
  return (
    FREE_TOOL_ACTION_LABELS[eventType] ??
    (tool === "receipt"
      ? "Used the free receipt generator"
      : "Used the tenancy agreement generator")
  );
}

function getShortDocumentReference(params: {
  tool: "receipt" | "agreement";
  documentId: string | null;
  storedReference: string | null;
}) {
  if (params.storedReference?.trim()) {
    return params.storedReference.trim();
  }

  if (!params.documentId) {
    return params.tool === "receipt" ? "Receipt" : "Tenancy Agreement";
  }

  const shortId = params.documentId.slice(0, 8).toUpperCase();

  return params.tool === "receipt"
    ? `Receipt ${shortId}`
    : `Agreement ${shortId}`;
}

function mapFreeToolUsage(params: {
  tool: "receipt" | "agreement";
  event: {
    id: string;
    lead_id: string | null;
    profile_id: string | null;
    event_type: string;
    source_path: string;
    created_at: string;
  };
  documentId: string | null;
  document:
    | {
        owner_profile_id: string | null;
        landlord_full_name: string;
        landlord_phone_number: string;
        landlord_email: string | null;
      }
    | null;
  storedReference: string | null;
  lead:
    | {
        owner_profile_id: string | null;
        landlord_full_name: string;
        landlord_phone_number: string;
        landlord_email: string | null;
      }
    | null;
}): PlatformAdminFreeToolUsageItem {
  const personName =
    params.lead?.landlord_full_name?.trim() ||
    params.document?.landlord_full_name?.trim() ||
    "Unknown visitor";
  const phoneNumber =
    params.lead?.landlord_phone_number?.trim() ||
    params.document?.landlord_phone_number?.trim() ||
    null;
  const email =
    params.lead?.landlord_email?.trim() ||
    params.document?.landlord_email?.trim() ||
    null;
  const accountStatus =
    params.event.profile_id ||
    params.lead?.owner_profile_id ||
    params.document?.owner_profile_id
      ? ("bopa_account" as const)
      : ("visitor" as const);

  return {
    id: `${params.tool}-${params.event.id}`,
    tool: params.tool,
    eventType: params.event.event_type,
    actionLabel: getFreeToolActionLabel(params.event.event_type, params.tool),
    personName,
    phoneNumber,
    email,
    accountStatus,
    documentReference: getShortDocumentReference({
      tool: params.tool,
      documentId: params.documentId,
      storedReference: params.storedReference,
    }),
    sourcePath: params.event.source_path,
    createdAt: params.event.created_at ?? "",
  };
}

function mapFreeToolActivity(
  item: PlatformAdminFreeToolUsageItem,
): PlatformAdminDashboardActivityItem {
  const toolLabel =
    item.tool === "receipt"
      ? "Free receipt generator"
      : "Tenancy agreement generator";

  return {
    id: `free-tool-${item.id}`,
    eventType: `public_tool.${item.eventType}`,
    title: item.actionLabel,
    description: `${toolLabel} · ${item.documentReference}`,
    actorName: item.personName,
    createdAt: item.createdAt,
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
    receiptUsageEvents,
    agreementUsageEvents,
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
    listReceiptUsageEventsBetween(supabase, {
      startInclusive: bounds.currentStart,
      endExclusive: bounds.currentEnd,
      limit: 100,
    }),
    listAgreementUsageEventsBetween(supabase, {
      startInclusive: bounds.currentStart,
      endExclusive: bounds.currentEnd,
      limit: 100,
    }),
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

  const [publicToolLeads, generatedReceipts, generatedAgreements] =
    await Promise.all([
      getPublicToolLeadsByIds(supabase, [
        ...receiptUsageEvents.map((event) => event.lead_id),
        ...agreementUsageEvents.map((event) => event.lead_id),
      ]),
      getGeneratedReceiptSummariesByIds(
        supabase,
        receiptUsageEvents.map((event) => event.receipt_id),
      ),
      getGeneratedAgreementSummariesByIds(
        supabase,
        agreementUsageEvents.map((event) => event.agreement_id),
      ),
    ]);

  const leadById = new Map(
    publicToolLeads.map((lead) => [lead.id, lead]),
  );
  const receiptById = new Map(
    generatedReceipts.map((receipt) => [receipt.id, receipt]),
  );
  const agreementById = new Map(
    generatedAgreements.map((agreement) => [agreement.id, agreement]),
  );

  const freeToolUsage = [
    ...receiptUsageEvents.map((event) => {
      const receipt = event.receipt_id
        ? receiptById.get(event.receipt_id) ?? null
        : null;

      return mapFreeToolUsage({
        tool: "receipt",
        event,
        documentId: event.receipt_id,
        document: receipt,
        storedReference: receipt?.receipt_number ?? null,
        lead: event.lead_id
          ? leadById.get(event.lead_id) ?? null
          : null,
      });
    }),
    ...agreementUsageEvents.map((event) => {
      const agreement = event.agreement_id
        ? agreementById.get(event.agreement_id) ?? null
        : null;

      return mapFreeToolUsage({
        tool: "agreement",
        event,
        documentId: event.agreement_id,
        document: agreement,
        storedReference: agreement?.agreement_title ?? null,
        lead: event.lead_id
          ? leadById.get(event.lead_id) ?? null
          : null,
      });
    }),
  ]
    .sort((left, right) => {
      const rightTime = Date.parse(right.createdAt);
      const leftTime = Date.parse(left.createdAt);

      return (
        (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0)
      );
    })
    .slice(0, 50);

  const recentActivity = [
    ...signups.map(mapSignupActivity),
    ...payoutEvents.map((event) =>
      mapPayoutAuditActivity({ event, actorNames }),
    ),
    ...freeToolUsage.map(mapFreeToolActivity),
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
    freeToolUsage,
    recentActivity,
  };
}
