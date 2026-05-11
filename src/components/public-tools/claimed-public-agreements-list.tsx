import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { PublicGeneratedAgreementRow } from "@/server/repositories/public-agreement-generator.repository";

type ClaimedPublicAgreementsListProps = {
  agreements: PublicGeneratedAgreementRow[];
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
}

function getPropertyLabel(agreement: PublicGeneratedAgreementRow) {
  return [
    agreement.property_name,
    agreement.unit_identifier,
    agreement.property_address,
    agreement.city_state,
  ]
    .filter(Boolean)
    .join(", ");
}

function getAgreementBody(agreement: PublicGeneratedAgreementRow) {
  const body = agreement.agreement_snapshot.agreement_body;

  return typeof body === "string" && body.trim()
    ? body
    : "Agreement body is not available.";
}

export function ClaimedPublicAgreementsList({
  agreements,
}: ClaimedPublicAgreementsListProps) {
  if (agreements.length === 0) {
    return (
      <EmptyState
        title="No imported agreements yet"
        description="Agreements created from the public agreement generator will appear here after the landlord creates an account from the agreement."
        icon={<FileText aria-hidden="true" size={24} strokeWidth={2.6} />}
        action={
          <Link href="/agreement-generator">
            <Button variant="secondary">Open Agreement Generator</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {agreements.map((agreement) => (
        <article
          key={agreement.id}
          className="rounded-card border border-border-soft bg-background p-4 md:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <FileText aria-hidden="true" size={22} strokeWidth={2.6} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black text-text-strong">
                    {agreement.agreement_title}
                  </h2>
                  <Badge tone="success">Imported</Badge>
                </div>

                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {agreement.tenant_full_name} · {getPropertyLabel(agreement)}
                </p>
              </div>
            </div>

            <p className="text-xl font-black text-text-strong">
              {formatMoney(
                Number(agreement.rent_amount),
                agreement.currency_code,
              )}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Tenancy Start
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(agreement.tenancy_start_date)}
              </p>
            </div>

            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Tenancy End
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(agreement.tenancy_end_date)}
              </p>
            </div>

            <div className="rounded-button bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Duration
              </p>
              <p className="mt-1 font-black text-text-strong">
                {agreement.tenancy_duration_months} months
              </p>
            </div>
          </div>

          <details className="mt-4 rounded-button bg-surface p-4">
            <summary className="cursor-pointer text-sm font-black text-text-strong">
              Preview agreement body
            </summary>

            <pre className="mt-4 max-h-105 overflow-auto whitespace-pre-wrap rounded-button bg-white p-4 text-xs leading-6 text-text-muted">
              {getAgreementBody(agreement)}
            </pre>
          </details>

          <div className="mt-4 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
            This imported agreement is attached to your account for review. It
            has not yet been converted into the full editable tenancy agreement
            workflow.
          </div>
        </article>
      ))}
    </div>
  );
}
