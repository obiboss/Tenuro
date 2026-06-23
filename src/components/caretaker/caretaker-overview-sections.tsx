"use client";

import Link from "next/link";
import { BellRing, ExternalLink, MessageCircle } from "lucide-react";
import { CallTenantButton } from "@/components/ui/call-tenant-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { buildWaMeUrl } from "@/lib/whatsapp";
import { formatNaira } from "@/server/utils/money";
import type {
  CaretakerOverview,
  CaretakerPaidTenantRow,
  CaretakerPendingConfirmationRow,
  CaretakerTenantRow,
} from "@/server/services/caretaker-overview.service";

type CaretakerOverviewSectionsProps = {
  overview: Pick<
    CaretakerOverview,
    | "dueSoonTenants"
    | "owingTenants"
    | "pendingConfirmation"
    | "paidTenants"
  >;
};

function buildLandlordNotifyMessage(params: {
  tenantName: string;
  propertyUnitLabel: string;
  amountClaimed: number;
  caretakerName?: string;
}) {
  return [
    "Good day.",
    `A payment claim for ${params.propertyUnitLabel} (${params.tenantName}) needs your confirmation.`,
    `Amount: ${formatNaira(params.amountClaimed)}.`,
    "Please review in BOPA.",
    "Sent with BOPA.",
  ].join(" ");
}

function DueSoonRow({ tenant }: { tenant: CaretakerTenantRow }) {
  return (
    <article className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-text-strong">
            {tenant.tenantName}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {tenant.propertyName} · {tenant.unitIdentifier}
          </p>
        </div>
        <Badge tone="warning">{tenant.statusLabel}</Badge>
      </div>

      <p className="mt-3 text-sm font-bold text-text-muted">
        Rent: {formatNaira(tenant.rentAmount)}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <WhatsAppSendButton
          phoneNumber={tenant.phoneNumber}
          message={tenant.whatsappMessage}
          label="Send reminder"
        />
        <CallTenantButton phoneNumber={tenant.phoneNumber} />
      </div>
    </article>
  );
}

function OwingRow({ tenant }: { tenant: CaretakerTenantRow }) {
  return (
    <article className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-text-strong">
            {tenant.tenantName}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {tenant.propertyName} · {tenant.unitIdentifier}
          </p>
        </div>
        <Badge tone="danger">{tenant.statusLabel}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-bold text-text-muted">
          Rent: {formatNaira(tenant.rentAmount)}
        </span>
        {tenant.amountOwed !== null ? (
          <span className="font-black text-danger">
            Owes {formatNaira(tenant.amountOwed)}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <WhatsAppSendButton
          phoneNumber={tenant.phoneNumber}
          message={tenant.whatsappMessage}
          label="Send reminder"
        />
        <Link
          href={`/caretaker/request-proof/${tenant.tenancyId}`}
          className="block"
        >
          <Button type="button" variant="secondary" fullWidth>
            <MessageCircle aria-hidden="true" size={16} strokeWidth={2.6} />
            Request proof
          </Button>
        </Link>
        <Link
          href={`/caretaker/report-payment/${tenant.tenancyId}`}
          className="block sm:col-span-2"
        >
          <Button type="button" variant="secondary" fullWidth>
            <BellRing aria-hidden="true" size={16} strokeWidth={2.6} />
            Report payment
          </Button>
        </Link>
      </div>
    </article>
  );
}

function PendingRow({ item }: { item: CaretakerPendingConfirmationRow }) {
  const notifyMessage = buildLandlordNotifyMessage({
    tenantName: item.tenantName,
    propertyUnitLabel: item.propertyUnitLabel,
    amountClaimed: item.amountClaimed,
  });
  const notifyUrl = buildWaMeUrl({
    phoneNumber: item.landlordPhone,
    message: notifyMessage,
  });

  return (
    <article className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-text-strong">
            {item.tenantName}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {item.propertyUnitLabel}
          </p>
        </div>
        <Badge tone="primary">{item.statusLabel}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-bold text-text-muted">
          Amount: {formatNaira(item.amountClaimed)}
        </span>
        {item.paymentDate ? (
          <span className="font-semibold text-text-muted">
            Paid: {item.paymentDate}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {item.proofPath ? (
          <a
            href={item.proofPath}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button type="button" variant="secondary" fullWidth>
              <ExternalLink aria-hidden="true" size={16} strokeWidth={2.6} />
              View proof
            </Button>
          </a>
        ) : null}

        <a
          href={notifyUrl}
          target="_blank"
          rel="noreferrer"
          className="block"
        >
          <Button type="button" fullWidth>
            <MessageCircle aria-hidden="true" size={16} strokeWidth={2.6} />
            Notify landlord
          </Button>
        </a>
      </div>
    </article>
  );
}

function PaidRow({ tenant }: { tenant: CaretakerPaidTenantRow }) {
  return (
    <article className="rounded-card border border-border-soft bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-extrabold text-text-strong">
            {tenant.tenantName}
          </p>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            {tenant.propertyName} · {tenant.unitIdentifier}
          </p>
        </div>
        <Badge tone="success">{tenant.paidLabelText}</Badge>
      </div>

      <p className="mt-3 text-sm font-bold text-text-muted">
        Rent: {formatNaira(tenant.rentAmount)}
      </p>
    </article>
  );
}

export function CaretakerOverviewSections({
  overview,
}: CaretakerOverviewSectionsProps) {
  return (
    <div className="space-y-4">
      <section id="rent-due-soon">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-text-muted">
          Rent Due Soon
        </h2>
        {overview.dueSoonTenants.length > 0 ? (
          <div className="space-y-3">
            {overview.dueSoonTenants.map((tenant) => (
              <DueSoonRow key={tenant.tenancyId} tenant={tenant} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold text-text-muted">
            No tenants due within the next 30 days.
          </p>
        )}
      </section>

      <section id="owing-overdue">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-text-muted">
          Owing / Overdue
        </h2>
        {overview.owingTenants.length > 0 ? (
          <div className="space-y-3">
            {overview.owingTenants.map((tenant) => (
              <OwingRow key={tenant.tenancyId} tenant={tenant} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold text-text-muted">
            No owing or overdue tenants.
          </p>
        )}
      </section>

      <section id="pending-confirmation">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-text-muted">
          Pending Confirmation
        </h2>
        {overview.pendingConfirmation.length > 0 ? (
          <div className="space-y-3">
            {overview.pendingConfirmation.map((item) => (
              <PendingRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold text-text-muted">
            No payment claims waiting for landlord confirmation.
          </p>
        )}
      </section>

      <section id="paid-tenants">
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-text-muted">
          Paid
        </h2>
        {overview.paidTenants.length > 0 ? (
          <div className="space-y-3">
            {overview.paidTenants.map((tenant) => (
              <PaidRow key={tenant.tenancyId} tenant={tenant} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-border-soft bg-white p-4 text-sm font-semibold text-text-muted">
            No paid tenants to show yet.
          </p>
        )}
      </section>
    </div>
  );
}
