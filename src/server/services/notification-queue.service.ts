import "server-only";

import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "@/server/constants/notification-types";
import {
  createNotification,
  listRecentNotificationsForLandlord,
} from "@/server/repositories/notifications.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlordPlatformOperator } from "@/server/services/auth.service";

export async function queueLandlordInAppNotification(params: {
  landlordId: string | null;
  tenantId?: string | null;
  messageBody: string;
}) {
  if (!params.landlordId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  return createNotification(supabase, {
    landlordId: params.landlordId,
    tenantId: params.tenantId ?? null,
    channel: NOTIFICATION_CHANNELS.inApp,
    notificationType: NOTIFICATION_TYPES.custom,
    messageBody: params.messageBody,
  });
}

export async function queueLandlordPreparedWhatsappNotification(params: {
  landlordId: string | null;
  tenantId?: string | null;
  messageBody: string;
}) {
  if (!params.landlordId) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  return createNotification(supabase, {
    landlordId: params.landlordId,
    tenantId: params.tenantId ?? null,
    channel: NOTIFICATION_CHANNELS.whatsapp,
    notificationType: NOTIFICATION_TYPES.custom,
    messageBody: params.messageBody,
  });
}

export async function getCurrentLandlordNotifications() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return listRecentNotificationsForLandlord(supabase, landlord.id);
}
