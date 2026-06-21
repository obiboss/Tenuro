import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import type { LandlordAuditLogRecord } from "@/server/repositories/audit-log.repository";

type OverviewRecentActivityProps = {
  events: LandlordAuditLogRecord[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function formatEventLabel(value: string) {
  return value
    .split(".")
    .filter(Boolean)
    .map((segment) =>
      segment
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" · ");
}

export function OverviewRecentActivity({ events }: OverviewRecentActivityProps) {
  return (
    <SectionCard
      title="Recent Activity"
      description="Latest rent actions across your properties."
    >
      <div className="space-y-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-card border border-border-soft bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <History aria-hidden="true" size={18} strokeWidth={2.6} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-text-strong">
                  {formatEventLabel(event.eventType)}
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-text-normal">
                  {event.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-text-muted">
                  {formatDateTime(event.createdAt)}
                </p>

                {event.tenantId ? (
                  <Link
                    href={`/tenants/${event.tenantId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary hover:text-primary-hover"
                  >
                    View tenant
                    <ArrowRight aria-hidden="true" size={14} strokeWidth={2.7} />
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
