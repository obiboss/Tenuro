import Link from "next/link";
import { Activity, UserPlus } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
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
    timeZone: "Africa/Lagos",
  }).format(new Date(parsed));
}

function ActivityIcon({ eventType }: { eventType: string }) {
  if (eventType === "user.signup") {
    return <UserPlus aria-hidden="true" size={18} strokeWidth={2.6} />;
  }

  return <Activity aria-hidden="true" size={18} strokeWidth={2.6} />;
}

function getActivityIconTone(eventType: string) {
  if (eventType === "user.signup") {
    return "bg-success-soft text-success";
  }

  if (eventType.includes("payout")) {
    return "bg-warning-soft text-warning";
  }

  return "bg-primary-soft text-primary";
}

export function AdminRecentActivity({
  activity,
  periodLabel,
}: AdminRecentActivityProps) {
  const items = (activity ?? []).slice(0, 4);

  return (
    <SectionCard
      title="Recent activity"
      description={`The latest important actions during ${periodLabel.toLowerCase()}.`}
      action={
        <Link
          href="/admin/activity"
          className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary-soft px-4 text-sm font-extrabold text-primary transition-colors hover:bg-primary hover:text-white"
        >
          View all activity
        </Link>
      }
      contentClassName="py-2 md:py-3"
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-4 text-sm text-text-muted">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Activity aria-hidden="true" size={19} strokeWidth={2.6} />
          </div>
          <p>No recent activity during this period.</p>
        </div>
      ) : (
        <div className="divide-y divide-border-soft">
          {items.map((item) => (
            <article key={item.id} className="flex items-start gap-3 py-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                  getActivityIconTone(item.eventType),
                )}
              >
                <ActivityIcon eventType={item.eventType} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black leading-5 text-text-strong sm:text-base">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {item.actorName} · {formatTimestamp(item.createdAt)}
                </p>

                <p className="mt-1 line-clamp-2 text-sm leading-5 text-text-muted">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
