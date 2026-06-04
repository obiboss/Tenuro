"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateCurrentDueDate } from "@/lib/existing-tenant-arrears";
import type {
  ExistingTenantClaimDetailRow,
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
  pending: { label: "Link Sent", tone: "neutral" },
  submitted: { label: "Needs Review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  expired: { label: "Expired", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
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

function getBopaDueDate(claim: ExistingTenantClaimDetailRow) {
  return (
    claim.landlord_confirmed_current_due_date ??
    claim.bopa_calculated_current_due_date ??
    (claim.tenant_move_in_date
      ? calculateCurrentDueDate({
          moveInDate: claim.tenant_move_in_date,
          paymentFrequency: claim.tenant_payment_frequency,
        })
      : null)
  );
}

function ExistingTenantClaimStatusBadge({
  status,
}: {
  status: ExistingTenantClaimStatus;
}) {
  const copy = statusCopy[status];

  return <Badge tone={copy.tone}>{copy.label}</Badge>;
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
            <th className="px-4 py-3">Rent</th>
            <th className="px-4 py-3">Move-in</th>
            <th className="px-4 py-3">Due Date</th>
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
                {formatDate(getBopaDueDate(claim))}
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
              <span className="font-bold text-text-muted">Due date</span>
              <span className="text-right font-bold text-text-strong">
                {formatDate(getBopaDueDate(claim))}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
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
              Open a claim to review details, record rent history, and approve.
            </p>
          </div>

          <div className="space-y-4">
            {submittedClaims.map((claim) => (
              <article
                key={claim.id}
                className="flex flex-col gap-4 rounded-card border border-border-soft bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-lg font-black text-text-strong">
                    {getTenantName(claim)}
                  </p>
                  <p className="mt-1 text-base text-text-muted">
                    {getPropertyUnitLabel(claim)}
                  </p>
                </div>
                <Link href={`/existing-tenant-claims/${claim.id}`}>
                  <Button>Review claim</Button>
                </Link>
              </article>
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
