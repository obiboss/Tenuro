import {
  Bell,
  CheckCircle2,
  Clock3,
  MessageCircle,
  MessageSquareText,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { getCurrentLandlordNotifications } from "@/server/services/notification-queue.service";
import type { NotificationRow } from "@/server/repositories/notifications.repository";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getChannelLabel(channel: NotificationRow["channel"]) {
  if (channel === "whatsapp") {
    return "WhatsApp message";
  }

  if (channel === "in_app") {
    return "In-app notification";
  }

  if (channel === "sms") {
    return "SMS";
  }

  return "Email";
}

function getStatusLabel(status: NotificationRow["status"]) {
  if (status === "sent") {
    return "Sent";
  }

  if (status === "delivered") {
    return "Delivered";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

function getTenantLabel(notification: NotificationRow) {
  if (!notification.tenants) {
    return null;
  }

  return `${notification.tenants.full_name} · ${notification.tenants.phone_number}`;
}

function NotificationStatusBadge({
  status,
}: {
  status: NotificationRow["status"];
}) {
  if (status === "failed") {
    return (
      <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-black text-danger">
        Failed
      </span>
    );
  }

  if (status === "sent" || status === "delivered") {
    return (
      <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-black text-success">
        {getStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-black text-warning">
      Pending
    </span>
  );
}

function NotificationIcon({
  channel,
}: {
  channel: NotificationRow["channel"];
}) {
  if (channel === "whatsapp") {
    return (
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
        <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
      </div>
    );
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
      <Bell aria-hidden="true" size={22} strokeWidth={2.6} />
    </div>
  );
}

function NotificationCard({ notification }: { notification: NotificationRow }) {
  const isWhatsapp = notification.channel === "whatsapp";
  const tenantLabel = getTenantLabel(notification);

  return (
    <article className="rounded-card border border-border-soft bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <NotificationIcon channel={notification.channel} />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-text-strong">
                {getChannelLabel(notification.channel)}
              </p>
              <NotificationStatusBadge status={notification.status} />
            </div>

            {tenantLabel ? (
              <p className="mt-2 text-xs font-bold text-text-muted">
                {tenantLabel}
              </p>
            ) : null}

            <p className="mt-2 text-sm font-semibold leading-6 text-text-strong">
              {notification.message_body}
            </p>

            <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-text-muted">
              <Clock3 aria-hidden="true" size={14} strokeWidth={2.6} />
              {formatNotificationDate(notification.created_at)}
            </p>
          </div>
        </div>

        {isWhatsapp ? (
          <div className="w-full md:w-56">
            <WhatsAppSendButton
              phoneNumber={notification.tenants?.phone_number ?? null}
              message={notification.message_body}
              label={
                notification.tenants?.phone_number
                  ? "Message Tenant"
                  : "Open WhatsApp"
              }
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function NotificationsPage() {
  const notifications = await getCurrentLandlordNotifications();
  const whatsappCount = notifications.filter(
    (notification) => notification.channel === "whatsapp",
  ).length;
  const inAppCount = notifications.filter(
    (notification) => notification.channel === "in_app",
  ).length;

  return (
    <main>
      <PageHeader
        title="Notifications"
        description="Review application updates and manually send prepared WhatsApp outcome messages."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Bell aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Total</p>
              <p className="font-black text-text-strong">
                {notifications.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
              <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">WhatsApp</p>
              <p className="font-black text-text-strong">{whatsappCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold-deep">
              <CheckCircle2 aria-hidden="true" size={22} strokeWidth={2.6} />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">In-app</p>
              <p className="font-black text-text-strong">{inAppCount}</p>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Recent notifications"
        description="WhatsApp messages are prepared only. They are not sent automatically."
      >
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            description="Application updates and prepared WhatsApp messages will appear here."
            icon={
              <MessageSquareText
                aria-hidden="true"
                size={24}
                strokeWidth={2.6}
              />
            }
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </main>
  );
}
