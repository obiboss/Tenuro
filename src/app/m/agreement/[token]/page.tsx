import Link from "next/link";
import { PublicManagerAgreementAcceptanceForm } from "@/components/manager/public-manager-agreement-acceptance-form";
import {
  acceptManagerTenantAgreementAndCreatePayment,
  resolveManagerTenantAgreementToken,
} from "@/server/services/manager-tenant-onboarding.service";
import type { ManagerTenantPaymentBreakdownState } from "@/actions/manager-tenant-onboarding.state";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ManagerAgreementPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type AcceptedPaymentState = {
  paymentRequestId: string | null;
  pdfDownloadUrl: string | null;
  paymentUrl: string | null;
  paymentExpiresAt: string | null;
  paymentBreakdown: ManagerTenantPaymentBreakdownState | null;
};

type AgreementResolution =
  | {
      ok: true;
      agreement: Awaited<ReturnType<typeof resolveManagerTenantAgreementToken>>;
      acceptedPayment: AcceptedPaymentState | null;
    }
  | {
      ok: false;
      message: string;
    };

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "This agreement link could not be opened.";
}

async function resolveAgreementPageState(
  token: string,
): Promise<AgreementResolution> {
  try {
    const agreement = await resolveManagerTenantAgreementToken(token);

    if (agreement.document_status !== "accepted") {
      return {
        ok: true,
        agreement,
        acceptedPayment: null,
      };
    }

    const paymentResult = (await acceptManagerTenantAgreementAndCreatePayment({
      token,
      ipAddress: null,
      userAgent: null,
    })) as {
      paymentRequestId?: string | null;
      pdfDownloadUrl?: string | null;
      paymentUrl?: string | null;
      paymentExpiresAt?: string | null;
      paymentBreakdown?: ManagerTenantPaymentBreakdownState | null;
    };

    return {
      ok: true,
      agreement,
      acceptedPayment: {
        paymentRequestId: paymentResult.paymentRequestId ?? null,
        pdfDownloadUrl: paymentResult.pdfDownloadUrl ?? null,
        paymentUrl: paymentResult.paymentUrl ?? null,
        paymentExpiresAt: paymentResult.paymentExpiresAt ?? null,
        paymentBreakdown: paymentResult.paymentBreakdown ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
    };
  }
}

function ManagerAgreementLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          BOPA Manager
        </p>
        <p className="text-xs font-semibold text-text-muted">
          Tenancy agreement
        </p>
      </div>
    </Link>
  );
}

function AgreementUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <ManagerAgreementLogo />

        <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
          <p className="w-fit rounded-full bg-danger-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-danger">
            Link unavailable
          </p>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-text-strong">
            Agreement link unavailable
          </h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            {message}
          </p>

          <p className="mt-4 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-muted">
            Please ask the property manager to send a fresh agreement link.
          </p>
        </div>
      </section>
    </main>
  );
}

function getSnapshotText(
  snapshot: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = snapshot[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function getSnapshotNumber(
  snapshot: Record<string, unknown>,
  key: string,
  fallback = 0,
) {
  const value = snapshot[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  if (!value) {
    return "Not stated";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatAgreementBody(value: string) {
  return value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => {
      if (line.length > 0) {
        return true;
      }

      return lines[index - 1]?.length !== 0;
    });
}

function AgreementBodyCard({ agreementBody }: { agreementBody: string }) {
  const lines = formatAgreementBody(agreementBody);

  return (
    <section className="border border-border-soft bg-white shadow-sm">
      <div className="border-b border-border-soft p-4">
        <h2 className="text-lg font-black tracking-tight text-text-strong">
          Final agreement terms
        </h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          Read this carefully before accepting.
        </p>
      </div>

      <div className="space-y-3 px-4 py-5 sm:px-8 sm:py-7">
        {lines.map((line, index) => (
          <p
            key={`${line}-${index}`}
            className={
              line.length === 0
                ? "h-2"
                : "whitespace-pre-wrap text-sm font-semibold leading-7 text-text-strong"
            }
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border-soft px-4 py-3 last:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-text-strong">{value}</p>
    </div>
  );
}

export default async function ManagerAgreementPage({
  params,
}: ManagerAgreementPageProps) {
  const { token } = await params;
  const resolution = await resolveAgreementPageState(token);

  if (!resolution.ok) {
    return <AgreementUnavailable message={resolution.message} />;
  }

  const { agreement, acceptedPayment } = resolution;

  const tenantName = getSnapshotText(
    agreement.tenant_snapshot,
    "fullName",
    "Tenant",
  );

  const propertyName = getSnapshotText(
    agreement.property_snapshot,
    "propertyName",
    "Property",
  );

  const unitLabel = getSnapshotText(
    agreement.property_snapshot,
    "unitLabel",
    "Unit",
  );
  const managerName = getSnapshotText(
    agreement.manager_snapshot,
    "name",
    "BOPA Manager",
  );
  const landlordName = getSnapshotText(
    agreement.landlord_snapshot,
    "name",
    "Landlord",
  );
  const rentAmount = getSnapshotNumber(agreement.tenancy_snapshot, "rentAmount");
  const moveInDate = getSnapshotText(
    agreement.tenancy_snapshot,
    "moveInDate",
    "",
  );
  const nextRentDueDate = getSnapshotText(
    agreement.tenancy_snapshot,
    "nextRentDueDate",
    "",
  );

  const statusLabel =
    agreement.document_status === "accepted"
      ? "Accepted"
      : agreement.document_status === "voided"
        ? "Declined"
        : "Awaiting acceptance";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:py-10">
        <ManagerAgreementLogo />

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black text-primary">{managerName}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
              Tenancy agreement
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {tenantName} · {unitLabel} · {propertyName}
            </p>
          </div>

          <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
            {statusLabel}
          </span>
        </div>

        <section className="mb-6 overflow-hidden rounded-card border border-border-soft bg-white shadow-sm">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Tenant" value={tenantName} />
            <SummaryItem label="Property" value={propertyName} />
            <SummaryItem label="Unit" value={unitLabel} />
            <SummaryItem label="Annual rent" value={formatMoney(rentAmount)} />
            <SummaryItem label="Move-in date" value={formatDate(moveInDate)} />
            <SummaryItem
              label="Next due date"
              value={formatDate(nextRentDueDate)}
            />
            <SummaryItem label="Landlord" value={landlordName} />
            <SummaryItem label="Manager" value={managerName} />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
          <AgreementBodyCard
            agreementBody={
              agreement.finalized_body ??
              agreement.agreement_body ??
              "Agreement content is not available."
            }
          />

          <div className="lg:sticky lg:top-6 lg:self-start">
            <PublicManagerAgreementAcceptanceForm
              token={token}
              agreement={agreement}
              pdfDownloadUrl={acceptedPayment?.pdfDownloadUrl ?? null}
              initialPaymentRequestId={
                acceptedPayment?.paymentRequestId ?? null
              }
              initialPaymentUrl={acceptedPayment?.paymentUrl ?? null}
              initialPaymentExpiresAt={
                acceptedPayment?.paymentExpiresAt ?? null
              }
              initialPaymentBreakdown={
                acceptedPayment?.paymentBreakdown ?? null
              }
            />
          </div>
        </div>
      </section>
    </main>
  );
}
