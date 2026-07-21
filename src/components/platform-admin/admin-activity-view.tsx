import { AlertTriangle, CircleX, Search } from "lucide-react";
import {
  ACTIVITY_MODULES,
  ACTIVITY_OUTCOMES,
} from "@/server/constants/activity-events";
import type {
  PlatformAdminActivityEvent,
  PlatformAdminActivityFilters,
  PlatformAdminActivityJourney,
} from "@/server/services/platform-admin-activity.service";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";

type AdminActivityViewProps = {
  filters: PlatformAdminActivityFilters;
  events: PlatformAdminActivityEvent[];
  journeys: PlatformAdminActivityJourney[];
  summary: {
    eventCount: number;
    unfinishedCount: number;
    failedCount: number;
  };
};

const MODULE_LABELS: Record<string, string> = {
  auth: "Sign-up and login",
  landlord: "Landlord",
  tenant: "Tenant",
  caretaker: "Caretaker",
  agent: "Agent",
  manager: "Manager",
  developer: "Developer",
  payments: "Payments",
  subscriptions: "Subscriptions",
  demo: "Demo requests",
  public_tools: "Free tools",
  admin: "Admin",
  system: "System",
};

const STEP_LABELS: Record<string, string> = {
  details_submitted: "Details submitted",
  auth_account_created: "Account created; profile unfinished",
  email_verification_pending: "Waiting for email verification",
  workspace_setup_failed: "Workspace setup failed",
  profile_setup_failed: "Profile setup failed",
  add_units: "Property saved; no unit added yet",
  capture_existing_tenants: "Units added; existing tenants unfinished",
  waiting_for_tenant_details: "Waiting for tenant details",
  awaiting_manager_review: "Waiting for manager review",
  waiting_for_agreement: "Waiting for tenant to accept agreement",
  payment_ready: "Agreement accepted; payment not started",
  waiting_for_payment: "Waiting for first rent payment",
  awaiting_contact: "Waiting for BOPA to contact requester",
  contacted: "Requester contacted",
  demo_scheduled: "Demo scheduled",
  signup_failed: "Sign-up failed",
  auth_account_not_created: "Account was not created",
  email_already_registered: "Email already registered",
};

