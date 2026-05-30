import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationRow = {
  id: string;
  landlord_id: string;
  tenant_id: string | null;
  channel: "whatsapp" | "sms" | "email" | "in_app";
  notification_type:
    | "rent_due"
    | "overdue"
    | "receipt"
    | "onboarding_invite"
    | "renewal_notice"
    | "increment_notice"
    | "balance_confirmation"
    | "custom";
  message_body: string;
  status: "pending" | "sent" | "delivered" | "failed";
  created_at: string;
  tenants: {
    id: string;
    full_name: string;
    phone_number: string;
  } | null;
};

const NOTIFICATION_SELECT = `
  id,
  landlord_id,
  tenant_id,
  channel,
  notification_type,
  message_body,
  status,
  created_at,
  tenants (
    id,
    full_name,
    phone_number
  )
`;

export async function createNotification(
  supabase: SupabaseClient,
  params: {
    landlordId: string;
    tenantId?: string | null;
    channel: NotificationRow["channel"];
    notificationType: NotificationRow["notification_type"];
    messageBody: string;
  },
) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      landlord_id: params.landlordId,
      tenant_id: params.tenantId ?? null,
      channel: params.channel,
      notification_type: params.notificationType,
      message_body: params.messageBody,
      status: "pending",
    })
    .select(NOTIFICATION_SELECT)
    .single<NotificationRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listRecentNotificationsForLandlord(
  supabase: SupabaseClient,
  landlordId: string,
  limit = 30,
) {
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    throw error;
  }

  return data;
}
