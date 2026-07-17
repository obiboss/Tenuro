"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveManagerPropertyServiceChargesAction } from "@/actions/manager-property-settings.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Toast, type ToastItem } from "@/components/ui/toast";
import { LANDLORD_CHARGE_PRESETS } from "@/lib/landlord-charge-presets";
import type { ManagerPropertyServiceChargeSettingsRow } from "@/server/repositories/manager-property-settings.repository";
import type {
  ManagerPropertyChargeBearer,
  ManagerPropertyChargeBillingCycle,
} from "@/server/validators/manager-property-settings.schema";

type Props = {
  propertyId: string;
  landlordClientId: string;
  initialCharges: ManagerPropertyServiceChargeSettingsRow[];
};

type ChargeDraft = {
  id: string;
  chargeCode: string | null;
  chargeName: string;
  description: string;
  amount: string;
  chargeBearer: ManagerPropertyChargeBearer;
  billingCycle: ManagerPropertyChargeBillingCycle;
  isRequiredBeforeMoveIn: boolean;
};

const BILLING_CYCLES: Array<{
  value: ManagerPropertyChargeBillingCycle;
  label: string;
}> = [
  { value: "one_time", label: "One-time charge" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "biannual", label: "Every 6 months" },
  { value: "annual", label: "Yearly" },
];

function createDraftId() {
  return crypto.randomUUID();
}

function fromStoredCharge(
  charge: ManagerPropertyServiceChargeSettingsRow,
): ChargeDraft {
  return {
    id: charge.id,
    chargeCode: charge.charge_code,
    chargeName: charge.charge_name,
    description: charge.description ?? "",
    amount: String(charge.amount),
    chargeBearer: charge.charge_bearer,
    billingCycle: charge.billing_cycle,
    isRequiredBeforeMoveIn:
      charge.is_required_before_move_in,
  };
}

