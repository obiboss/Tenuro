import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityJourneyStatus,
  ActivityModule,
  ActivityOutcome,
} from "@/server/constants/activity-events";

export type ActivityEventInsert = {
  module: ActivityModule;
  eventName: string;
  eventCategory: string;
  outcome: ActivityOutcome;
  source?: "application" | "database_trigger" | "webhook" | "cron" | "system";
  actorProfileId?: string | null;
  actorRole?: string | null;
  workspaceType?: string | null;
  workspaceId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  journeyKey?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ActivityJourneyUpsert = {
  journeyKey: string;
  journeyType: string;
  module: ActivityModule;
  status: ActivityJourneyStatus;
  currentStep: string;
  actorProfileId?: string | null;
  actorRole?: string | null;
  workspaceType?: string | null;
  workspaceId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  contactName?: string | null;
  contactValue?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivityEventRow = {
  id: string;
  module: ActivityModule;
  event_name: string;
  event_category: string;
  outcome: ActivityOutcome;
  source: "application" | "database_trigger" | "webhook" | "cron" | "system";
  actor_profile_id: string | null;
  actor_role: string | null;
  workspace_type: string | null;
  workspace_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  journey_key: string | null;
  description: string;
  metadata: Record<string, unknown>;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ActivityJourneyRow = {
  id: string;
  journey_key: string;
  journey_type: string;
  module: ActivityModule;
  status: ActivityJourneyStatus;
  current_step: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  workspace_type: string | null;
  workspace_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  contact_name: string | null;
  contact_value: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
};

const ACTIVITY_EVENT_SELECT = [
  "id",
  "module",
  "event_name",
  "event_category",
  "outcome",
  "source",
  "actor_profile_id",
  "actor_role",
  "workspace_type",
  "workspace_id",
  "subject_type",
  "subject_id",
  "journey_key",
  "description",
  "metadata",
  "request_id",
  "ip_address",
  "user_agent",
  "created_at",
].join(",");

const ACTIVITY_JOURNEY_SELECT = [
  "id",
  "journey_key",
  "journey_type",
  "module",
  "status",
  "current_step",
  "actor_profile_id",
  "actor_role",
  "workspace_type",
  "workspace_id",
  "subject_type",
  "subject_id",
  "contact_name",
  "contact_value",
  "last_error_code",
  "last_error_message",
  "metadata",
  "started_at",
  "last_activity_at",
  "completed_at",
  "failed_at",
  "cancelled_at",
].join(",");

export async function insertActivityEvent(
  supabase: SupabaseClient,
  input: ActivityEventInsert,
) {
  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      module: input.module,
      event_name: input.eventName,
      event_category: input.eventCategory,
      outcome: input.outcome,
      source: input.source ?? "application",
      actor_profile_id: input.actorProfileId ?? null,
      actor_role: input.actorRole ?? null,
      workspace_type: input.workspaceType ?? null,
      workspace_id: input.workspaceId ?? null,
      subject_type: input.subjectType ?? null,
      subject_id: input.subjectId ?? null,
      journey_key: input.journeyKey ?? null,
      description: input.description,
      metadata: input.metadata ?? {},
      request_id: input.requestId ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })
    .select(ACTIVITY_EVENT_SELECT)
    .single<ActivityEventRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertActivityJourney(
  supabase: SupabaseClient,
  input: ActivityJourneyUpsert,
) {
  const { data, error } = await supabase.rpc("upsert_activity_journey", {
    p_journey_key: input.journeyKey,
    p_journey_type: input.journeyType,
    p_module: input.module,
    p_status: input.status,
    p_current_step: input.currentStep,
    p_actor_profile_id: input.actorProfileId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_workspace_type: input.workspaceType ?? null,
    p_workspace_id: input.workspaceId ?? null,
    p_subject_type: input.subjectType ?? null,
    p_subject_id: input.subjectId ?? null,
    p_contact_name: input.contactName ?? null,
    p_contact_value: input.contactValue ?? null,
    p_last_error_code: input.lastErrorCode ?? null,
    p_last_error_message: input.lastErrorMessage ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }

  return typeof data === "string" ? data : null;
}

export async function listActivityEvents(
  supabase: SupabaseClient,
  params: {
    module?: ActivityModule;
    outcome?: ActivityOutcome;
    createdSince?: string;
    limit?: number;
  },
) {
  let query = supabase
    .from("activity_events")
    .select(ACTIVITY_EVENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(params.limit ?? 250, 1), 500));

  if (params.module) {
    query = query.eq("module", params.module);
  }

  if (params.outcome) {
    query = query.eq("outcome", params.outcome);
  }

  if (params.createdSince) {
    query = query.gte("created_at", params.createdSince);
  }

  const { data, error } = await query.returns<ActivityEventRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listActivityJourneys(
  supabase: SupabaseClient,
  params: {
    module?: ActivityModule;
    statuses?: ActivityJourneyStatus[];
    limit?: number;
  },
) {
  let query = supabase
    .from("activity_journeys")
    .select(ACTIVITY_JOURNEY_SELECT)
    .order("last_activity_at", { ascending: false })
    .limit(Math.min(Math.max(params.limit ?? 100, 1), 250));

  if (params.module) {
    query = query.eq("module", params.module);
  }

  if (params.statuses?.length) {
    query = query.in("status", params.statuses);
  }

  const { data, error } = await query.returns<ActivityJourneyRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function completeOpenSignupJourneysForProfile(
  supabase: SupabaseClient,
  params: {
    profileId: string;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("activity_journeys")
    .update({
      status: "completed",
      current_step: "first_verified_sign_in",
      last_activity_at: now,
      completed_at: now,
      failed_at: null,
      cancelled_at: null,
      last_error_code: null,
      last_error_message: null,
    })
    .eq("journey_type", "signup")
    .eq("subject_type", "profiles")
    .eq("subject_id", params.profileId)
    .eq("status", "in_progress")
    .select(ACTIVITY_JOURNEY_SELECT)
    .returns<ActivityJourneyRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}
