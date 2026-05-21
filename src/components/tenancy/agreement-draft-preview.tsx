"use client";

import { useActionState } from "react";
import { generateTenancyAgreementAction } from "@/actions/tenancy-agreements.actions";
import { initialTenancyAgreementActionState } from "@/actions/tenancy-agreement.state";
import type { LandlordTenancyChargeRow } from "@/server/repositories/landlord-tenancy-charges.repository";
import type { TenancyDetailRow } from "@/server/repositories/tenancies.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { formatReminderPreview } from "@/lib/reminder-interval";
import { formatDisplayDate } from "@/lib/tenancy-period";

type AgreementDraftPreviewProps = {
  tenancy: TenancyDetailRow;
  charges: LandlordTenancyChargeRow[];
};

function formatMoney(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-button bg-background p-4">
      <p className="text-sm font-bold text-text-muted">{label}</p>
      <p className="mt-2 font-extrabold text-text-strong">{value}</p>
    </div>
  );
}

export function AgreementDraftPreview({
  tenancy,
  charges,
}: AgreementDraftPreviewProps) {
  const [state, formAction, isGenerating] = useActionState(
    generateTenancyAgreementAction,
    initialTenancyAgreementActionState,
  );

  const tenantName = tenancy.tenants?.full_name ?? "Tenant";
  const propertyName =
    tenancy.units?.properties?.property_name ?? "Property not set";
  const unitName = tenancy.units?.unit_identifier ?? "Unit not set";
  const chargesTotal = charges.reduce(
    (total, charge) => total + Number(charge.amount),
    0,
  );

  const reminderPreview =
    tenancy.end_date && tenancy.reminder_interval_days
      ? formatReminderPreview(
          tenancy.end_date,
          tenancy.reminder_interval_days as 30 | 60 | 90,
        )
      : "Renewal reminder will be calculated from the tenancy end date.";

  return (
    <Card id="agreement-draft">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Agreement generated"
        errorTitle="Agreement generation failed"
      />

      <CardHeader>
        <CardTitle>Agreement Draft Preview</CardTitle>
        <p className="mt-1 text-sm leading-6 text-text-muted">
          Review the tenancy details below, then generate the agreement draft.
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          <TrustNotice
            title="Ready to generate"
            description="These details will be used to pre-fill the tenancy agreement document."
          />

          {state.message && !state.ok ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {state.message}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <SummaryItem label="Tenant" value={tenantName} />
            <SummaryItem label="Unit" value={`${propertyName} — ${unitName}`} />
            <SummaryItem
              label="Rent amount"
              value={formatMoney(
                Number(tenancy.rent_amount),
                tenancy.currency_code,
              )}
            />
            <SummaryItem
              label="Rent start date"
              value={
                tenancy.start_date
                  ? formatDisplayDate(tenancy.start_date)
                  : "Not set"
              }
            />
            <SummaryItem
              label="Rent end date"
              value={
                tenancy.end_date
                  ? formatDisplayDate(tenancy.end_date)
                  : "Not set"
              }
            />
            <SummaryItem label="Renewal reminder" value={reminderPreview} />
          </div>

          <div className="rounded-card border border-border-soft bg-background p-4">
            <p className="text-sm font-extrabold text-text-strong">
              Landlord charges
            </p>

            {charges.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-text-muted">
                No landlord charges were added.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {charges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-semibold text-text-strong">
                      {charge.charge_name}
                    </span>
                    <span className="font-extrabold text-text-strong">
                      {formatMoney(
                        Number(charge.amount),
                        charge.currency_code,
                      )}
                    </span>
                  </div>
                ))}

                <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3 text-sm">
                  <span className="font-bold text-text-muted">Total</span>
                  <span className="font-black text-text-strong">
                    {formatMoney(chargesTotal, tenancy.currency_code)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <form action={formAction} className="w-full">
          <input type="hidden" name="tenancyId" value={tenancy.id} />

          <Button type="submit" isLoading={isGenerating} fullWidth>
            Generate Agreement
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
