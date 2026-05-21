"use client";

import { useActionState } from "react";
import { archiveLandlordTenancyChargeAction } from "@/actions/landlord-tenancy-charges.actions";
import { confirmTenancyChargesAction } from "@/actions/tenancies.actions";
import { initialLandlordTenancyChargeActionState } from "@/actions/landlord-tenancy-charges.state";
import { initialTenancyActionState } from "@/actions/tenancy.state";
import type { LandlordTenancyChargeRow } from "@/server/repositories/landlord-tenancy-charges.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrustNotice } from "@/components/ui/trust-notice";
import { ReceiptText } from "lucide-react";

type LandlordTenancyChargeListProps = {
  tenancyId: string;
  charges: LandlordTenancyChargeRow[];
  showConfirmAction?: boolean;
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

function ConfirmChargesForm({ tenancyId }: { tenancyId: string }) {
  const [state, formAction, isPending] = useActionState(
    confirmTenancyChargesAction,
    initialTenancyActionState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Charges confirmed"
        errorTitle="Charge confirmation failed"
      />

      <input type="hidden" name="tenancyId" value={tenancyId} />

      <TrustNotice
        title="Confirm landlord charges"
        description="Review the charge list and running total. Once confirmed, BOPA will open the agreement draft preview."
      />

      {state.message && !state.ok ? (
        <div
          role="alert"
          className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold leading-6 text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Button type="submit" isLoading={isPending} fullWidth>
        Confirm Charges and Continue
      </Button>
    </form>
  );
}

export function LandlordTenancyChargeList({
  tenancyId,
  charges,
  showConfirmAction = false,
  chargesConfirmed = false,
}: LandlordTenancyChargeListProps) {
  const total = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);

  if (charges.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No landlord charges added"
          description="Add move-in charges such as agreement fees, caution deposits, or service charges."
          icon={<ReceiptText aria-hidden="true" size={24} strokeWidth={2.6} />}
        />

        {showConfirmAction && !chargesConfirmed ? (
          <TrustNotice
            title="Charges are optional"
            description="You can confirm with no charges if the tenant only pays rent, or add charges first and then confirm."
          />
        ) : null}

        {showConfirmAction && !chargesConfirmed ? (
          <ConfirmChargesForm tenancyId={tenancyId} />
        ) : null}
      </div>
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
                    {charge.charge_name}
                  </h3>

                  <Badge tone={charge.is_refundable ? "warning" : "primary"}>
                    {charge.is_refundable ? "Refundable" : "Non-refundable"}
                  </Badge>

                  {charge.is_required_before_move_in ? (
                    <Badge tone="success">Before move-in</Badge>
                  ) : null}
                </div>

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

                {!chargesConfirmed ? (
                  <div className="mt-3">
                    <ArchiveChargeForm
                      tenancyId={tenancyId}
                      chargeId={charge.id}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {showConfirmAction && !chargesConfirmed ? (
        <ConfirmChargesForm tenancyId={tenancyId} />
      ) : null}

      {chargesConfirmed ? (
        <TrustNotice
          title="Charges confirmed"
          description="These landlord charges will be included in the agreement draft and the tenant’s final payment."
        />
      ) : null}
    </div>
  );
}
