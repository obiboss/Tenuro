"use client";

import { useActionState, useMemo, useState } from "react";
import { createManagerTenantOnboardingRequestAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
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

type TenantOnboardingType = "current_occupant" | "new_incoming_tenant";

const ONBOARDING_OPTIONS: Array<{
  value: TenantOnboardingType;
  title: string;
  description: string;
  result: string;
}> = [
  {
    value: "current_occupant",
    title: "Current occupant",
    description: "The person already lives in this unit.",
    result: "After review, the tenant record becomes active.",
  },
  {
    value: "new_incoming_tenant",
    title: "New incoming tenant",
    description: "The person is about to move in.",
    result:
      "After review, the tenant receives the agreement and first rent payment link.",
  },
];

export function ManagerTenantOnboardingForm({
  property,
  unit,
}: ManagerTenantOnboardingFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [onboardingType, setOnboardingType] =
    useState<TenantOnboardingType>("current_occupant");

  const [state, formAction, isPending] = useActionState(
    createManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const selectedOption = useMemo(
    () =>
      ONBOARDING_OPTIONS.find((option) => option.value === onboardingType) ??
      ONBOARDING_OPTIONS[0],
    [onboardingType],
  );

  const whatsappUrl =
    state.ok && state.whatsappMessage
      ? buildWaMeUrl({
          phoneNumber: state.tenantWhatsappNumber,
          message: state.whatsappMessage,
        })
      : null;

  if (state.ok) {
    return (
      <section
        id="tenant-onboarding"
        className="rounded-card border border-border-soft bg-white shadow-sm"
      >
        <div className="border-b border-border-soft p-4">
          <p className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
            Link ready
          </p>

          <h2 className="mt-4 text-lg font-black tracking-tight text-text-strong">
            Tenant detail link is ready
          </h2>

          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Send it to the tenant on WhatsApp. When the tenant submits details,
            the request will appear in the review table.
          </p>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-card bg-surface p-4">
            <p className="text-sm font-black text-text-strong">
              {unit.unit_label} · {property.property_name}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Do not create another tenant request for this unit while this one
              is in progress.
            </p>
          </div>

          {whatsappUrl ? (
            <>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
              >
                Open WhatsApp
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
              >
                Send again
              </a>
            </>
          ) : null}

          <a
            href="#tenant-review"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
          >
            Go to review table
          </a>
        </div>
      </section>
    );
  }

  if (!isFormOpen) {
    return (
      <section
        id="tenant-onboarding"
        className="rounded-card border border-border-soft bg-white shadow-sm"
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black tracking-tight text-text-strong">
              Add tenant to {unit.unit_label}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              {property.property_name}. Open the form only when you are ready to
              send a tenant detail link.
            </p>
          </div>

          <Button type="button" onClick={() => setIsFormOpen(true)}>
            Open tenant form
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="tenant-onboarding"
      className="rounded-card border border-border-soft bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-text-strong">
            Add tenant
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            {unit.unit_label} · {property.property_name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-surface"
        >
          Close form
        </button>
      </div>

      <form action={formAction}>
        <input
          type="hidden"
          name="landlordClientId"
          value={property.landlord_client_id}
        />
        <input type="hidden" name="propertyId" value={property.id} />
        <input type="hidden" name="unitId" value={unit.id} />
        <input type="hidden" name="onboardingType" value={onboardingType} />

        <div className="grid gap-5 p-4 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            {state.message ? (
              <div
                role="alert"
                className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              >
                {state.message}
              </div>
            ) : null}

            <div>
              <p className="text-sm font-black text-text-strong">
                What type of tenant is this?
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ONBOARDING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={onboardingType === option.value}
                    onClick={() => setOnboardingType(option.value)}
                    className={`rounded-card border p-4 text-left transition ${
                      onboardingType === option.value
                        ? "border-primary bg-primary-soft"
                        : "border-border-soft bg-white hover:border-primary/40"
                    }`}
                  >
                    <p className="font-black text-text-strong">
                      {option.title}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-card bg-surface p-4">
              <p className="text-sm font-black text-text-strong">
                Send tenant detail link
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Enter the tenant name and phone number. The tenant will complete
                the remaining details from WhatsApp.
              </p>
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

            <details className="rounded-card border border-border-soft bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-primary">
                Add internal note
              </summary>

              <div className="mt-3 space-y-2">
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
            </details>
          </div>

          <aside className="rounded-card border border-border-soft bg-surface p-4 lg:self-start">
            <p className="text-sm font-black text-text-strong">Next step</p>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Tenant type
                </p>
                <p className="mt-1 text-sm font-black text-text-strong">
                  {selectedOption.title}
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  Tenant receives
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  A WhatsApp link to submit their details.
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                  After review
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  {selectedOption.result}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="border-t border-border-soft p-4">
          <Button type="submit" isLoading={isPending} fullWidth>
            Create tenant detail link
          </Button>
        </div>
      </form>
    </section>
  );
}
