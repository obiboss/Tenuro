"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createManagerTenantOnboardingRequestAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildWaMeUrl } from "@/lib/whatsapp";
import type {
  ManagerPropertyRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerTenantOnboardingFormProps = {
  property: ManagerPropertyRow;
  unit: ManagerUnitRow;
};

export function ManagerTenantOnboardingForm({
  property,
  unit,
}: ManagerTenantOnboardingFormProps) {
  const openedMessageRef = useRef<string | null>(null);
  const [onboardingType, setOnboardingType] = useState<
    "current_occupant" | "new_incoming_tenant"
  >("current_occupant");

  const [state, formAction, isPending] = useActionState(
    createManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
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

  return (
    <form action={formAction}>
      <input
        type="hidden"
        name="landlordClientId"
        value={property.landlord_client_id}
      />
      <input type="hidden" name="propertyId" value={property.id} />
      <input type="hidden" name="unitId" value={unit.id} />
      <input type="hidden" name="onboardingType" value={onboardingType} />

      <Card>
        <CardContent>
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Add tenant to {unit.unit_label}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Send a secure link so the tenant fills their details.
            </p>
          </div>

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

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={onboardingType === "current_occupant"}
              onClick={() => setOnboardingType("current_occupant")}
              className={`rounded-card border p-4 text-left transition ${
                onboardingType === "current_occupant"
                  ? "border-primary bg-primary-soft"
                  : "border-border-soft bg-white hover:border-primary/40"
              }`}
            >
              <p className="font-black text-text-strong">Current occupant</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Already living in the unit.
              </p>
            </button>

            <button
              type="button"
              aria-pressed={onboardingType === "new_incoming_tenant"}
              onClick={() => setOnboardingType("new_incoming_tenant")}
              className={`rounded-card border p-4 text-left transition ${
                onboardingType === "new_incoming_tenant"
                  ? "border-primary bg-primary-soft"
                  : "border-border-soft bg-white hover:border-primary/40"
              }`}
            >
              <p className="font-black text-text-strong">New incoming tenant</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Agreement first, then rent payment.
              </p>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Tenant name"
              name="fullName"
              placeholder="Example: Chinedu Okafor"
              error={state.fieldErrors?.fullName?.[0]}
              required
            />

            <Input
              label="Tenant phone"
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

          <div className="space-y-2">
            <label
              htmlFor="manager-onboarding-note"
              className="text-sm font-bold text-text-strong"
            >
              Internal note
            </label>
            <textarea
              id="manager-onboarding-note"
              name="note"
              rows={3}
              placeholder="Optional"
              className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
            />
            {state.fieldErrors?.note?.[0] ? (
              <p className="text-sm font-semibold text-danger">
                {state.fieldErrors.note[0]}
              </p>
            ) : null}
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending} fullWidth>
            Send Tenant Detail Link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
