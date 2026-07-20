import type { SupabaseClient } from "@supabase/supabase-js";
import { AUDIT_EVENT_TYPES } from "@/server/constants/audit-events";

export type PlatformAdminProfileSignupRow = {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone_number: string | null;
  created_at: string;
};

export type PlatformAdminPayoutAuditRow = {
  id: string;
  event_type: string;
  description: string;
  actor_profile_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformAdminFreeToolUsageEventRow = {
  id: string;
  lead_id: string | null;
  document_id: string | null;
  profile_id: string | null;
  event_type: string;
  source_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformAdminPublicToolLeadRow = {
  id: string;
  owner_profile_id: string | null;
  landlord_full_name: string;
  landlord_phone_number: string;
  landlord_email: string | null;
  source_tool: "receipt" | "agreement";
  signup_status: "anonymous" | "account_created" | "attached" | "discarded";
};

const PAYOUT_AUDIT_EVENT_TYPES = [
  AUDIT_EVENT_TYPES.payoutVerificationPending,
  AUDIT_EVENT_TYPES.payoutAccountCreated,
  AUDIT_EVENT_TYPES.bankAccountSetup,
] as const;

export async function countActiveProfiles(
  supabase: SupabaseClient,
  params?: {
    createdBefore?: string;
  },
) {
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (params?.createdBefore) {
    query = query.lt("created_at", params.createdBefore);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function countProfilesCreatedBetween(
  supabase: SupabaseClient,
  params: {
    startInclusive: string;
    endExclusive: string;
  },
) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", params.startInclusive)
    .lt("created_at", params.endExclusive);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function countActiveUnverifiedPayoutAccounts(
  supabase: SupabaseClient,
) {
  const [landlordCount, agentCount] = await Promise.all([
    supabase
      .from("landlord_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("verification_status", "unverified"),
    supabase
      .from("agent_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("verification_status", "unverified"),
  ]);

  if (landlordCount.error) {
    throw landlordCount.error;
  }

  if (agentCount.error) {
    throw agentCount.error;
  }

  return (landlordCount.count ?? 0) + (agentCount.count ?? 0);
}

export async function countVerifiedPayoutAccounts(
  supabase: SupabaseClient,
) {
  const [landlordCount, agentCount] = await Promise.all([
    supabase
      .from("landlord_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
    supabase
      .from("agent_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified"),
  ]);

  if (landlordCount.error) {
    throw landlordCount.error;
  }

  if (agentCount.error) {
    throw agentCount.error;
  }

  return (landlordCount.count ?? 0) + (agentCount.count ?? 0);
}

export async function countVerifiedPayoutAccountsBetween(
  supabase: SupabaseClient,
  params: {
    startInclusive: string;
    endExclusive: string;
  },
) {
  const [landlordCount, agentCount] = await Promise.all([
    supabase
      .from("landlord_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .gte("verified_at", params.startInclusive)
      .lt("verified_at", params.endExclusive),
    supabase
      .from("agent_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "verified")
      .gte("verified_at", params.startInclusive)
      .lt("verified_at", params.endExclusive),
  ]);

  if (landlordCount.error) {
    throw landlordCount.error;
  }

  if (agentCount.error) {
    throw agentCount.error;
  }

  return (landlordCount.count ?? 0) + (agentCount.count ?? 0);
}

export async function countPendingPayoutAccountsCreatedBetween(
  supabase: SupabaseClient,
  params: {
    startInclusive: string;
    endExclusive: string;
  },
) {
  const [landlordCount, agentCount] = await Promise.all([
    supabase
      .from("landlord_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", params.startInclusive)
      .lt("created_at", params.endExclusive),
    supabase
      .from("agent_paystack_accounts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", params.startInclusive)
      .lt("created_at", params.endExclusive),
  ]);

  if (landlordCount.error) {
    throw landlordCount.error;
  }

  if (agentCount.error) {
    throw agentCount.error;
  }

  return (landlordCount.count ?? 0) + (agentCount.count ?? 0);
}

export async function listRecentProfileSignups(
  supabase: SupabaseClient,
  limit: number,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, email, phone_number, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PlatformAdminProfileSignupRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listRecentPayoutAuditEvents(
  supabase: SupabaseClient,
  limit: number,
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, event_type, description, actor_profile_id, metadata, created_at")
    .in("event_type", [...PAYOUT_AUDIT_EVENT_TYPES])
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<PlatformAdminPayoutAuditRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getProfileNamesByIds(
  supabase: SupabaseClient,
  profileIds: string[],
) {
  if (profileIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds)
    .returns<{ id: string; full_name: string }[]>();

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Unknown user",
    ]),
  );
}

export async function listReceiptUsageEventsBetween(
  supabase: SupabaseClient,
  params: {
    startInclusive: string;
    endExclusive: string;
    limit: number;
  },
): Promise<PlatformAdminFreeToolUsageEventRow[]> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 100);

  const { data, error } = await supabase
    .from("receipt_usage_events")
    .select(
      "id, lead_id, receipt_id, profile_id, event_type, source_path, metadata, created_at",
    )
    .gte("created_at", params.startInclusive)
    .lt("created_at", params.endExclusive)
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .returns<
      Array<{
        id: string;
        lead_id: string | null;
        receipt_id: string | null;
        profile_id: string | null;
        event_type: string;
        source_path: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>
    >();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    document_id: row.receipt_id,
    profile_id: row.profile_id,
    event_type: row.event_type,
    source_path: row.source_path,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }));
}

export async function listAgreementUsageEventsBetween(
  supabase: SupabaseClient,
  params: {
    startInclusive: string;
    endExclusive: string;
    limit: number;
  },
): Promise<PlatformAdminFreeToolUsageEventRow[]> {
  const safeLimit = Math.min(Math.max(params.limit, 1), 100);

  const { data, error } = await supabase
    .from("agreement_usage_events")
    .select(
      "id, lead_id, agreement_id, profile_id, event_type, source_path, metadata, created_at",
    )
    .gte("created_at", params.startInclusive)
    .lt("created_at", params.endExclusive)
    .order("created_at", { ascending: false })
    .limit(safeLimit)
    .returns<
      Array<{
        id: string;
        lead_id: string | null;
        agreement_id: string | null;
        profile_id: string | null;
        event_type: string;
        source_path: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>
    >();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    document_id: row.agreement_id,
    profile_id: row.profile_id,
    event_type: row.event_type,
    source_path: row.source_path,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }));
}

export async function listPublicToolLeadsByIds(
  supabase: SupabaseClient,
  leadIds: string[],
): Promise<PlatformAdminPublicToolLeadRow[]> {
  const uniqueLeadIds = [...new Set(leadIds.filter(Boolean))];

  if (uniqueLeadIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("public_tool_leads")
    .select(
      [
        "id",
        "owner_profile_id",
        "landlord_full_name",
        "landlord_phone_number",
        "landlord_email",
        "source_tool",
        "signup_status",
      ].join(","),
    )
    .in("id", uniqueLeadIds)
    .returns<PlatformAdminPublicToolLeadRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
