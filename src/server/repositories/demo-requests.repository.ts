import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DemoRequestStatus,
  DemoTimeWindow,
  DemoWorkspaceType,
} from "@/server/validators/demo-request.schema";

export type DemoRequestNotificationStatus =
  | "pending"
  | "sent"
  | "failed"
  | "not_configured";

export type DemoRequestRow = {
  id: string;
  workspace_type: DemoWorkspaceType;
  full_name: string;
  company_name: string;
  work_email: string;
  phone_number: string;
  preferred_date: string;
  preferred_time_window: DemoTimeWindow;
  message: string | null;
  status: DemoRequestStatus;
  source_path: string;
  request_fingerprint_hash: string;
  notification_status: DemoRequestNotificationStatus;
  notification_provider_id: string | null;
  notification_error: string | null;
  contacted_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const DEMO_REQUEST_SELECT = [
  "id",
  "workspace_type",
  "full_name",
  "company_name",
  "work_email",
  "phone_number",
  "preferred_date",
  "preferred_time_window",
  "message",
  "status",
  "source_path",
  "request_fingerprint_hash",
  "notification_status",
  "notification_provider_id",
  "notification_error",
  "contacted_at",
  "scheduled_at",
  "completed_at",
  "cancelled_at",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

const OPEN_DEMO_REQUEST_STATUSES: DemoRequestStatus[] = [
  "pending",
  "contacted",
  "scheduled",
];

export async function countDemoRequestsForFingerprintSince(
  supabase: SupabaseClient,
  params: {
    fingerprintHash: string;
    createdSince: string;
  },
) {
  const { count, error } = await supabase
    .from("demo_requests")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint_hash", params.fingerprintHash)
    .gte("created_at", params.createdSince);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function findRecentOpenDemoRequestByField(
  supabase: SupabaseClient,
  params: {
    workspaceType: DemoWorkspaceType;
    field: "phone_number" | "work_email";
    value: string;
    createdSince: string;
  },
) {
  const { data, error } = await supabase
    .from("demo_requests")
    .select(DEMO_REQUEST_SELECT)
    .eq("workspace_type", params.workspaceType)
    .eq(params.field, params.value)
    .in("status", OPEN_DEMO_REQUEST_STATUSES)
    .gte("created_at", params.createdSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<DemoRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function findRecentOpenDemoRequestByIdentity(
  supabase: SupabaseClient,
  params: {
    workspaceType: DemoWorkspaceType;
    phoneNumber: string;
    workEmail: string;
    createdSince: string;
  },
) {
  const phoneMatch = await findRecentOpenDemoRequestByField(supabase, {
    workspaceType: params.workspaceType,
    field: "phone_number",
    value: params.phoneNumber,
    createdSince: params.createdSince,
  });

  if (phoneMatch) {
    return phoneMatch;
  }

  return findRecentOpenDemoRequestByField(supabase, {
    workspaceType: params.workspaceType,
    field: "work_email",
    value: params.workEmail,
    createdSince: params.createdSince,
  });
}

export async function createDemoRequest(
  supabase: SupabaseClient,
  params: {
    workspaceType: DemoWorkspaceType;
    fullName: string;
    companyName: string;
    workEmail: string;
    phoneNumber: string;
    preferredDate: string;
    preferredTimeWindow: DemoTimeWindow;
    message: string | null;
    sourcePath: string;
    requestFingerprintHash: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("demo_requests")
    .insert({
      workspace_type: params.workspaceType,
      full_name: params.fullName,
      company_name: params.companyName,
      work_email: params.workEmail,
      phone_number: params.phoneNumber,
      preferred_date: params.preferredDate,
      preferred_time_window: params.preferredTimeWindow,
      message: params.message,
      source_path: params.sourcePath,
      request_fingerprint_hash: params.requestFingerprintHash,
      metadata: params.metadata ?? {},
    })
    .select(DEMO_REQUEST_SELECT)
    .single<DemoRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateDemoRequestNotification(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    status: DemoRequestNotificationStatus;
    providerId?: string | null;
    errorMessage?: string | null;
  },
) {
  const { error } = await supabase
    .from("demo_requests")
    .update({
      notification_status: params.status,
      notification_provider_id: params.providerId ?? null,
      notification_error: params.errorMessage?.slice(0, 500) ?? null,
    })
    .eq("id", params.requestId);

  if (error) {
    throw error;
  }
}

export async function listDemoRequests(
  supabase: SupabaseClient,
  params: {
    limit?: number;
  } = {},
) {
  const { data, error } = await supabase
    .from("demo_requests")
    .select(DEMO_REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 100)
    .returns<DemoRequestRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateDemoRequestStatus(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    status: DemoRequestStatus;
  },
) {
  const now = new Date().toISOString();
  const statusTimestamps: Partial<DemoRequestRow> = {};

  if (params.status === "contacted") {
    statusTimestamps.contacted_at = now;
  } else if (params.status === "scheduled") {
    statusTimestamps.scheduled_at = now;
  } else if (params.status === "completed") {
    statusTimestamps.completed_at = now;
  } else if (params.status === "cancelled") {
    statusTimestamps.cancelled_at = now;
  }

  const { data, error } = await supabase
    .from("demo_requests")
    .update({
      status: params.status,
      ...statusTimestamps,
    })
    .eq("id", params.requestId)
    .select(DEMO_REQUEST_SELECT)
    .single<DemoRequestRow>();

  if (error) {
    throw error;
  }

  return data;
}
