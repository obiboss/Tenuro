"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { createExistingTenantClaimAction } from "@/actions/existing-tenant-claims.actions";
import { initialExistingTenantClaimActionState } from "@/actions/existing-tenant-claims.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type { ExistingTenantClaimUnitOption } from "@/server/services/existing-tenant-claims.service";

type ExistingTenantClaimLinkFormProps = {
  units: ExistingTenantClaimUnitOption[];
};

export function ExistingTenantClaimLinkForm({
  units,
}: ExistingTenantClaimLinkFormProps) {
  const openedMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    createExistingTenantClaimAction,
    initialExistingTenantClaimActionState,
  );

  useEffect(() => {
    if (
      !state.ok ||
      !state.whatsappMessage ||
      !state.tenantWhatsappNumber ||
      openedMessageRef.current === state.whatsappMessage
    ) {
      return;
    }

    openedMessageRef.current = state.whatsappMessage;

    window.location.assign(
      buildWaMeUrl({
        phoneNumber: state.tenantWhatsappNumber,
        message: state.whatsappMessage,
      }),
    );
  }, [state.ok, state.tenantWhatsappNumber, state.whatsappMessage]);

  const unitOptions = units.map((unit) => ({
    label: unit.label,
    value: unit.value,
  }));

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Opening WhatsApp"
        errorTitle="Could not send claim link"
      />

      <TrustNotice
        title="Send existing tenant link"
        description="Enter the tenant name and phone number you already know, then select the unit they occupy. BOPA will create the secure link and open WhatsApp with the message ready to send."
        icon={<MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />}
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

      <Input
        label="Tenant email"
        name="email"
        type="email"
        placeholder="Optional"
        error={state.fieldErrors?.email?.[0]}
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
        Send Existing Tenant Link
      </Button>
    </form>
  );
}
