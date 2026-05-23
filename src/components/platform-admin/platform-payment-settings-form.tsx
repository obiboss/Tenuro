"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  updatePlatformPaymentSettingsAction,
  type PlatformAdminPaymentSettingsActionState,
} from "@/actions/platform-admin-payment-settings.actions";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";
import type { PlatformPaymentSettings } from "@/server/types/platform-payment-settings.types";

type PlatformPaymentSettingsFormProps = {
  settings: PlatformPaymentSettings;
};

const initialState: PlatformAdminPaymentSettingsActionState = {
  ok: false,
  message: "",
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PlatformPaymentSettingsForm({
  settings,
}: PlatformPaymentSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    updatePlatformPaymentSettingsAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (!state.ok || !state.message) {
      return;
    }

    router.refresh();
  }, [state.ok, state.message, router]);

  return (
    <form action={formAction} className="space-y-6">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Settings saved"
        errorTitle="Could not save settings"
      />

      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={settings.updatedAt}
      />

      <Card>
        <CardHeader>
          <CardTitle>Agent verification fee</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <TrustNotice
            title="Server-authoritative pricing"
            description="These amounts are loaded by payment services at runtime. Tenants and agents never receive editable fee values from the browser."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Total verification fee (NGN)"
              name="agentProcessingFeeAmount"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.agentProcessingFeeAmount)}
              error={state.fieldErrors?.agentProcessingFeeAmount?.[0]}
              required
            />

            <Input
              label="Agent operational share (NGN)"
              name="agentProcessingFeeAgentShare"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.agentProcessingFeeAgentShare)}
              error={state.fieldErrors?.agentProcessingFeeAgentShare?.[0]}
              required
            />

            <Input
              label="Platform infrastructure share (NGN)"
              name="agentProcessingFeePlatformShare"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.agentProcessingFeePlatformShare)}
              error={state.fieldErrors?.agentProcessingFeePlatformShare?.[0]}
              required
            />
          </div>

          <label className="flex items-start gap-3 rounded-button bg-background p-4">
            <input
              type="checkbox"
              name="isAgentProcessingFeeEnabled"
              defaultChecked={settings.isAgentProcessingFeeEnabled}
              className="mt-1 size-4 rounded border-border-soft text-primary focus:ring-primary-soft"
            />

            <span>
              <span className="block text-sm font-extrabold text-text-strong">
                Enable agent verification fee
              </span>
              <span className="mt-1 block text-sm leading-6 text-text-muted">
                When disabled, new agent-sourced verification payments cannot be
                initialized.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landlord-sourced verification fee</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Total verification fee (NGN)"
              name="landlordProcessingFeeAmount"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.landlordProcessingFeeAmount)}
              error={state.fieldErrors?.landlordProcessingFeeAmount?.[0]}
              required
            />

            <Input
              label="Landlord operational share (NGN)"
              name="landlordProcessingFeeLandlordShare"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.landlordProcessingFeeLandlordShare)}
              error={state.fieldErrors?.landlordProcessingFeeLandlordShare?.[0]}
              required
            />

            <Input
              label="Platform infrastructure share (NGN)"
              name="landlordProcessingFeePlatformShare"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.landlordProcessingFeePlatformShare)}
              error={
                state.fieldErrors?.landlordProcessingFeePlatformShare?.[0]
              }
              required
            />
          </div>

          <label className="flex items-start gap-3 rounded-button bg-background p-4">
            <input
              type="checkbox"
              name="isLandlordProcessingFeeEnabled"
              defaultChecked={settings.isLandlordProcessingFeeEnabled}
              className="mt-1 size-4 rounded border-border-soft text-primary focus:ring-primary-soft"
            />

            <span>
              <span className="block text-sm font-extrabold text-text-strong">
                Enable landlord-sourced verification fee
              </span>
              <span className="mt-1 block text-sm leading-6 text-text-muted">
                When disabled, new landlord-link verification payments cannot be
                initialized.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landlord subscription pricing</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="BOPA Basic annual price (NGN)"
              name="bopaBasicAnnualPriceNaira"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.bopaBasicAnnualPriceNaira)}
              error={state.fieldErrors?.bopaBasicAnnualPriceNaira?.[0]}
              required
            />

            <Input
              label="BOPA Pro annual price (NGN)"
              name="bopaProAnnualPriceNaira"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.bopaProAnnualPriceNaira)}
              error={state.fieldErrors?.bopaProAnnualPriceNaira?.[0]}
              required
            />

            <Input
              label="Landlord trial days"
              name="landlordTrialDays"
              type="number"
              min={0}
              step={1}
              defaultValue={String(settings.landlordTrialDays)}
              error={state.fieldErrors?.landlordTrialDays?.[0]}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-4">
          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Current totals</p>
            <p className="mt-2 font-extrabold text-text-strong">
              Agent fee: {formatMoney(settings.agentProcessingFeeAmount)} ·
              Landlord fee: {formatMoney(settings.landlordProcessingFeeAmount)}
            </p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Last updated{" "}
              {new Intl.DateTimeFormat("en-NG", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(settings.updatedAt))}
            </p>
          </div>

          <Button type="submit" isLoading={isPending} fullWidth>
            Save payment settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
