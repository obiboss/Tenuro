"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, ReceiptText, Trash2 } from "lucide-react";
import { createLandlordTenancyChargeAction } from "@/actions/landlord-tenancy-charges.actions";
import { archiveLandlordTenancyChargeAction } from "@/actions/landlord-tenancy-charges.actions";
import { confirmTenancyChargesAction } from "@/actions/tenancies.actions";
import { initialLandlordTenancyChargeActionState } from "@/actions/landlord-tenancy-charges.state";
import { initialTenancyActionState } from "@/actions/tenancy.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import { cn } from "@/lib/cn";
import {
  getLandlordChargePresetById,
  getLandlordChargePresetIcon,
  LANDLORD_CHARGE_PRESETS,
} from "@/lib/landlord-charge-presets";
import type { LandlordTenancyChargeRow } from "@/server/repositories/landlord-tenancy-charges.repository";

type LandlordTenancyChargePanelProps = {
  tenancyId: string;
  charges: LandlordTenancyChargeRow[];
  chargesConfirmed?: boolean;
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function RemoveChargeButton({
  tenancyId,
  chargeId,
}: {
  tenancyId: string;
  chargeId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    archiveLandlordTenancyChargeAction,
    initialLandlordTenancyChargeActionState,
  );

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Charge removed"
        errorTitle="Charge could not be removed"
      />

      <input type="hidden" name="tenancyId" value={tenancyId} />
      <input type="hidden" name="chargeId" value={chargeId} />

      <Button
        type="submit"
        variant="ghost"
        size="sm"
        isLoading={isPending}
        aria-label="Remove charge"
      >
        <Trash2 aria-hidden="true" size={16} strokeWidth={2.6} />
        Remove
      </Button>
    </form>
  );
}

