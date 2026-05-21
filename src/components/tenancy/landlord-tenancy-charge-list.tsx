"use client";

import { ReceiptText, Trash2 } from "lucide-react";
import { archiveLandlordTenancyChargeAction } from "@/actions/landlord-tenancy-charges.actions";
import { initialLandlordTenancyChargeActionState } from "@/actions/landlord-tenancy-charges.state";
import type { LandlordTenancyChargeRow } from "@/server/repositories/landlord-tenancy-charges.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrustNotice } from "@/components/ui/trust-notice";
import { getLandlordChargePresetIcon } from "@/lib/landlord-charge-presets";
import { useActionState } from "react";

type LandlordTenancyChargeListProps = {
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

function ArchiveChargeForm({
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

export function LandlordTenancyChargeList({
  tenancyId,
  charges,
  chargesConfirmed = false,
}: LandlordTenancyChargeListProps) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);

  if (charges.length === 0) {
    return (
      <EmptyState
        title="No charges added"
        description="No landlord charges were added for this tenancy."
        icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      {chargesConfirmed ? (
        <TrustNotice
          title="Charges confirmed"
          description="These landlord charges are included in the agreement and final payment."
        />
      ) : null}

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
                    <ArchiveChargeForm
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
