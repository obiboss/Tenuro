"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import { saveManagerPropertyServiceChargesAction } from "@/actions/manager-property-settings.actions";
import {
  initialManagerActionState,
  type ManagerActionState,
} from "@/actions/manager.state";
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
  summaryLabel: string;
}> = [
  {
    value: "one_time",
    label: "One-time charge",
    summaryLabel: "One-time",
  },
  {
    value: "monthly",
    label: "Monthly",
    summaryLabel: "Monthly",
  },
  {
    value: "quarterly",
    label: "Every 3 months",
    summaryLabel: "Every 3 months",
  },
  {
    value: "biannual",
    label: "Every 6 months",
    summaryLabel: "Every 6 months",
  },
  {
    value: "annual",
    label: "Yearly",
    summaryLabel: "Yearly",
  },
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
    LANDLORD_CHARGE_PRESETS.find(
      (item) => item.id === presetId,
    ) ?? LANDLORD_CHARGE_PRESETS[0];

  return {
    id: createDraftId(),
    chargeCode: preset.id === "other" ? null : preset.id,
    chargeName: preset.id === "other" ? "" : preset.name,
    description: preset.defaultDescription,
    amount: "",
    chargeBearer: "tenant",
    billingCycle: "one_time",
    isRequiredBeforeMoveIn:
      preset.isRequiredBeforeMoveIn,
  };
}