function ChargePresetSelector({
  selectedPresetId,
  onSelect,
  disabled,
}: {
  selectedPresetId: string | null;
  onSelect: (presetId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {LANDLORD_CHARGE_PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isSelected = selectedPresetId === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "relative rounded-card border border-border-soft bg-surface p-4 text-left shadow-card transition",
              "hover:border-primary/40 hover:bg-primary-soft/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isSelected && "border-primary bg-primary-soft",
            )}
          >
            {isSelected ? (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-white"
              >
                <Check size={12} strokeWidth={3} />
              </span>
            ) : null}

            <Icon
              aria-hidden="true"
              size={22}
              strokeWidth={2.6}
              className="text-primary"
            />

            <p className="mt-3 font-bold text-text-strong">{preset.name}</p>
            <p className="mt-1 text-sm leading-5 text-text-muted">
              {preset.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function QuickAddChargeForm({
  tenancyId,
  selectedPresetId,
  onAdded,
}: {
  tenancyId: string;
  selectedPresetId: string;
  onAdded: () => void;
}) {
  const preset = getLandlordChargePresetById(selectedPresetId);

  const [state, formAction, isPending] = useActionState(
    createLandlordTenancyChargeAction,
    initialLandlordTenancyChargeActionState,
  );

  useEffect(() => {
    if (state.ok) {
      onAdded();
    }
  }, [state.ok, onAdded]);

  if (!preset) {
    return null;
  }

  const formKey = state.ok ? `${selectedPresetId}-success` : selectedPresetId;

  return (
    <div className="rounded-card border border-border-soft bg-surface p-4 shadow-card">
      <form key={formKey} action={formAction} className="space-y-4">
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Charge added"
          errorTitle="Charge could not be added"
        />

        <input type="hidden" name="tenancyId" value={tenancyId} />
        <input type="hidden" name="currencyCode" value="NGN" />

        <div>
          <p className="text-sm font-bold text-text-strong">Quick add</p>
          <p className="mt-1 text-sm text-text-muted">
            Enter the amount for {preset.name.toLowerCase()}. Other fields are
            pre-filled and can be edited.
          </p>
        </div>

        {state.message && !state.ok ? (
          <div
            role="alert"
            className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
          >
            {state.message}
          </div>
        ) : null}

        <Input
          label="Charge name"
          name="chargeName"
          defaultValue={preset.name}
          error={state.fieldErrors?.chargeName?.[0]}
          required
        />

        <CurrencyInput
          label="Amount"
          name="amount"
          placeholder="0.00"
          error={state.fieldErrors?.amount?.[0]}
          required
        />

        <Textarea
          label="Description"
          name="description"
          defaultValue={preset.defaultDescription}
          placeholder="Optional explanation for this charge"
          error={state.fieldErrors?.description?.[0]}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-button border border-border-soft bg-background p-3">
            <input
              type="checkbox"
              name="isRefundable"
              defaultChecked={preset.isRefundable}
              className="mt-1 size-4 rounded border-border-soft"
            />
            <span>
              <span className="block text-sm font-extrabold text-text-strong">
                Refundable
              </span>
              <span className="mt-1 block text-sm leading-5 text-text-muted">
                May be returned at end of tenancy.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-button border border-border-soft bg-background p-3">
            <input
              type="checkbox"
              name="isRequiredBeforeMoveIn"
              defaultChecked={preset.isRequiredBeforeMoveIn}
              className="mt-1 size-4 rounded border-border-soft"
            />
            <span>
              <span className="block text-sm font-extrabold text-text-strong">
                Required before move-in
              </span>
              <span className="mt-1 block text-sm leading-5 text-text-muted">
                Include in the tenant&apos;s onboarding payment.
              </span>
            </span>
          </label>
        </div>

        <Button type="submit" isLoading={isPending} fullWidth>
          Add to Charges
        </Button>
      </form>
    </div>
  );
}

function ConfirmChargesSection({
  tenancyId,
  hasCharges,
}: {
  tenancyId: string;
  hasCharges: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmTenancyChargesAction,
    initialTenancyActionState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Charges confirmed"
        errorTitle="Charge confirmation failed"
      />

      <input type="hidden" name="tenancyId" value={tenancyId} />

      {!hasCharges ? (
        <p className="text-sm leading-6 text-text-muted">
          You can continue without adding move-in charges if the tenant only
          pays rent.
        </p>
      ) : null}

      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Button
        type="submit"
        variant={hasCharges ? "primary" : "secondary"}
        isLoading={isPending}
        fullWidth
      >
        {hasCharges
          ? "Confirm Charges and Continue"
          : "Continue Without Charges"}
      </Button>
    </form>
  );
}

function AddedChargesList({
  tenancyId,
  charges,
  chargesConfirmed,
}: {
  tenancyId: string;
  charges: LandlordTenancyChargeRow[];
  chargesConfirmed: boolean;
}) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);

  if (charges.length === 0) {
    return (
      <EmptyState
        title="No charges added"
        description="Select a charge type above to add agreement fees, deposits, or other move-in charges."
        icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {charges.map((charge) => {
          const Icon = getLandlordChargePresetIcon(charge.charge_name);

          return (
            <article
              key={charge.id}
              className="rounded-card border border-border-soft bg-surface p-4 shadow-card"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon aria-hidden="true" size={20} strokeWidth={2.6} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-strong">
                        {charge.charge_name}
                      </h3>

                      <Badge
                        tone={charge.is_refundable ? "warning" : "primary"}
                      >
                        {charge.is_refundable ? "Refundable" : "Non-refundable"}
                      </Badge>

                      {charge.is_required_before_move_in ? (
                        <Badge tone="success">Before move-in</Badge>
                      ) : null}
                    </div>

                    {charge.description ? (
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        {charge.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-lg font-black text-text-strong">
                    {formatMoney(Number(charge.amount), charge.currency_code)}
                  </p>

                  {!chargesConfirmed ? (
                    <RemoveChargeButton
                      tenancyId={tenancyId}
                      chargeId={charge.id}
                    />
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-card bg-background p-4">
        <p className="text-sm font-bold text-text-muted">Running total</p>
        <p className="mt-2 text-2xl font-black text-text-strong">
          {formatMoney(total, charges[0]?.currency_code ?? "NGN")}
        </p>
      </div>
    </div>
  );
}

export function LandlordTenancyChargePanel({
  tenancyId,
  charges,
  chargesConfirmed = false,
}: LandlordTenancyChargePanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  function handleChargeAdded() {
    setSelectedPresetId(null);
  }

  if (chargesConfirmed) {
    return (
      <div className="space-y-4">
        <TrustNotice
          title="Charges confirmed"
          description="These landlord charges will be included in the agreement draft and the tenant’s final payment."
        />

        <AddedChargesList
          tenancyId={tenancyId}
          charges={charges}
          chargesConfirmed
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TrustNotice
        title="Landlord charges are paid to you"
        description="Pick a charge type, enter the amount, and add it to the list. Review everything before continuing."
      />

      <div className="space-y-4">
        <p className="text-sm font-bold text-text-strong">Charge type</p>
        <ChargePresetSelector
          selectedPresetId={selectedPresetId}
          onSelect={setSelectedPresetId}
        />
      </div>

      {selectedPresetId ? (
        <QuickAddChargeForm
          tenancyId={tenancyId}
          selectedPresetId={selectedPresetId}
          onAdded={handleChargeAdded}
        />
      ) : null}

      <div className="space-y-4">
        <p className="text-sm font-bold text-text-strong">Added charges</p>
        <AddedChargesList
          tenancyId={tenancyId}
          charges={charges}
          chargesConfirmed={false}
        />
      </div>

      <ConfirmChargesSection
        tenancyId={tenancyId}
        hasCharges={charges.length > 0}
      />
    </div>
  );
}
