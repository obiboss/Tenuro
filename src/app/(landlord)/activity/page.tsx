import Link from "next/link";
import { Activity, ArrowRight, CalendarClock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getCurrentLandlordAuditLogs } from "@/server/services/audit-log.service";

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

function formatRoleLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatEntityLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function getActorBadgeTone(actorRole: string) {
  if (actorRole === "landlord") {
    return "primary" as const;
  }

  if (actorRole === "tenant") {
    return "success" as const;
  }

  if (actorRole === "system") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default async function ActivityPage() {
  const logs = await getCurrentLandlordAuditLogs();

  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Review recent account, tenant, tenancy, payment, receipt, and system activity for your landlord workspace."
        action={<Badge tone="primary">{logs.length} recent events</Badge>}
      />

      <SectionCard
        title="Recent Activity"
        description="Audit records are read-only and help you trace important changes across your properties."
      >
        {logs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-soft bg-background px-5 py-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Activity aria-hidden="true" size={26} strokeWidth={2.6} />
            </div>

            <h2 className="mt-4 text-lg font-black tracking-tight text-text-strong">
              No activity recorded yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-text-muted">
              Important actions such as tenant approvals, payment updates,
              receipt generation, and agreement activity will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border-soft bg-white">
            <div className="hidden grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.9fr] gap-4 border-b border-border-soft bg-background px-5 py-3 text-xs font-black uppercase tracking-wide text-text-muted lg:grid">
              <span>Event</span>
              <span>Description</span>
              <span>Actor</span>
              <span>Entity</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-border-soft">
              {logs.map((log) => {
                const hasTenantLink = Boolean(log.tenantId);

                return (
                  <article
                    key={log.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-background/80 lg:grid-cols-[1.1fr_1.5fr_0.8fr_0.8fr_0.9fr] lg:items-center"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                          <ShieldCheck
                            aria-hidden="true"
                            size={20}
                            strokeWidth={2.6}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-text-strong">
                            {formatEventLabel(log.eventType)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-text-muted lg:hidden">
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold leading-6 text-text-normal">
                        {log.description}
                      </p>

                      {hasTenantLink ? (
                        <Link
                          href={`/tenants/${log.tenantId}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary hover:text-primary-hover"
                        >
                          View tenant
                          <ArrowRight
                            aria-hidden="true"
                            size={14}
                            strokeWidth={2.7}
                          />
                        </Link>
                      ) : null}
                    </div>

                    <div>
                      <Badge tone={getActorBadgeTone(log.actorRole)}>
                        {formatRoleLabel(log.actorRole)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-text-normal">
                        {formatEntityLabel(log.entityType)}
                      </p>

                      {log.entityId ? (
                        <p className="mt-1 max-w-45 truncate text-xs font-semibold text-text-muted">
                          {log.entityId}
                        </p>
                      ) : null}
                    </div>

                    <div className="hidden items-center gap-2 text-sm font-bold text-text-muted lg:flex">
                      <CalendarClock
                        aria-hidden="true"
                        size={17}
                        strokeWidth={2.6}
                      />
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
