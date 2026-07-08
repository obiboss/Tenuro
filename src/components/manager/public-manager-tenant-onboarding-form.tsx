"use client";

import { useActionState, useMemo, useState } from "react";
import { submitManagerTenantOnboardingRequestAction } from "@/actions/manager-tenant-onboarding.actions";
import { initialManagerTenantOnboardingActionState } from "@/actions/manager-tenant-onboarding.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import type { ManagerTenantOnboardingRequestRow } from "@/server/repositories/manager-tenant-onboarding.repository";

type PublicManagerTenantOnboardingFormProps = {
  token: string;
  request: ManagerTenantOnboardingRequestRow;
};

const idTypeOptions = [
  ["nin", "NIN"],
  ["passport", "International Passport"],
  ["drivers_license", "Driver's License"],
  ["voters_card", "Voter's Card"],
] as const;

const frequencyOptions = [
  ["annual", "Annual rent"],
  ["monthly", "Monthly rent"],
  ["quarterly", "Quarterly rent"],
  ["biannual", "Biannual rent"],
] as const;

const successMessage =
  "Your information is being reviewed. Once approved, you will receive the tenancy agreement through WhatsApp or email within 24 to 48 hours. If you do not receive it after 48 hours, please contact the property manager.";

function buildToastId(params: { ok: boolean; message: string }) {
  return `${params.ok ? "success" : "error"}-${params.message}`;
}

export function PublicManagerTenantOnboardingForm({
  token,
  request,
}: PublicManagerTenantOnboardingFormProps) {
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    submitManagerTenantOnboardingRequestAction,
    initialManagerTenantOnboardingActionState,
  );

  const isCurrentOccupant = request.onboarding_type === "current_occupant";

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = buildToastId({
      ok: state.ok,
      message: state.message,
    });

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok ? "Details submitted" : "Could not submit details",
      description: state.ok ? successMessage : state.message,
    };
  }, [dismissedToastId, state.message, state.ok]);

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast toast={toast} onDismiss={setDismissedToastId} />
        </div>
      ) : null}

      {state.ok ? (
        <div className="rounded-card border border-border-soft bg-white p-5 shadow-sm">
          <div className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-success">
            Submitted
          </div>

          <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
            Details submitted
          </h1>

          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Your information is being reviewed.
          </p>

          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
            Once approved, you will receive the tenancy agreement through
            WhatsApp or email within 24 to 48 hours.
          </p>

          <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
            If you do not receive it after 48 hours, please contact the property
            manager.
          </p>
        </div>
      ) : (
        <form
          action={formAction}
          className="rounded-card border border-border-soft bg-white shadow-sm"
        >
          <input type="hidden" name="token" value={token} />

          <div className="border-b border-border-soft p-5">
            <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-black uppercase tracking-wide text-primary">
              Tenant details
            </p>

            <h1 className="mt-4 text-xl font-black tracking-tight text-text-strong">
              Confirm your details
            </h1>

            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {request.manager_units?.unit_label ?? "Unit"} ·{" "}
              {request.manager_properties?.property_name ?? "Property"}
            </p>
          </div>

          <div className="space-y-5 p-5">
            <section className="space-y-4">
              <div>
                <h2 className="text-base font-black tracking-tight text-text-strong">
                  Personal details
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  These details will appear on your tenant record.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full name"
                  name="fullName"
                  defaultValue={request.invited_tenant_full_name ?? ""}
                  error={state.fieldErrors?.fullName?.[0]}
                  required
                />

                <Input
                  label="Phone number"
                  name="phoneNumber"
                  defaultValue={request.invited_tenant_phone_number ?? ""}
                  error={state.fieldErrors?.phoneNumber?.[0]}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={request.invited_tenant_email ?? ""}
                  placeholder="Optional"
                  error={state.fieldErrors?.email?.[0]}
                />

                <Input
                  label="Occupation"
                  name="occupation"
                  placeholder="Optional"
                  error={state.fieldErrors?.occupation?.[0]}
                />
              </div>
            </section>

            <section className="border-t border-border-soft pt-5">
              <div>
                <h2 className="text-base font-black tracking-tight text-text-strong">
                  Identification
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                  Provide one valid identification record.
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-bold text-text-strong"
                    htmlFor="idType"
                  >
                    Means of ID
                  </label>

                  <select
                    id="idType"
                    name="idType"
                    className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                    required
                  >
                    {idTypeOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {state.fieldErrors?.idType?.[0] ? (
                    <p className="text-sm font-semibold text-danger">
                      {state.fieldErrors.idType[0]}
                    </p>
                  ) : null}
                </div>

                <Input
                  label="ID number"
                  name="idNumber"
                  error={state.fieldErrors?.idNumber?.[0]}
                  required
                />
              </div>
            </section>

            {isCurrentOccupant ? (
              <section className="border-t border-border-soft pt-5">
                <div>
                  <h2 className="text-base font-black tracking-tight text-text-strong">
                    Rent details
                  </h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Enter the current rent details for this existing tenant.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Move-in date"
                    name="moveInDate"
                    type="date"
                    error={state.fieldErrors?.moveInDate?.[0]}
                    required
                  />

                  <div className="space-y-2">
                    <label
                      className="text-sm font-bold text-text-strong"
                      htmlFor="paymentFrequency"
                    >
                      Rent frequency
                    </label>

                    <select
                      id="paymentFrequency"
                      name="paymentFrequency"
                      defaultValue="annual"
                      className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                      required
                    >
                      {frequencyOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <CurrencyInput
                    label="Rent amount"
                    name="claimedRentAmount"
                    placeholder="0.00"
                    defaultValue={String(
                      request.manager_units?.rent_amount ?? "",
                    )}
                    error={state.fieldErrors?.claimedRentAmount?.[0]}
                    required
                  />
                </div>
              </section>
            ) : null}

            <details className="rounded-card border border-border-soft bg-white p-4">
              <summary className="cursor-pointer text-sm font-black text-primary">
                Add note
              </summary>

              <div className="mt-3 space-y-2">
                <label
                  htmlFor="tenantNotes"
                  className="text-sm font-bold text-text-strong"
                >
                  Note
                </label>

                <textarea
                  id="tenantNotes"
                  name="tenantNotes"
                  rows={3}
                  placeholder="Optional"
                  className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                />
              </div>
            </details>
          </div>

          <div className="border-t border-border-soft p-5">
            <Button type="submit" isLoading={isPending} fullWidth>
              Submit Details
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