function cloneCharges(charges: ChargeDraft[]) {
  return charges.map((charge) => ({ ...charge }));
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getBillingCycleSummary(
  value: ManagerPropertyChargeBillingCycle,
) {
  return (
    BILLING_CYCLES.find((cycle) => cycle.value === value)
      ?.summaryLabel ?? "One-time"
  );
}

function getChargeSummary(charge: ChargeDraft) {
  const amount = Number(charge.amount);
  const payer =
    charge.chargeBearer === "tenant"
      ? "Tenant pays"
      : "Landlord pays";

  return [
    formatMoney(Number.isFinite(amount) ? amount : 0),
    payer,
    getBillingCycleSummary(charge.billingCycle),
  ].join(" · ");
}

function matchesPreset(
  charge: ChargeDraft,
  presetId: string,
) {
  return presetId === "other"
    ? charge.chargeCode === null
    : charge.chargeCode === presetId;
}

export function ManagerPropertyServiceChargeSettings({
  propertyId,
  landlordClientId,
  initialCharges,
}: Props) {
  const router = useRouter();
  const initialDrafts = useMemo(
    () => initialCharges.map(fromStoredCharge),
    [initialCharges],
  );
  const [charges, setCharges] = useState<ChargeDraft[]>(
    initialDrafts,
  );
  const [savedCharges, setSavedCharges] =
    useState<ChargeDraft[]>(initialDrafts);
  const [editingChargeId, setEditingChargeId] =
    useState<string | null>(null);
  const [dismissedToastId, setDismissedToastId] =
    useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (
      previousState: ManagerActionState,
      formData: FormData,
    ) => {
      const result =
        await saveManagerPropertyServiceChargesAction(
          previousState,
          formData,
        );

      if (result.ok) {
        const savedSnapshot = cloneCharges(charges);
        setSavedCharges(savedSnapshot);
        setCharges(savedSnapshot);
        setEditingChargeId(null);
        router.refresh();
      }

      return result;
    },
    initialManagerActionState,
  );

  const total = useMemo(
    () =>
      charges.reduce((sum, charge) => {
        const amount = Number(charge.amount);

        return Number.isFinite(amount)
          ? sum + amount
          : sum;
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

  function openChargeEditor(id: string) {
    setEditingChargeId(id);

    window.requestAnimationFrame(() => {
      document
        .getElementById(`property-charge-${id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  function handlePresetClick(presetId: string) {
    const existingCharge = charges.find((charge) =>
      matchesPreset(charge, presetId),
    );

    if (existingCharge) {
      openChargeEditor(existingCharge.id);
      return;
    }

    const newCharge = createChargeDraft(presetId);

    setCharges((current) => [...current, newCharge]);
    openChargeEditor(newCharge.id);
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

    if (editingChargeId === id) {
      setEditingChargeId(null);
    }
  }

  function cancelChanges() {
    setCharges(cloneCharges(savedCharges));
    setEditingChargeId(null);
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
        <input
          type="hidden"
          name="propertyId"
          value={propertyId}
        />
        <input
          type="hidden"
          name="landlordClientId"
          value={landlordClientId}
        />
        <input
          type="hidden"
          name="chargesJson"
          value={chargesJson}
        />

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
              {LANDLORD_CHARGE_PRESETS.map((preset) => {
                const existingCharge = charges.find(
                  (charge) =>
                    matchesPreset(charge, preset.id),
                );
                const alreadyAdded = Boolean(existingCharge);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={alreadyAdded}
                    onClick={() =>
                      handlePresetClick(preset.id)
                    }
                    className={
                      alreadyAdded
                        ? "inline-flex min-h-10 items-center gap-2 rounded-button border border-primary/30 bg-primary-soft px-3 text-sm font-extrabold text-primary transition hover:bg-primary-soft/70"
                        : "inline-flex min-h-10 items-center rounded-button border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-surface"
                    }
                  >
                    {alreadyAdded ? (
                      <Check
                        className="size-4"
                        aria-hidden="true"
                      />
                    ) : null}
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {charges.length > 0 ? (
            <div className="overflow-hidden rounded-card border border-border-soft">
              {charges.map((charge) => {
                const isEditing =
                  editingChargeId === charge.id;

                return (
                  <article
                    id={`property-charge-${charge.id}`}
                    key={charge.id}
                    className="border-b border-border-soft bg-white last:border-b-0"
                  >
                    {!isEditing ? (
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-black text-text-strong">
                            {charge.chargeName ||
                              "Other charge"}
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                            {getChargeSummary(charge)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${
                              charge.chargeName ||
                              "other charge"
                            }`}
                            title="Edit charge"
                            onClick={() =>
                              openChargeEditor(charge.id)
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-text-strong transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Pencil
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>

                          <button
                            type="button"
                            aria-label={`Delete ${
                              charge.chargeName ||
                              "other charge"
                            }`}
                            title="Delete charge"
                            onClick={() =>
                              removeCharge(charge.id)
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                          >
                            <Trash2
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 bg-surface/50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-black text-text-strong">
                              {charge.chargeName ||
                                "New charge"}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-text-muted">
                              Editing
                            </p>
                          </div>

                          <button
                            type="button"
                            aria-label="Delete charge"
                            title="Delete charge"
                            onClick={() =>
                              removeCharge(charge.id)
                            }
                            className="inline-flex size-10 items-center justify-center rounded-button border border-border-soft bg-white text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                          >
                            <Trash2
                              className="size-4"
                              aria-hidden="true"
                            />
                          </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            label="Charge name"
                            value={charge.chargeName}
                            onChange={(event) =>
                              updateCharge(
                                charge.id,
                                (current) => ({
                                  ...current,
                                  chargeName:
                                    event.target.value,
                                }),
                              )
                            }
                            placeholder="Example: Estate security"
                            required
                          />

                          <CurrencyInput
                            label="Amount"
                            name={`charge-amount-${charge.id}`}
                            value={charge.amount}
                            onValueChange={(value) =>
                              updateCharge(
                                charge.id,
                                (current) => ({
                                  ...current,
                                  amount: value,
                                }),
                              )
                            }
                            placeholder="0"
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
                                updateCharge(
                                  charge.id,
                                  (current) => {
                                    const chargeBearer =
                                      event.target
                                        .value as ManagerPropertyChargeBearer;

                                    return {
                                      ...current,
                                      chargeBearer,
                                      isRequiredBeforeMoveIn:
                                        chargeBearer ===
                                        "tenant"
                                          ? current.isRequiredBeforeMoveIn
                                          : false,
                                    };
                                  },
                                )
                              }
                              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            >
                              <option value="tenant">
                                Tenant
                              </option>
                              <option value="landlord">
                                Landlord
                              </option>
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
                                updateCharge(
                                  charge.id,
                                  (current) => ({
                                    ...current,
                                    billingCycle:
                                      event.target
                                        .value as ManagerPropertyChargeBillingCycle,
                                  }),
                                )
                              }
                              className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-semibold text-text-strong outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
                            >
                              {BILLING_CYCLES.map(
                                (option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>
                        </div>

                        {charge.chargeBearer ===
                        "tenant" ? (
                          <label className="flex gap-3 rounded-card border border-border-soft bg-white p-4 text-sm font-semibold leading-6 text-text-strong">
                            <input
                              type="checkbox"
                              checked={
                                charge.isRequiredBeforeMoveIn
                              }
                              onChange={(event) =>
                                updateCharge(
                                  charge.id,
                                  (current) => ({
                                    ...current,
                                    isRequiredBeforeMoveIn:
                                      event.target.checked,
                                  }),
                                )
                              }
                              className="mt-1 size-4 shrink-0 rounded border-border-soft text-primary focus:ring-primary"
                            />
                            <span>
                              Add this charge to the
                              tenant&apos;s first payment
                              before move-in.
                            </span>
                          </label>
                        ) : (
                          <p className="rounded-card bg-warning-soft p-4 text-sm font-semibold leading-6 text-text-muted">
                            Landlord-paid charges are not
                            added to the tenant&apos;s
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
                              updateCharge(
                                charge.id,
                                (current) => ({
                                  ...current,
                                  description:
                                    event.target.value,
                                }),
                              )
                            }
                            rows={2}
                            placeholder="Optional explanation"
                            className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-semibold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary-soft"
                          />
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
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
              Saved payment requests keep their original
              charge snapshot. These changes apply only to
              payment requests created afterward.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border-soft p-4">
          <Button
            type="button"
            variant="secondary"
            onClick={cancelChanges}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            isLoading={isPending}
            className="min-w-40"
          >
            Save property charges
          </Button>
        </div>
      </form>
    </>
  );
}
