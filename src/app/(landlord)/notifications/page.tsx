import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import {
  getCurrentLandlordRentAlerts,
  type LandlordRentAlertItem,
  type RentAlertStatus,
} from "@/server/services/renewals.service";
import { formatNaira } from "@/server/utils/money";

const statusCopy: Record<
  RentAlertStatus,
  {
    label: string;
    tone: "warning" | "danger";
  }
> = {
  due_soon: {
    label: "Due Soon",
    tone: "warning",
  },
  owing: {
    label: "Owing",
    tone: "danger",
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getDaysLabel(item: LandlordRentAlertItem) {
  if (item.status === "owing") {
    if (item.daysUntilDue === null) {
      return "Outstanding";
    }

    if (item.daysUntilDue < 0) {
      const overdueDays = Math.abs(item.daysUntilDue);

      return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
    }

    return "Outstanding";
  }

  if (item.daysUntilDue === 0) {
    return "Due today";
  }

  if (item.daysUntilDue === 1) {
    return "Due in 1 day";
  }

  if (item.daysUntilDue !== null) {
    return `Due in ${item.daysUntilDue} days`;
  }

  return "Due soon";
}

function getPropertyUnitLabel(item: LandlordRentAlertItem) {
  const propertyName =
    item.tenancy.units?.properties?.property_name ?? "Property";
  const unitIdentifier = item.tenancy.units?.unit_identifier ?? "Unit";

  return `${propertyName} · ${unitIdentifier}`;
}

function getBuildingLabel(item: LandlordRentAlertItem) {
  return item.tenancy.units?.building_name ?? null;
}

function RentAlertStatusBadge({ status }: { status: RentAlertStatus }) {
  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

function DesktopRentAlertsTable({ items }: { items: LandlordRentAlertItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-border-soft md:block">
      <table className="w-full border-collapse bg-white text-sm">
        <thead className="bg-background text-left text-xs font-black uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3">Tenant</th>
            <th className="px-4 py-3">Property / Unit</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3">Amount Due</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-soft">
          {items.map((item) => (
            <tr key={item.tenancy.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-extrabold text-text-strong">
                  {item.tenancy.tenants?.full_name ?? "Tenant"}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {item.tenancy.tenants?.phone_number ?? "No phone number"}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-bold text-text-strong">
                  {getPropertyUnitLabel(item)}
                </p>
                {getBuildingLabel(item) ? (
                  <p className="mt-1 text-xs font-semibold text-text-muted">
                    {getBuildingLabel(item)}
                  </p>
                ) : null}
              </td>

              <td className="px-4 py-4">
                <p className="font-bold text-text-strong">
                  {formatDate(item.dueDate)}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {getDaysLabel(item)}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-black text-text-strong">
                  {formatNaira(item.amountDue)}
                </p>
              </td>

              <td className="px-4 py-4">
                <RentAlertStatusBadge status={item.status} />
              </td>

              <td className="px-4 py-4 text-right">
                <div className="ml-auto flex max-w-44 flex-col gap-2">
                  <WhatsAppSendButton
                    phoneNumber={item.tenancy.tenants?.phone_number ?? null}
                    message={item.whatsappMessage}
                    label="WhatsApp"
                  />

                  <Link
                    href={`/tenants/${item.tenancy.tenant_id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-3 py-2 text-xs font-extrabold text-text-strong hover:bg-background"
                  >
                    View Tenant
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileRentAlertsList({ items }: { items: LandlordRentAlertItem[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <article
          key={item.tenancy.id}
          className="rounded-card border border-border-soft bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-text-strong">
                {item.tenancy.tenants?.full_name ?? "Tenant"}
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                {item.tenancy.tenants?.phone_number ?? "No phone number"}
              </p>
            </div>

            <RentAlertStatusBadge status={item.status} />
          </div>

          <div className="mt-4 space-y-2 rounded-button bg-background p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Property</span>
              <span className="text-right font-extrabold text-text-strong">
                {getPropertyUnitLabel(item)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Due Date</span>
              <span className="text-right font-extrabold text-text-strong">
                {formatDate(item.dueDate)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Amount Due</span>
              <span className="text-right font-black text-text-strong">
                {formatNaira(item.amountDue)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Timing</span>
              <span className="text-right font-bold text-text-strong">
                {getDaysLabel(item)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <WhatsAppSendButton
              phoneNumber={item.tenancy.tenants?.phone_number ?? null}
              message={item.whatsappMessage}
              label="Message Tenant"
            />

            <Link
              href={`/tenants/${item.tenancy.tenant_id}`}
              className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-4 py-2 text-sm font-extrabold text-text-strong hover:bg-background"
            >
              View Tenant
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function NotificationsPage() {
  const rentAlerts = await getCurrentLandlordRentAlerts();

  return (
    <main>
      <PageHeader
        title="Rent Alerts"
        description="See tenants whose rent is due within 30 days or who currently have an outstanding balance."
      />

      <SectionCard
        title="Due soon and owing tenants"
        description={`${rentAlerts.owingCount} owing · ${rentAlerts.dueSoonCount} due within 30 days`}
      >
        {rentAlerts.items.length === 0 ? (
          <EmptyState
            title="No rent alerts"
            description="Tenants who are owing or whose rent is due within 30 days will appear here."
            icon={<BellRing aria-hidden="true" size={24} strokeWidth={2.6} />}
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2 text-sm font-bold text-text-muted">
              <span className="inline-flex items-center gap-2 rounded-full bg-danger-soft px-3 py-1 text-danger">
                <AlertTriangle aria-hidden="true" size={15} strokeWidth={2.6} />
                {rentAlerts.owingCount} owing
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-warning">
                <CalendarClock aria-hidden="true" size={15} strokeWidth={2.6} />
                {rentAlerts.dueSoonCount} due soon
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-primary">
                <MessageCircle aria-hidden="true" size={15} strokeWidth={2.6} />
                WhatsApp opens tenant chat manually
              </span>
            </div>

            <DesktopRentAlertsTable items={rentAlerts.items} />
            <MobileRentAlertsList items={rentAlerts.items} />
          </>
        )}
      </SectionCard>
    </main>
  );
}