function createChargeDraft(presetId: string): ChargeDraft {
  const preset =
    LANDLORD_CHARGE_PRESETS.find((item) => item.id === presetId) ??
    LANDLORD_CHARGE_PRESETS[0];

  return {
    id: createDraftId(),
    chargeCode: preset.id === "other" ? null : preset.id,
    chargeName: preset.id === "other" ? "" : preset.name,
    description: preset.defaultDescription,
    amount: "",
    chargeBearer: "tenant",
    billingCycle: "one_time",
    isRequiredBeforeMoveIn: preset.isRequiredBeforeMoveIn,
  };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function ManagerPropertyServiceChargeSettings({
  propertyId,
  landlordClientId,
  initialCharges,
}: Props) {
  const router = useRouter();
  const [charges, setCharges] = useState<ChargeDraft[]>(
    initialCharges.map(fromStoredCharge),
  );
  const [dismissedToastId, setDismissedToastId] =
    useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    saveManagerPropertyServiceChargesAction,
    initialManagerActionState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok, state.submissionId]);

  const total = useMemo(
    () =>
      charges.reduce((sum, charge) => {
        const amount = Number(charge.amount);

        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [charges],
  );

  const chargesJson = useMemo(
    () =>
      JSON.stringify(
        charges.map((charge) => ({
          chargeCode: charge.chargeCode,
          chargeName: charge.chargeName,
          description: charge.description,
          amount: charge.amount,
          chargeBearer: charge.chargeBearer,
          billingCycle: charge.billingCycle,
          isRequiredBeforeMoveIn:
            charge.chargeBearer === "tenant" &&
            charge.isRequiredBeforeMoveIn,
        })),
      ),
    [charges],
  );

  const toast = useMemo<ToastItem | null>(() => {
    if (!state.message) {
      return null;
    }

    const id = [
      "property-charges",
      state.ok ? "success" : "error",
      state.submissionId ?? state.message,
    ].join("-");

    if (dismissedToastId === id) {
      return null;
    }

    return {
      id,
      tone: state.ok ? "success" : "error",
      title: state.ok
        ? "Charges saved"
        : "Could not save charges",
      description: state.message,
    };
  }, [
    dismissedToastId,
    state.message,
    state.ok,
    state.submissionId,
  ]);

  function addCharge(presetId: string) {
    setCharges((current) => [
      ...current,
      createChargeDraft(presetId),
    ]);
  }

  function updateCharge(
    id: string,
    update: (charge: ChargeDraft) => ChargeDraft,
  ) {
    setCharges((current) =>
      current.map((charge) =>
        charge.id === id ? update(charge) : charge,
      ),
    );
  }

  function removeCharge(id: string) {
    setCharges((current) =>
      current.filter((charge) => charge.id !== id),
    );
  }

  return (
    <>
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <Toast
            toast={toast}
            onDismiss={setDismissedToastId}
          />
        </div>
      ) : null}

      <form
        action={formAction}
        className="rounded-card border border-border-soft bg-white shadow-sm"
      >
        <input type="hidden" name="propertyId" value={propertyId} />
        <input
          type="hidden"
          name="landlordClientId"
          value={landlordClientId}
        />
        <input type="hidden" name="chargesJson" value={chargesJson} />

        <div className="flex flex-col gap-3 border-b border-border-soft p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-tight text-text-strong">
              Property charges
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Choose who pays each charge and when it applies.
            </p>
          </div>

          <p className="text-sm font-black text-primary">
            {formatMoney(total)}
          </p>
        </div>

        <div className="space-y-5 p-4">
          <div>
            <p className="text-sm font-black text-text-strong">
              Add a charge
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {LANDLORD_CHARGE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => addCharge(preset.id)}
                  className="inline-flex min-h-10 items-center rounded-button border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {charges.length > 0 ? (
            <div className="space-y-4">
              {charges.map((charge, index) => (
                <article
                  key={charge.id}
                  className="space-y-4 rounded-card border border-border-soft bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-text-strong">
                        Charge {index + 1}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        This affects new payment requests only.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCharge(charge.id)}
                      className="text-sm font-black text-danger underline-offset-4 hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Charge name"
                      value={charge.chargeName}
                      onChange={(event) =>
                        updateCharge(charge.id, (current) => ({
                          ...current,
                          chargeName: event.target.value,
                        }))
                      }
                      placeholder="Example: Estate security"
                      required
                    />

                    <CurrencyInput
                      label="Amount"
                      name={`charge-amount-${charge.id}`}
                      value={charge.amount}
                      onValueChange={(value) =>
                        updateCharge(charge.id, (current) => ({
                          ...current,
                          amount: value,
                        }))
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor={`charge-bearer-${charge.id}`}
                        className="text-sm font-bold text-text-strong"
                      >
                        Who pays?
                      </label>

                      <select
                        id={`charge-bearer-${charge.id}`}
                        value={charge.chargeBearer}
                        onChange={(event) =>
                          updateCharge(charge.id, (current) => {
                            const chargeBearer =
                              event.target
                                .value as ManagerPropertyChargeBearer;

                            return {
                              ...current,
                              chargeBearer,
                              isRequiredBeforeMoveIn:
                                chargeBearer === "tenant"
                                  ? current.isRequiredBeforeMoveIn
                                  : false,
                            };
                          })
                        }
                        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                      >
                        <option value="tenant">Tenant</option>
                        <option value="landlord">Landlord</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`billing-cycle-${charge.id}`}
                        className="text-sm font-bold text-text-strong"
                      >
                        How often?
                      </label>

                      <select
                        id={`billing-cycle-${charge.id}`}
                        value={charge.billingCycle}
                        onChange={(event) =>
                          updateCharge(charge.id, (current) => ({
                            ...current,
                            billingCycle:
                              event.target
                                .value as ManagerPropertyChargeBillingCycle,
                          }))
                        }
                        className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary"
                      >
                        {BILLING_CYCLES.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {charge.chargeBearer === "tenant" ? (
                    <label className="flex gap-3 rounded-card border border-border-soft bg-white p-4 text-sm font-semibold leading-6 text-text-strong">
                      <input
                        type="checkbox"
                        checked={charge.isRequiredBeforeMoveIn}
                        onChange={(event) =>
                          updateCharge(charge.id, (current) => ({
                            ...current,
                            isRequiredBeforeMoveIn:
                              event.target.checked,
                          }))
                        }
                        className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                      />
                      <span>
                        Add this charge to the tenant&apos;s first payment
                        before move-in.
                      </span>
                    </label>
                  ) : (
                    <p className="rounded-card bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-muted">
                      Landlord-paid charges are not added to the tenant&apos;s
                      Paystack payment.
                    </p>
                  )}

                  <div className="space-y-2">
                    <label
                      htmlFor={`charge-description-${charge.id}`}
                      className="text-sm font-bold text-text-strong"
                    >
                      Description
                    </label>

                    <textarea
                      id={`charge-description-${charge.id}`}
                      value={charge.description}
                      onChange={(event) =>
                        updateCharge(charge.id, (current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Optional explanation"
                      className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary"
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-card bg-surface p-4">
              <p className="font-black text-text-strong">
                No property charges
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                New tenant payments will contain rent only.
              </p>
            </div>
          )}

          {state.fieldErrors?.charges?.[0] ? (
            <p className="text-sm font-semibold text-danger">
              {state.fieldErrors.charges[0]}
            </p>
          ) : null}

          <div className="rounded-card bg-primary-soft p-4">
            <p className="text-sm font-black text-text-strong">
              Existing payment links remain unchanged
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
              Saved payment requests keep their original charge snapshot.
              These changes apply only to payment requests created afterward.
            </p>
          </div>
        </div>

        <div className="border-t border-border-soft p-4">
          <Button type="submit" isLoading={isPending} fullWidth>
            Save property charges
          </Button>
        </div>
      </form>
    </>
  );
}
