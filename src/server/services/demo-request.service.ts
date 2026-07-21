import "server-only";

import { createHmac } from "node:crypto";
import { normalisePhoneNumber } from "@/lib/phone";
import {
  countDemoRequestsForFingerprintSince,
  createDemoRequest,
  findRecentOpenDemoRequestByIdentity,
  listDemoRequests,
  updateDemoRequestNotification,
  updateDemoRequestStatus,
} from "@/server/repositories/demo-requests.repository";
import { AppError } from "@/server/errors/app-error";
import { requirePlatformAdmin } from "@/server/services/platform-admin.service";
import { sendDemoRequestNotification } from "@/server/services/demo-request-email.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type {
  DemoRequestStatus,
  SubmitDemoRequestInput,
} from "@/server/validators/demo-request.schema";

const DEMO_REQUEST_RATE_LIMIT = 5;

type DemoRequestFingerprintInput = {
  forwardedFor: string | null;
  realIp: string | null;
  userAgent: string | null;
};

function getFingerprintSecret() {
  const secret =
    process.env.DEMO_REQUEST_FINGERPRINT_SECRET ??
    process.env.TENURO_SESSION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || secret.length < 32) {
    throw new AppError(
      "DEMO_REQUEST_CONFIGURATION_MISSING",
      "Demo requests are temporarily unavailable. Please WhatsApp BOPA on 0802 512 7875.",
      503,
    );
  }

  return secret;
}

export function buildDemoRequestFingerprint(
  input: DemoRequestFingerprintInput,
) {
  const forwardedIp = input.forwardedFor?.split(",")[0]?.trim();
  const clientIp = forwardedIp || input.realIp?.trim() || "unknown";
  const userAgent = input.userAgent?.trim() || "unknown";

  return createHmac("sha256", getFingerprintSecret())
    .update(`${clientIp}\n${userAgent}`)
    .digest("hex");
}

function getLagosDateString(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function assertPreferredDateIsAvailable(preferredDate: string) {
  const parsedDate = new Date(`${preferredDate}T12:00:00+01:00`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    getLagosDateString(parsedDate) !== preferredDate
  ) {
    throw new AppError("INVALID_DEMO_DATE", "Choose a valid demo date.", 400);
  }

  const now = new Date();
  const today = getLagosDateString(now);

  if (preferredDate < today) {
    throw new AppError(
      "DEMO_DATE_IN_PAST",
      "Choose today or a future date for your demo.",
      400,
    );
  }

  const latestDate = new Date(now);
  latestDate.setUTCDate(latestDate.getUTCDate() + 365);

  if (preferredDate > getLagosDateString(latestDate)) {
    throw new AppError(
      "DEMO_DATE_TOO_FAR_AHEAD",
      "Choose a demo date within the next 12 months.",
      400,
    );
  }
}

function normaliseDemoPhoneNumber(phoneNumber: string) {
  try {
    return normalisePhoneNumber(phoneNumber).e164;
  } catch {
    throw new AppError(
      "INVALID_DEMO_PHONE",
      "Enter a valid Nigerian phone number.",
      400,
    );
  }
}

async function recordNotificationOutcome(params: {
  requestId: string;
  result: Awaited<ReturnType<typeof sendDemoRequestNotification>>;
}) {
  const supabase = createSupabaseAdminClient();

  try {
    if (params.result.status === "sent") {
      await updateDemoRequestNotification(supabase, {
        requestId: params.requestId,
        status: "sent",
        providerId: params.result.providerId,
      });
      return;
    }

    if (params.result.status === "failed") {
      await updateDemoRequestNotification(supabase, {
        requestId: params.requestId,
        status: "failed",
        errorMessage: params.result.errorMessage,
      });
      return;
    }

    await updateDemoRequestNotification(supabase, {
      requestId: params.requestId,
      status: "not_configured",
    });
  } catch (error) {
    console.error("Failed to record demo notification outcome.", error);
  }
}

export async function submitPublicDemoRequest(params: {
  input: SubmitDemoRequestInput;
  fingerprintHash: string;
}) {
  if (params.input.website) {
    return {
      requestId: undefined,
      duplicate: false,
      ignored: true,
    };
  }

  assertPreferredDateIsAvailable(params.input.preferredDate);

  const supabase = createSupabaseAdminClient();
  const workEmail = params.input.workEmail.toLowerCase();
  const phoneNumber = normaliseDemoPhoneNumber(params.input.phoneNumber);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const requestCount = await countDemoRequestsForFingerprintSince(supabase, {
    fingerprintHash: params.fingerprintHash,
    createdSince: oneHourAgo,
  });

  if (requestCount >= DEMO_REQUEST_RATE_LIMIT) {
    throw new AppError(
      "DEMO_REQUEST_RATE_LIMITED",
      "We have received several requests from this device. Please try again later.",
      429,
    );
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
  const existingRequest = await findRecentOpenDemoRequestByIdentity(supabase, {
    workspaceType: params.input.workspaceType,
    phoneNumber,
    workEmail,
    createdSince: oneDayAgo,
  });

  if (existingRequest) {
    return {
      requestId: existingRequest.id,
      duplicate: true,
      ignored: false,
    };
  }

  const request = await createDemoRequest(supabase, {
    workspaceType: params.input.workspaceType,
    fullName: params.input.fullName,
    companyName: params.input.companyName,
    workEmail,
    phoneNumber,
    preferredDate: params.input.preferredDate,
    preferredTimeWindow: params.input.preferredTimeWindow,
    message: params.input.message ?? null,
    sourcePath: `/contact?workspace=${params.input.workspaceType}`,
    requestFingerprintHash: params.fingerprintHash,
    metadata: {
      submitted_from: `${params.input.workspaceType}_landing_page`,
    },
  });

  const notificationResult = await sendDemoRequestNotification(request);
  await recordNotificationOutcome({
    requestId: request.id,
    result: notificationResult,
  });

  return {
    requestId: request.id,
    duplicate: false,
    ignored: false,
  };
}

export async function getPlatformAdminDemoRequests() {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();
  const requests = await listDemoRequests(supabase, { limit: 100 });

  return {
    requests,
    totals: {
      pending: requests.filter((request) => request.status === "pending")
        .length,
      scheduled: requests.filter((request) => request.status === "scheduled")
        .length,
      completed: requests.filter((request) => request.status === "completed")
        .length,
      all: requests.length,
    },
  };
}

export async function changePlatformAdminDemoRequestStatus(params: {
  requestId: string;
  status: DemoRequestStatus;
}) {
  await requirePlatformAdmin();

  const supabase = createSupabaseAdminClient();

  return updateDemoRequestStatus(supabase, params);
}
