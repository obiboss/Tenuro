import Link from "next/link";
import {
  CalendarCheck2,
  Mail,
  MessageCircle,
  Phone,
  Users,
} from "lucide-react";
import { DemoRequestStatusControls } from "@/components/platform-admin/demo-request-status-controls";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusPill } from "@/components/ui/status-pill";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type { DemoRequestRow } from "@/server/repositories/demo-requests.repository";

const statusCopy = {
  pending: { label: "Waiting for contact", tone: "warning" },
  contacted: { label: "Contacted", tone: "primary" },
  scheduled: { label: "Demo scheduled", tone: "primary" },
  completed: { label: "Demo completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

const timeWindowLabels = {
  morning: "9:00 AM–12:00 PM WAT",
  afternoon: "12:00 PM–4:00 PM WAT",
  evening: "4:00 PM–6:00 PM WAT",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T12:00:00+01:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function NotificationBadge({ request }: { request: DemoRequestRow }) {
  if (request.notification_status === "sent") {
    return <Badge tone="success">Email alert sent</Badge>;
  }

  if (request.notification_status === "failed") {
    return <Badge tone="danger">Email alert failed</Badge>;
  }

  if (request.notification_status === "not_configured") {
    return <Badge tone="neutral">Email alert not configured</Badge>;
  }

  return <Badge tone="warning">Email alert pending</Badge>;
}

function DemoRequestCard({ request }: { request: DemoRequestRow }) {
  const status = statusCopy[request.status];
  const workspaceLabel =
    request.workspace_type === "manager" ? "BOPA Manager" : "BOPA Developer";
  const whatsappMessage = [
    `Hello ${request.full_name},`,
    "",
    `Thank you for requesting a ${workspaceLabel} demonstration. This is the BOPA team contacting you to confirm a suitable time.`,
  ].join("\n");
  const whatsappUrl = buildWaMeUrl({
    phoneNumber: request.phone_number,
    message: whatsappMessage,
  });

  return (
    <article className="rounded-card border border-border-soft bg-background p-5">
      <div className="grid gap-6 xl:grid-cols-[1fr_15rem]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-text-strong">
                  {request.full_name}
                </h3>
                <Badge tone="primary">{workspaceLabel}</Badge>
                <StatusPill label={status.label} tone={status.tone} />
                <NotificationBadge request={request} />
              </div>

              <p className="mt-2 font-bold text-text-normal">
                {request.company_name}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Requested {formatDateTime(request.created_at)}
              </p>
            </div>

            <div className="rounded-button bg-primary-soft px-4 py-3 text-primary md:text-right">
              <p className="text-xs font-bold uppercase tracking-wide">
                Preferred demo time
              </p>
              <p className="mt-1 text-sm font-black">
                {formatDate(request.preferred_date)}
              </p>
              <p className="mt-1 text-xs font-bold">
                {timeWindowLabels[request.preferred_time_window]}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-button bg-success px-4 text-sm font-black text-white transition hover:opacity-90"
            >
              <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
              WhatsApp
            </Link>

            <a
              href={`tel:${request.phone_number}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-button border border-border-soft bg-white px-4 text-sm font-black text-text-strong transition hover:border-primary"
            >
              <Phone aria-hidden="true" size={18} strokeWidth={2.6} />
              Call
            </a>

            <a
              href={`mailto:${request.work_email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-button border border-border-soft bg-white px-4 text-sm font-black text-text-strong transition hover:border-primary"
            >
              <Mail aria-hidden="true" size={18} strokeWidth={2.6} />
              Email
            </a>
          </div>

          <div className="mt-5 rounded-button border border-border-soft bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
              What they want to discuss
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-text-normal">
              {request.message || "No additional information was provided."}
            </p>
          </div>
        </div>

        <div className="border-t border-border-soft pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
          <DemoRequestStatusControls
            requestId={request.id}
            currentStatus={request.status}
          />
        </div>
      </div>
    </article>
  );
}

export function DemoRequestsList({
  requests,
  totals,
}: {
  requests: DemoRequestRow[];
  totals: {
    pending: number;
    scheduled: number;
    completed: number;
    all: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Waiting for contact", totals.pending],
          ["Scheduled", totals.scheduled],
          ["Completed", totals.completed],
          ["Recent requests", totals.all],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card bg-white p-5 shadow-card">
            <p className="text-sm font-bold text-text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black text-text-strong">{value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Demo requests"
        description="Contact new requesters, confirm a suitable time, and keep each request up to date."
        action={<Badge tone="primary">Latest {requests.length}</Badge>}
        contentClassName="space-y-4"
      >
        {requests.length === 0 ? (
          <EmptyState
            title="No demo requests yet"
            description="New Manager and Developer demo requests will appear here."
            icon={<Users aria-hidden="true" size={24} strokeWidth={2.6} />}
            className="bg-background shadow-none"
          />
        ) : (
          requests.map((request) => (
            <DemoRequestCard key={request.id} request={request} />
          ))
        )}
      </SectionCard>

      <div className="flex items-start gap-3 rounded-card bg-primary-soft p-5 text-primary">
        <CalendarCheck2
          aria-hidden="true"
          className="mt-0.5 shrink-0"
          size={21}
          strokeWidth={2.6}
        />
        <p className="text-sm font-bold leading-6">
          A requested date is not a confirmed appointment. Contact the requester
          before marking the demo as scheduled.
        </p>
      </div>
    </div>
  );
}
