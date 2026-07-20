"use client";

import { useActionState } from "react";
import { MessageCircle } from "lucide-react";
import { createExistingTenantClaimAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrustNotice } from "@/components/ui/trust-notice";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import type { ExistingTenantClaimUnitOption } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimLinkFormProps = {
  units: ExistingTenantClaimUnitOption[];
};

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
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Tenant link is ready"
        errorTitle="Could not send claim link"
      />

      {state.ok && state.claimUrl && state.whatsappMessage ? (
        <div className="rounded-card border border-success/20 bg-success-soft p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-success">
              <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
            </span>
            <div>
              <h3 className="text-lg font-black text-text-strong">
                Tenant link is ready
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Send the link to the tenant. They will fill their details and
                submit them for your review.
              </p>
            </div>
          </div>

          <WhatsAppShareActions
            className="mt-5"
            phoneNumber={state.tenantWhatsappNumber}
            message={state.whatsappMessage}
            copyText={state.claimUrl}
            whatsappLabel="Send link on WhatsApp"
            copyLabel="Copy link"
          />
        </div>
      ) : (
        <TrustNotice
          title="Invite the existing tenant"
          description="Enter their name and phone number, then choose the apartment they already occupy."
          icon={
            <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
          }
        />
      )}

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

      <input type="hidden" name="email" value="" />
      <input type="hidden" name="note" value="" />

      <Select
        label="Occupied unit"
        name="unitId"
        options={unitOptions}
        error={state.fieldErrors?.unitId?.[0]}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Tenant name"
          name="fullName"
          placeholder="Example: Chinedu Okafor"
          error={state.fieldErrors?.fullName?.[0]}
          required
        />

        <Input
          label="Tenant phone number"
          name="phoneNumber"
          placeholder="Example: 08012345678"
          error={state.fieldErrors?.phoneNumber?.[0]}
          required
        />
      </div>

      <Button
        type="submit"
        isLoading={isPending}
        fullWidth
        disabled={units.length === 0}
      >
        Prepare tenant link
      </Button>
    </form>
  );
}
