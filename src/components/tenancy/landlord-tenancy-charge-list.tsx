"use client";

import { useActionState } from "react";
import {
  archiveLandlordTenancyChargeAction,
  initialLandlordTenancyChargeActionState,
} from "@/actions/landlord-tenancy-charges.actions";
import type { LandlordTenancyChargeRow } from "@/server/repositories/landlord-tenancy-charges.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReceiptText } from "lucide-react";

type LandlordTenancyChargeListProps = {
  tenancyId: string;
  charges: LandlordTenancyChargeRow[];
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatChargeType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    <form action={formAction} className="space-y-2">
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
        fullWidth
      >
        Remove
      </Button>
    </form>
  );
}

export function LandlordTenancyChargeList({
  tenancyId,
  charges,
}: LandlordTenancyChargeListProps) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);

  if (charges.length === 0) {
    return (
      <EmptyState
        title="No landlord charges added"
        description="Add agreement fee, caution deposit, damages deposit, service charge, legal fee, documentation fee, or other move-in charges."
        icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card bg-background p-4">
        <p className="text-sm font-bold text-text-muted">
          Total landlord charges
        </p>
        <p className="mt-2 text-2xl font-black text-text-strong">
          {formatMoney(total, charges[0]?.currency_code ?? "NGN")}
        </p>
      </div>

      <div className="space-y-3">
        {charges.map((charge) => (
          <article
            key={charge.id}
            className="rounded-card border border-border-soft bg-background p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-text-strong">
                    {charge.label}
                  </h3>

                  <Badge tone={charge.is_refundable ? "warning" : "primary"}>
                    {charge.is_refundable ? "Refundable" : "Non-refundable"}
                  </Badge>

                  {charge.is_required_before_move_in ? (
                    <Badge tone="success">Before move-in</Badge>
                  ) : null}
                </div>

                <p className="mt-1 text-sm font-semibold text-text-muted">
                  {formatChargeType(charge.charge_type)}
                </p>

                {charge.description ? (
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {charge.description}
                  </p>
                ) : null}
              </div>

              <div className="min-w-36 text-left md:text-right">
                <p className="text-lg font-black text-text-strong">
                  {formatMoney(Number(charge.amount), charge.currency_code)}
                </p>

                <div className="mt-3">
                  <ArchiveChargeForm
                    tenancyId={tenancyId}
                    chargeId={charge.id}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
