"use client";

import { useActionState } from "react";
import { createExistingTenantClaimAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { ExistingTenantClaimUnitOption } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimLinkFormProps = {
  units: ExistingTenantClaimUnitOption[];
};

function formatExpiry(value: string | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExistingTenantClaimLinkForm({
  units,
}: ExistingTenantClaimLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    createExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  const unitOptions = units.map((unit) => ({
    label: unit.label,
    value: unit.value,
  }));

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5">
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Claim link ready"
          errorTitle="Could not prepare claim link"
        />

        <TrustNotice
          title="Existing tenant claim link"
          description="Select the unit the tenant already occupies. The tenant will fill in their details, rent amount, move-in date, and next due date for your review."
        />

        {state.message ? (
          <div
            role="alert"
            className={
              state.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {state.message}
          </div>
        ) : null}

        <Select
          label="Occupied unit"
          name="unitId"
          options={unitOptions}
          error={state.fieldErrors?.unitId?.[0]}
          required
        />

        <Textarea
          label="Internal note"
          name="note"
          placeholder="Optional note for your own review"
          error={state.fieldErrors?.note?.[0]}
        />

        <Button
          type="submit"
          isLoading={isPending}
          fullWidth
          disabled={units.length === 0}
        >
          Prepare Existing Tenant Link
        </Button>
      </form>

      {state.ok && state.claimUrl && state.whatsappMessage ? (
        <div className="space-y-4 rounded-card border border-primary/15 bg-primary-soft/40 p-4">
          <div>
            <p className="text-sm font-extrabold text-text-strong">
              Claim link prepared
            </p>

            <p className="mt-1 break-all text-sm font-semibold leading-6 text-text-muted">
              {state.claimUrl}
            </p>

            {formatExpiry(state.expiresAt) ? (
              <p className="mt-2 text-xs font-bold text-text-muted">
                Expires {formatExpiry(state.expiresAt)}
              </p>
            ) : null}
          </div>

          <WhatsAppSendButton
            phoneNumber={null}
            message={state.whatsappMessage}
            label="Open WhatsApp"
          />
        </div>
      ) : null}
    </div>
  );
}
