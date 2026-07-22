import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
import type { DemoRequestRow } from "@/server/repositories/demo-requests.repository";

type AdminDemoRequestPreviewProps = {
  requests: DemoRequestRow[];
  total: number;
};

const ACTIVE_STATUSES = new Set(["pending", "contacted", "scheduled"]);

const statusCopy = {
  pending: { label: "Waiting for contact", tone: "warning" },
  contacted: { label: "Contacted", tone: "primary" },
  scheduled: { label: "Scheduled", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

const timeWindowLabels = {
  morning: "9:00 AM–12:00 PM",
  afternoon: "12:00 PM–4:00 PM",
  evening: "4:00 PM–6:00 PM",
} as const;

function formatDate(value: string) {
  const parsed = Date.parse(`${value}T12:00:00+01:00`);

  if (!Number.isFinite(parsed)) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(parsed));
}

export function AdminDemoRequestPreview({
  requests,
  total,
}: AdminDemoRequestPreviewProps) {
  const visibleRequests = (requests ?? [])
    .filter((request) => ACTIVE_STATUSES.has(request.status))
    .sort((left, right) => {
      const dateComparison = left.preferred_date.localeCompare(
        right.preferred_date,
      );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return right.created_at.localeCompare(left.created_at);
    })
    .slice(0, 4);

  return (
    <SectionCard
      title="Demo bookings"
      description="The next companies waiting to speak with BOPA."
      action={
        <Link
          href="/admin/demo-requests"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white transition-colors hover:bg-primary-hover"
        >
          View all {total > 0 ? `(${total})` : ""}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2.7} />
        </Link>
      }
      contentClassName="py-2 md:py-3"
    >
      {visibleRequests.length === 0 ? (
        <div className="flex items-center gap-3 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
            <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.7} />
          </div>
          <div>
            <p className="text-sm font-black text-text-strong">
              No demo is waiting
            </p>
            <p className="mt-0.5 text-sm text-text-muted">
              New bookings will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border-soft">
          {visibleRequests.map((request) => {
            const status = statusCopy[request.status];
            const workspaceLabel =
              request.workspace_type === "manager"
                ? "BOPA Manager"
                : "BOPA Developer";

            return (
              <Link
                key={request.id}
                href="/admin/demo-requests"
                className="group flex min-h-20 items-center gap-3 py-4 transition-colors"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <CalendarClock
                    aria-hidden="true"
                    size={19}
                    strokeWidth={2.6}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-black text-text-strong sm:text-base">
                      {request.full_name}
                    </h3>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>

                  <p className="mt-1 truncate text-sm font-semibold text-text-muted">
                    {request.company_name} · {workspaceLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {formatDate(request.preferred_date)} ·{" "}
                    {timeWindowLabels[request.preferred_time_window]} WAT
                  </p>
                </div>

                <span className="hidden shrink-0 items-center gap-1 text-sm font-extrabold text-primary sm:inline-flex">
                  Open
                  <ArrowRight
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                    size={16}
                    strokeWidth={2.7}
                  />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