function humanize(value: string) {
  return value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTime(value: string) {
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

function outcomeTone(outcome: PlatformAdminActivityEvent["outcome"]) {
  if (outcome === "succeeded") {
    return "success" as const;
  }

  if (outcome === "failed" || outcome === "cancelled") {
    return "danger" as const;
  }

  if (outcome === "started" || outcome === "in_progress") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function readMetadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function readChangedColumns(metadata: Record<string, unknown>) {
  const value = metadata.changed_columns;

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function JourneyItem({ journey }: { journey: PlatformAdminActivityJourney }) {
  const title =
    journey.contactName ||
    readMetadataText(journey.metadata, "organization_name") ||
    readMetadataText(journey.metadata, "company_name") ||
    readMetadataText(journey.metadata, "property_name") ||
    humanize(journey.journeyType);
  const stepLabel =
    STEP_LABELS[journey.currentStep] ?? humanize(journey.currentStep);

  return (
    <article className="rounded-card border border-border-soft bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-text-strong">{title}</h3>
            <Badge tone={journey.status === "failed" ? "danger" : "warning"}>
              {journey.status === "failed" ? "Failed" : "Not finished"}
            </Badge>
            <Badge tone="neutral">
              {MODULE_LABELS[journey.module] ?? humanize(journey.module)}
            </Badge>
          </div>

          <p className="mt-2 text-sm font-bold text-text-strong">{stepLabel}</p>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            {journey.contactValue ? `${journey.contactValue} · ` : ""}
            Last activity {formatTime(journey.lastActivityAt)}
          </p>

          {journey.lastErrorMessage ? (
            <p className="mt-2 rounded-button bg-danger-soft px-3 py-2 text-sm font-semibold leading-6 text-danger">
              {journey.lastErrorMessage}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 text-xs font-bold text-text-muted">
          Started {formatTime(journey.startedAt)}
        </p>
      </div>
    </article>
  );
}

function EventItem({ event }: { event: PlatformAdminActivityEvent }) {
  const changedColumns = readChangedColumns(event.metadata);
  const previousStatus = readMetadataText(event.metadata, "previous_status");
  const currentStatus = readMetadataText(event.metadata, "current_status");

  return (
    <article className="rounded-card border border-border-soft bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-text-strong">
              {humanize(event.eventName)}
            </h3>
            <Badge tone={outcomeTone(event.outcome)}>
              {humanize(event.outcome)}
            </Badge>
            <Badge tone="neutral">
              {MODULE_LABELS[event.module] ?? humanize(event.module)}
            </Badge>
          </div>

          <p className="mt-2 text-sm leading-6 text-text-normal">
            {event.description}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {event.actorName}
            {event.actorRole ? ` · ${humanize(event.actorRole)}` : ""}
          </p>

          {previousStatus || currentStatus ? (
            <p className="mt-2 text-xs font-bold text-text-muted">
              Status: {previousStatus ?? "Not set"} →{" "}
              {currentStatus ?? "Not set"}
            </p>
          ) : null}

          {changedColumns.length > 0 ? (
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Changed: {changedColumns.map(humanize).join(", ")}
            </p>
          ) : null}
        </div>

        <p className="shrink-0 text-xs font-bold text-text-muted">
          {formatTime(event.createdAt)}
        </p>
      </div>
    </article>
  );
}

export function AdminActivityView({
  filters,
  events,
  journeys,
  summary,
}: AdminActivityViewProps) {
  return (
    <div className="space-y-6">
      <form
        method="get"
        className="grid gap-4 rounded-card border border-border-soft bg-surface p-4 shadow-card md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-end"
      >
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-strong">
            Find activity
          </span>
          <input
            name="search"
            defaultValue={filters.search ?? ""}
            placeholder="Name, event or record"
            className="min-h-12 w-full rounded-button border border-border bg-background px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-strong">
            Module
          </span>
          <select
            name="module"
            defaultValue={filters.module ?? ""}
            className="min-h-12 w-full rounded-button border border-border bg-background px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">All modules</option>
            {ACTIVITY_MODULES.map((module) => (
              <option key={module} value={module}>
                {MODULE_LABELS[module] ?? humanize(module)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-strong">
            Result
          </span>
          <select
            name="outcome"
            defaultValue={filters.outcome ?? ""}
            className="min-h-12 w-full rounded-button border border-border bg-background px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="">All results</option>
            {ACTIVITY_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {humanize(outcome)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-text-strong">
            Period
          </span>
          <select
            name="period"
            defaultValue={String(filters.periodDays)}
            className="min-h-12 w-full rounded-button border border-border bg-background px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-black text-white shadow-soft transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Search aria-hidden="true" size={17} strokeWidth={2.6} />
          Apply
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border-soft bg-surface p-5 shadow-card">
          <p className="text-sm font-bold text-text-muted">Activity shown</p>
          <p className="mt-2 text-3xl font-black text-text-strong">
            {summary.eventCount}
          </p>
        </div>
        <div className="rounded-card border border-warning/25 bg-warning-soft p-5">
          <p className="text-sm font-bold text-warning">Not finished</p>
          <p className="mt-2 text-3xl font-black text-text-strong">
            {summary.unfinishedCount}
          </p>
        </div>
        <div className="rounded-card border border-danger/25 bg-danger-soft p-5">
          <p className="text-sm font-bold text-danger">Failed</p>
          <p className="mt-2 text-3xl font-black text-text-strong">
            {summary.failedCount}
          </p>
        </div>
      </div>

      <SectionCard
        title="Journeys needing attention"
        description="Sign-ups, property setup, tenant onboarding and demo requests that have not reached a successful end."
        action={
          <Badge tone={journeys.length > 0 ? "warning" : "success"}>
            {journeys.length}
          </Badge>
        }
        contentClassName="space-y-3"
      >
        {journeys.length === 0 ? (
          <EmptyState
            title="No unfinished journeys in this view"
            description="Change the module or search filters to review another part of BOPA."
            icon={
              <AlertTriangle aria-hidden="true" size={24} strokeWidth={2.6} />
            }
            className="bg-background shadow-none"
          />
        ) : (
          journeys.map((journey) => (
            <JourneyItem key={journey.id} journey={journey} />
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Complete activity trail"
        description="A time-ordered record of meaningful changes and security events across every BOPA module."
        action={<Badge tone="neutral">{events.length}</Badge>}
        contentClassName="space-y-3"
      >
        {events.length === 0 ? (
          <EmptyState
            title="No activity matches these filters"
            description="Try a longer period or remove one of the filters."
            icon={<CircleX aria-hidden="true" size={24} strokeWidth={2.6} />}
            className="bg-background shadow-none"
          />
        ) : (
          events.map((event) => <EventItem key={event.id} event={event} />)
        )}
      </SectionCard>
    </div>
  );
}
