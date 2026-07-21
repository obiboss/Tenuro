import "server-only";

import {
  ACTIVITY_MODULES,
  ACTIVITY_OUTCOMES,
  type ActivityModule,
  type ActivityOutcome,
} from "@/server/constants/activity-events";
import {
  listActivityEvents,
  listActivityJourneys,
} from "@/server/repositories/activity.repository";
import { getProfileNamesByIds } from "@/server/repositories/platform-admin-dashboard.repository";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PlatformAdminActivityFilters = {
  module?: ActivityModule;
  outcome?: ActivityOutcome;
  periodDays: 1 | 7 | 30 | 90;
  search?: string;
};

export type PlatformAdminActivityEvent = {
  id: string;
  module: ActivityModule;
  eventName: string;
  eventCategory: string;
  outcome: ActivityOutcome;
  source: string;
  actorName: string;
  actorRole: string | null;
  subjectType: string | null;
  subjectId: string | null;
  journeyKey: string | null;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PlatformAdminActivityJourney = {
  id: string;
  journeyKey: string;
  journeyType: string;
  module: ActivityModule;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  currentStep: string;
  actorName: string;
  actorRole: string | null;
  subjectType: string | null;
  subjectId: string | null;
  contactName: string | null;
  contactValue: string | null;
  lastErrorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  lastActivityAt: string;
};

export function parseActivityModule(value: string | undefined) {
  return ACTIVITY_MODULES.find((module) => module === value);
}

export function parseActivityOutcome(value: string | undefined) {
  return ACTIVITY_OUTCOMES.find((outcome) => outcome === value);
}

export function parseActivityPeriod(value: string | undefined) {
  if (value === "1" || value === "7" || value === "90") {
    return Number(value) as 1 | 7 | 90;
  }

  return 30 as const;
}

function normalizeSearch(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized.slice(0, 100) : null;
}

function getActorName(params: {
  actorProfileId: string | null;
  actorRole: string | null;
  profileNames: Map<string, string>;
}) {
  if (params.actorProfileId) {
    return params.profileNames.get(params.actorProfileId) ?? "Unknown user";
  }

  return params.actorRole === "visitor" ? "Website visitor" : "BOPA system";
}

function matchesSearch(
  search: string | null,
  values: Array<string | null | undefined>,
) {
  if (!search) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(search));
}

export async function getPlatformAdminActivity(
  filters: PlatformAdminActivityFilters,
) {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();
  const createdSince = new Date(
    Date.now() - filters.periodDays * 24 * 60 * 60 * 1_000,
  ).toISOString();
  const [eventRows, journeyRows] = await Promise.all([
    listActivityEvents(supabase, {
      module: filters.module,
      outcome: filters.outcome,
      createdSince,
      limit: 500,
    }),
    listActivityJourneys(supabase, {
      module: filters.module,
      statuses: ["in_progress", "failed"],
      limit: 250,
    }),
  ]);
  const profileIds = [
    ...new Set(
      [...eventRows, ...journeyRows]
        .map((item) => item.actor_profile_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const profileNames = await getProfileNamesByIds(supabase, profileIds);
  const search = normalizeSearch(filters.search);

  const events: PlatformAdminActivityEvent[] = eventRows
    .map((event) => ({
      id: event.id,
      module: event.module,
      eventName: event.event_name,
      eventCategory: event.event_category,
      outcome: event.outcome,
      source: event.source,
      actorName: getActorName({
        actorProfileId: event.actor_profile_id,
        actorRole: event.actor_role,
        profileNames,
      }),
      actorRole: event.actor_role,
      subjectType: event.subject_type,
      subjectId: event.subject_id,
      journeyKey: event.journey_key,
      description: event.description,
      metadata: event.metadata ?? {},
      createdAt: event.created_at,
    }))
    .filter((event) =>
      matchesSearch(search, [
        event.actorName,
        event.actorRole,
        event.eventName,
        event.description,
        event.subjectType,
        event.subjectId,
      ]),
    )
    .slice(0, 250);

  const journeys: PlatformAdminActivityJourney[] = journeyRows
    .map((journey) => ({
      id: journey.id,
      journeyKey: journey.journey_key,
      journeyType: journey.journey_type,
      module: journey.module,
      status: journey.status,
      currentStep: journey.current_step,
      actorName: getActorName({
        actorProfileId: journey.actor_profile_id,
        actorRole: journey.actor_role,
        profileNames,
      }),
      actorRole: journey.actor_role,
      subjectType: journey.subject_type,
      subjectId: journey.subject_id,
      contactName: journey.contact_name,
      contactValue: journey.contact_value,
      lastErrorMessage: journey.last_error_message,
      metadata: journey.metadata ?? {},
      startedAt: journey.started_at,
      lastActivityAt: journey.last_activity_at,
    }))
    .filter((journey) =>
      matchesSearch(search, [
        journey.actorName,
        journey.contactName,
        journey.contactValue,
        journey.journeyType,
        journey.currentStep,
        journey.lastErrorMessage,
        journey.subjectId,
      ]),
    );

  return {
    events,
    journeys,
    summary: {
      eventCount: events.length,
      unfinishedCount: journeys.filter(
        (journey) => journey.status === "in_progress",
      ).length,
      failedCount: journeys.filter((journey) => journey.status === "failed")
        .length,
    },
  };
}
