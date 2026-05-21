import { Activity, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import type { PlatformAdminDashboardActivityItem } from "@/server/services/platform-admin-dashboard.service";

type AdminRecentActivityProps = {
  activity: PlatformAdminDashboardActivityItem[];
  periodLabel: string;
};

function formatTimestamp(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

function formatEventTypeLabel(eventType: string) {
  if (eventType === "user.signup") {
    return "Sign-up";
  }

  if (eventType.includes("payout")) {
    return "Payout";
  }

  return "Activity";
}

function ActivityIcon({ eventType }: { eventType: string }) {
  if (eventType === "user.signup") {
    return <UserPlus aria-hidden="true" size={18} strokeWidth={2.6} />;
  }

  return <Activity aria-hidden="true" size={18} strokeWidth={2.6} />;
}

export function AdminRecentActivity({
  activity,
  periodLabel,
}: AdminRecentActivityProps) {
  const items = activity ?? [];

  return (
    <SectionCard
      title="Recent activity"
      description={`Latest sign-ups and payout verification events. Showing recent platform activity for ${periodLabel.toLowerCase()}.`}
      contentClassName="space-y-3"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="New sign-ups and payout verification events will appear here."
          icon={<Activity aria-hidden="true" size={24} strokeWidth={2.6} />}
          className="bg-background shadow-none"
        />
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="rounded-card border border-border-soft bg-background p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ActivityIcon eventType={item.eventType} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-text-strong">
                        {item.title}
                      </h3>
                      <Badge tone="neutral">
                        {formatEventTypeLabel(item.eventType)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm font-bold text-text-strong">
                      {item.actorName}
                    </p>
                  </div>

                  <p className="shrink-0 text-xs font-bold text-text-muted">
                    {formatTimestamp(item.createdAt)}
                  </p>
                </div>

                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {item.description}
                </p>
              </div>
            </div>
          </article>
        ))
      )}
    </SectionCard>
  );
}
