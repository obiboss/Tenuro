import "server-only";

import crypto from "node:crypto";
import { headers } from "next/headers";
import type {
  ActivityJourneyStatus,
  ActivityModule,
  ActivityOutcome,
} from "@/server/constants/activity-events";
import {
  completeOpenSignupJourneysForProfile,
  insertActivityEvent,
  upsertActivityJourney,
  type ActivityEventInsert,
  type ActivityJourneyUpsert,
} from "@/server/repositories/activity.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const SENSITIVE_METADATA_KEY =
  /(password|passcode|secret|token|authorization|cookie|account_?number|bvn|id_?number|raw_?payload|signature|document_?body)/i;

function sanitizeActivityValue(value: unknown, depth: number): unknown {
  if (depth > 4) {
    return "[omitted]";
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((item) => sanitizeActivityValue(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_METADATA_KEY.test(key)
          ? "[redacted]"
          : sanitizeActivityValue(item, depth + 1),
      ]),
    );
  }

  if (typeof value === "string") {
    return value.slice(0, 500);
  }

  return value;
}

function sanitizeActivityMetadata(metadata?: Record<string, unknown>) {
  return (sanitizeActivityValue(metadata ?? {}, 0) ?? {}) as Record<
    string,
    unknown
  >;
}

async function getActivityRequestContext() {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");

    return {
      requestId: requestHeaders.get("x-request-id"),
      ipAddress:
        forwardedFor?.split(",")[0]?.trim() ||
        requestHeaders.get("x-real-ip")?.trim() ||
        null,
      userAgent: requestHeaders.get("user-agent"),
    };
  } catch {
    return {
      requestId: null,
      ipAddress: null,
      userAgent: null,
    };
  }
}

export async function recordActivityEvent(
  input: Omit<ActivityEventInsert, "metadata"> & {
    metadata?: Record<string, unknown>;
  },
) {
  const requestContext = await getActivityRequestContext();

  return insertActivityEvent(createSupabaseAdminClient(), {
    ...input,
    metadata: sanitizeActivityMetadata(input.metadata),
    requestId: input.requestId ?? requestContext.requestId,
    ipAddress: input.ipAddress ?? requestContext.ipAddress,
    userAgent: input.userAgent ?? requestContext.userAgent,
  });
}

export async function recordActivityEventSafely(
  input: Omit<ActivityEventInsert, "metadata"> & {
    metadata?: Record<string, unknown>;
  },
) {
  try {
    return await recordActivityEvent(input);
  } catch (error) {
    console.error("BOPA activity event could not be recorded.", {
      eventName: input.eventName,
      error: error instanceof Error ? error.message : "Unknown activity error",
    });
    return null;
  }
}

export function createActivityJourneyKey(params: {
  journeyType: string;
  module: ActivityModule;
}) {
  return `${params.journeyType}:${params.module}:${crypto.randomUUID()}`;
}

export async function setActivityJourney(
  input: Omit<ActivityJourneyUpsert, "metadata"> & {
    metadata?: Record<string, unknown>;
    eventName?: string;
    eventCategory?: string;
    description?: string;
    eventOutcome?: ActivityOutcome;
  },
) {
  const sanitizedMetadata = sanitizeActivityMetadata(input.metadata);
  const supabase = createSupabaseAdminClient();
  const journeyId = await upsertActivityJourney(supabase, {
    ...input,
    metadata: sanitizedMetadata,
  });

  if (input.eventName && input.description) {
    await recordActivityEvent({
      module: input.module,
      eventName: input.eventName,
      eventCategory: input.eventCategory ?? "onboarding",
      outcome:
        input.eventOutcome ??
        (input.status === "completed"
          ? "succeeded"
          : input.status === "failed"
            ? "failed"
            : input.status === "cancelled"
              ? "cancelled"
              : "in_progress"),
      actorProfileId: input.actorProfileId,
      actorRole: input.actorRole,
      workspaceType: input.workspaceType,
      workspaceId: input.workspaceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      journeyKey: input.journeyKey,
      description: input.description,
      metadata: sanitizedMetadata,
    });
  }

  return journeyId;
}

export async function setActivityJourneySafely(
  input: Omit<ActivityJourneyUpsert, "metadata"> & {
    metadata?: Record<string, unknown>;
    eventName?: string;
    eventCategory?: string;
    description?: string;
    eventOutcome?: ActivityOutcome;
  },
) {
  try {
    return await setActivityJourney(input);
  } catch (error) {
    console.error("BOPA activity journey could not be recorded.", {
      journeyKey: input.journeyKey,
      error: error instanceof Error ? error.message : "Unknown activity error",
    });
    return null;
  }
}

export function getActivityErrorDetails(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;

    return {
      code: typeof code === "string" ? code : "UNKNOWN_ERROR",
      message:
        error instanceof Error ? error.message.slice(0, 500) : "Action failed.",
    };
  }

  return {
    code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    message:
      error instanceof Error ? error.message.slice(0, 500) : "Action failed.",
  };
}

export function mapJourneyStatusToEventOutcome(
  status: ActivityJourneyStatus,
): ActivityOutcome {
  if (status === "completed") {
    return "succeeded";
  }

  return status === "in_progress" ? "in_progress" : status;
}

export async function completeSignupJourneyAfterVerifiedLoginSafely(params: {
  profileId: string;
  role: string;
  module: ActivityModule;
}) {
  try {
    const journeys = await completeOpenSignupJourneysForProfile(
      createSupabaseAdminClient(),
      { profileId: params.profileId },
    );

    await Promise.all(
      journeys.map((journey) =>
        recordActivityEvent({
          module: params.module,
          eventName: `${params.module}.signup.completed`,
          eventCategory: "authentication",
          outcome: "succeeded",
          actorProfileId: params.profileId,
          actorRole: params.role,
          subjectType: "profiles",
          subjectId: params.profileId,
          journeyKey: journey.journey_key,
          description: `${params.role} sign-up completed after verified sign-in.`,
          metadata: {
            completion_step: "first_verified_sign_in",
          },
        }),
      ),
    );
  } catch (error) {
    console.error("Open sign-up journey could not be completed.", {
      profileId: params.profileId,
      error: error instanceof Error ? error.message : "Unknown activity error",
    });
  }
}
