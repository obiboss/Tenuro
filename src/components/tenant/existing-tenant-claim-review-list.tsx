"use client";

import { useActionState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  Home,
} from "lucide-react";
import {
  rejectExistingTenantClaimAction,
  updateExistingTenantClaimArrearsAction,
} from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExistingTenantClaimDetailRow,
  ExistingTenantClaimIdType,
  ExistingTenantClaimStatus,
} from "@/server/repositories/existing-tenant-claims.repository";
import { formatNaira } from "@/server/utils/money";

type ExistingTenantClaimReviewListProps = {
  claims: ExistingTenantClaimDetailRow[];
};

const statusCopy: Record<
  ExistingTenantClaimStatus,
  {
    label: string;
    tone: "success" | "warning" | "danger" | "neutral" | "primary";
  }
> = {
  pending: {
    label: "Link Sent",
    tone: "neutral",
  },
  submitted: {
    label: "Needs Review",
    tone: "warning",
  },
  approved: {
    label: "Approved",
    tone: "success",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
  },
  expired: {
    label: "Expired",
    tone: "danger",
  },
  cancelled: {
    label: "Cancelled",
    tone: "neutral",
  },
};

const idTypeLabels: Record<ExistingTenantClaimIdType, string> = {
  nin: "NIN",
  passport: "International Passport",
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTenantName(claim: ExistingTenantClaimDetailRow) {
  return claim.tenant_full_name ?? claim.invited_tenant_full_name ?? "Tenant";
}

function getTenantPhone(claim: ExistingTenantClaimDetailRow) {
  return (
    claim.tenant_phone_number ??
    claim.invited_tenant_phone_number ??
    "No phone number"
  );
}

function getPropertyUnitLabel(claim: ExistingTenantClaimDetailRow) {
  const propertyName = claim.units?.properties?.property_name ?? "Property";
  const buildingName = claim.units?.building_name;
  const unitIdentifier = claim.units?.unit_identifier ?? "Unit";

  return `${propertyName} · ${
    buildingName ? `${buildingName} · ` : ""
  }${unitIdentifier}`;
}

function getIdTypeLabel(value: ExistingTenantClaimIdType | null) {
  return value ? idTypeLabels[value] : "Not provided";
}

function ExistingTenantClaimStatusBadge({
  status,
}: {
  status: ExistingTenantClaimStatus;
}) {
  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}

function RejectExistingTenantClaimForm({
  claimId,
  disabled,
}: {
  claimId: string;
  disabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    rejectExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Claim rejected"
        errorTitle="Could not reject claim"
      />

      <input type="hidden" name="claimId" value={claimId} />

      <Textarea
        label="Rejection reason"
        name="reason"
        placeholder="Example: The tenant selected the wrong unit or rent due date."
        error={state.fieldErrors?.reason?.[0]}
      />

      <Button
        type="submit"
        variant="secondary"
        isLoading={isPending}
        disabled={disabled}
        fullWidth
      >
        Reject Claim
      </Button>
    </form>
  );
}

function ArrearsEstimateForm({
  claim,
}: {
  claim: ExistingTenantClaimDetailRow;
}) {
  const [state, formAction, isPending] = useActionState(
    updateExistingTenantClaimArrearsAction,
    initialExistingTenantClaimActionState,
  );

  const canCalculate =
    claim.status === "submitted" &&
    claim.tenant_move_in_date !== null &&
    claim.tenant_claimed_rent_amount !== null;

  return (
    <form action={formAction} className="space-y-4">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Arrears updated"
        errorTitle="Could not update arrears"
      />

      <input type="hidden" name="claimId" value={claim.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <CurrencyInput
          label="Last amount paid"
          name="lastPaymentAmount"
          defaultValue={claim.landlord_last_payment_amount}
          error={state.fieldErrors?.lastPaymentAmount?.[0]}
          required
          disabled={!canCalculate}
        />

        <Input
          label="Last payment date"
          name="lastPaymentDate"
          type="date"
          defaultValue={claim.landlord_last_payment_date ?? ""}
          error={state.fieldErrors?.lastPaymentDate?.[0]}
          required
          disabled={!canCalculate}
        />
      </div>

      <Button
        type="submit"
        variant="secondary"
        isLoading={isPending}
        disabled={!canCalculate}
        fullWidth
      >
        Calculate Arrears
      </Button>
    </form>
  );
}

function ArrearsSummary({ claim }: { claim: ExistingTenantClaimDetailRow }) {
  if (
    claim.bopa_calculated_current_due_date === null &&
    claim.bopa_calculated_outstanding_balance === null
  ) {
    return (
      <div className="rounded-button bg-background p-4 text-sm leading-6 text-text-muted">
        Add the last payment amount and payment date to estimate what the tenant
        may be owing.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Current Due Date
        </p>
        <p className="mt-2 font-extrabold text-text-strong">
          {formatDate(claim.bopa_calculated_current_due_date)}
        </p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Months Owed
        </p>
        <p className="mt-2 font-extrabold text-text-strong">
          {claim.bopa_calculated_months_owed}
        </p>
      </div>

      <div className="rounded-button bg-warning-soft p-4">
        <p className="text-xs font-black uppercase tracking-wide text-warning">
          Estimated Balance
        </p>
        <p className="mt-2 font-black text-warning">
          {formatNaira(Number(claim.bopa_calculated_outstanding_balance ?? 0))}
        </p>
      </div>
    </div>
  );
}

function DesktopClaimsTable({
  claims,
}: {
  claims: ExistingTenantClaimDetailRow[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-border-soft md:block">
      <table className="w-full border-collapse bg-white text-sm">
        <thead className="bg-background text-left text-xs font-black uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3">Tenant</th>
            <th className="px-4 py-3">Property / Unit</th>
            <th className="px-4 py-3">Claimed Rent</th>
            <th className="px-4 py-3">Move-in</th>
            <th className="px-4 py-3">Next Due</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border-soft">
          {claims.map((claim) => (
            <tr key={claim.id} className="align-top">
              <td className="px-4 py-4">
                <p className="font-extrabold text-text-strong">
                  {getTenantName(claim)}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {getTenantPhone(claim)}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-bold text-text-strong">
                  {getPropertyUnitLabel(claim)}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {claim.units?.properties?.address ?? "Address not available"}
                </p>
              </td>

              <td className="px-4 py-4">
                <p className="font-black text-text-strong">
                  {claim.tenant_claimed_rent_amount === null
                    ? "Not provided"
                    : formatNaira(Number(claim.tenant_claimed_rent_amount))}
                </p>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {claim.tenant_payment_frequency}
                </p>
              </td>

              <td className="px-4 py-4 font-bold text-text-strong">
                {formatDate(claim.tenant_move_in_date)}
              </td>

              <td className="px-4 py-4 font-bold text-text-strong">
                {formatDate(claim.tenant_claimed_next_rent_due_date)}
              </td>

              <td className="px-4 py-4">
                <ExistingTenantClaimStatusBadge status={claim.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileClaimsList({
  claims,
}: {
  claims: ExistingTenantClaimDetailRow[];
}) {
  return (
    <div className="space-y-3 md:hidden">
      {claims.map((claim) => (
        <article
          key={claim.id}
          className="rounded-card border border-border-soft bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-text-strong">
                {getTenantName(claim)}
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                {getTenantPhone(claim)}
              </p>
            </div>

            <ExistingTenantClaimStatusBadge status={claim.status} />
          </div>

          <div className="mt-4 space-y-2 rounded-button bg-background p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Unit</span>
              <span className="text-right font-extrabold text-text-strong">
                {getPropertyUnitLabel(claim)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Rent</span>
              <span className="text-right font-black text-text-strong">
                {claim.tenant_claimed_rent_amount === null
                  ? "Not provided"
                  : formatNaira(Number(claim.tenant_claimed_rent_amount))}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Move-in</span>
              <span className="text-right font-bold text-text-strong">
                {formatDate(claim.tenant_move_in_date)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="font-bold text-text-muted">Next due</span>
              <span className="text-right font-bold text-text-strong">
                {formatDate(claim.tenant_claimed_next_rent_due_date)}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ClaimReviewCard({ claim }: { claim: ExistingTenantClaimDetailRow }) {
  const canReject = claim.status === "pending" || claim.status === "submitted";

  return (
    <section className="rounded-card border border-border-soft bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-text-strong">
              {getTenantName(claim)}
            </h2>
            <ExistingTenantClaimStatusBadge status={claim.status} />
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            {getPropertyUnitLabel(claim)}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3 text-sm">
              <BriefcaseBusiness
                aria-hidden="true"
                size={18}
                strokeWidth={2.5}
                className="text-primary"
              />
              <div>
                <p className="font-bold text-text-muted">Occupation</p>
                <p className="font-extrabold text-text-strong">
                  {claim.tenant_occupation ?? "Not provided"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3 text-sm">
              <CreditCard
                aria-hidden="true"
                size={18}
                strokeWidth={2.5}
                className="text-primary"
              />
              <div>
                <p className="font-bold text-text-muted">Identification</p>
                <p className="font-extrabold text-text-strong">
                  {getIdTypeLabel(claim.tenant_id_type)}
                  {claim.tenant_id_number ? ` · ${claim.tenant_id_number}` : ""}
                </p>
              </div>
            </div>
          </div>

          {claim.tenant_notes ? (
            <p className="mt-3 rounded-button bg-background px-4 py-3 text-sm leading-6 text-text-muted">
              {claim.tenant_notes}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm lg:min-w-72">
          <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3">
            <CalendarClock
              aria-hidden="true"
              size={18}
              strokeWidth={2.5}
              className="text-primary"
            />
            <div>
              <p className="font-bold text-text-muted">Submitted</p>
              <p className="font-extrabold text-text-strong">
                {formatDateTime(claim.submitted_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-button bg-background px-4 py-3">
            <Home
              aria-hidden="true"
              size={18}
              strokeWidth={2.5}
              className="text-primary"
            />
            <div>
              <p className="font-bold text-text-muted">Claimed due date</p>
              <p className="font-extrabold text-text-strong">
                {formatDate(claim.tenant_claimed_next_rent_due_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {claim.status === "submitted" ? (
        <div className="mt-5 space-y-4 rounded-card border border-border-soft bg-white p-4">
          <div>
            <h3 className="text-base font-black text-text-strong">
              Arrears estimate
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Enter the last amount received and date paid. BOPA estimates the
              current due date and balance from the move-in date and rent cycle.
            </p>
          </div>

          <ArrearsEstimateForm claim={claim} />
          <ArrearsSummary claim={claim} />
        </div>
      ) : null}

      {canReject ? (
        <details className="mt-5 rounded-button bg-background p-4">
          <summary className="cursor-pointer text-sm font-extrabold text-danger">
            Reject this claim
          </summary>

          <div className="mt-4">
            <RejectExistingTenantClaimForm
              claimId={claim.id}
              disabled={!canReject}
            />
          </div>
        </details>
      ) : claim.rejected_reason ? (
        <div className="mt-5 flex gap-3 rounded-button bg-danger-soft p-4 text-sm leading-6 text-danger">
          <AlertTriangle
            aria-hidden="true"
            size={20}
            strokeWidth={2.6}
            className="shrink-0"
          />
          <p>{claim.rejected_reason}</p>
        </div>
      ) : null}
    </section>
  );
}

export function ExistingTenantClaimReviewList({
  claims,
}: ExistingTenantClaimReviewListProps) {
  const submittedClaims = claims.filter(
    (claim) => claim.status === "submitted",
  );
  const otherClaims = claims.filter((claim) => claim.status !== "submitted");

  return (
    <div className="space-y-6">
      {submittedClaims.length > 0 ? (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-warning">
              Needs Review
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              These tenants have submitted rent and due-date details. Calculate
              arrears first, then final approval will be handled in the next
              batch.
            </p>
          </div>

          <div className="space-y-4">
            {submittedClaims.map((claim) => (
              <ClaimReviewCard key={claim.id} claim={claim} />
            ))}
          </div>
        </div>
      ) : null}

      {claims.length > 0 ? (
        <div className="space-y-3">
          <DesktopClaimsTable claims={claims} />
          <MobileClaimsList claims={claims} />
        </div>
      ) : null}

      {otherClaims.length > 0 ? (
        <p className="text-sm font-semibold leading-6 text-text-muted">
          {otherClaims.length} claim
          {otherClaims.length === 1 ? "" : "s"} are pending, rejected, expired,
          approved, or cancelled.
        </p>
      ) : null}
    </div>
  );
}
