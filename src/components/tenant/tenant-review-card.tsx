"use client";

import { useActionState } from "react";
import {
  approveTenantAction,
  rejectTenantAction,
} from "@/actions/tenants.actions";
import { initialTenantActionState } from "@/actions/tenant.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { GuarantorRow } from "@/server/repositories/guarantors.repository";
import type { TenantListRow } from "@/server/repositories/tenants.repository";

type TenantReviewCardProps = {
  tenant: TenantListRow;
  guarantor: GuarantorRow | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function idTypeLabel(value: TenantListRow["id_type"]) {
  if (value === "nin") {
    return "NIN";
  }

  if (value === "passport") {
    return "International Passport";
  }

  if (value === "drivers_license") {
    return "Driver's License";
  }

  if (value === "voters_card") {
    return "Voter's Card";
  }

  return "Not provided";
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-button bg-background p-4">
      <p className="text-sm font-bold text-text-muted">{label}</p>
      <p className="mt-2 break-words font-extrabold text-text-strong">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export function TenantReviewCard({ tenant, guarantor }: TenantReviewCardProps) {
  const [approveState, approveFormAction, isApproving] = useActionState(
    approveTenantAction,
    initialTenantActionState,
  );

  const [rejectState, rejectFormAction, isRejecting] = useActionState(
    rejectTenantAction,
    initialTenantActionState,
  );

  const canReview = tenant.onboarding_status === "profile_complete";
  const isApproved = tenant.onboarding_status === "approved";
  const isRejected = tenant.onboarding_status === "rejected";

  if (tenant.onboarding_status === "invited") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant Review</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
            The tenant has not submitted their KYC profile yet. Generate or send
            the onboarding link and wait for submission.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <ActionResultToast
        ok={approveState.ok}
        message={approveState.message}
        successTitle="Tenant approved"
        errorTitle="Approval failed"
      />

      <ActionResultToast
        ok={rejectState.ok}
        message={rejectState.message}
        successTitle="Tenant rejected"
        errorTitle="Rejection failed"
      />

      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Tenant Review</CardTitle>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Review submitted KYC and guarantor details before approving this
              tenant.
            </p>
          </div>

          <Badge
            tone={isApproved ? "success" : isRejected ? "danger" : "primary"}
          >
            {isApproved
              ? "Approved"
              : isRejected
                ? "Rejected"
                : "Ready for review"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {isRejected && tenant.rejected_reason ? (
          <div className="mb-5 rounded-button bg-danger-soft p-4 text-sm font-semibold leading-6 text-danger">
            Rejection reason: {tenant.rejected_reason}
          </div>
        ) : null}

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-extrabold text-text-strong">
              Submitted Tenant Details
            </h3>

            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <DetailItem label="Full name" value={tenant.full_name} />
              <DetailItem label="Phone number" value={tenant.phone_number} />
              <DetailItem label="Email" value={tenant.email} />
              <DetailItem
                label="Date of birth"
                value={formatDate(tenant.date_of_birth)}
              />
              <DetailItem label="Home address" value={tenant.home_address} />
              <DetailItem label="Occupation" value={tenant.occupation} />
              <DetailItem label="Employer" value={tenant.employer} />
              <DetailItem label="ID type" value={idTypeLabel(tenant.id_type)} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-text-strong">
              Guarantor Details
            </h3>

            {guarantor ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <DetailItem label="Full name" value={guarantor.full_name} />
                <DetailItem
                  label="Phone number"
                  value={guarantor.phone_number}
                />
                <DetailItem label="Email" value={guarantor.email} />
                <DetailItem
                  label="Relationship"
                  value={guarantor.relationship_to_tenant}
                />
                <DetailItem label="Address" value={guarantor.address} />
              </div>
            ) : (
              <div className="mt-3 rounded-button bg-warning-soft p-4 text-sm font-semibold leading-6 text-warning">
                No guarantor details have been submitted yet.
              </div>
            )}
          </div>

          {canReview ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <form action={approveFormAction}>
                <input type="hidden" name="tenantId" value={tenant.id} />

                <Button type="submit" isLoading={isApproving} fullWidth>
                  Approve Tenant
                </Button>
              </form>

              <form action={rejectFormAction} className="space-y-3">
                <input type="hidden" name="tenantId" value={tenant.id} />

                <Textarea
                  label="Reason for rejection"
                  name="reason"
                  placeholder="Example: ID details could not be verified."
                  error={rejectState.fieldErrors?.reason?.[0]}
                  required
                />

                <Button
                  type="submit"
                  variant="secondary"
                  isLoading={isRejecting}
                  fullWidth
                >
                  Reject Tenant
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter>
        <p className="text-sm leading-6 text-text-muted">
          Approval allows the landlord to proceed with the tenancy record,
          agreement document, and payment-link flow.
        </p>
      </CardFooter>
    </Card>
  );
}
