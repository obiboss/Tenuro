"use client";

import { useActionState } from "react";
import { activateTenantAccountAction } from "@/actions/tenant-activation.actions";
import { initialTenantActivationActionState } from "@/actions/tenant-activation.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TenantActivationFormProps = {
  token: string;
  tenantName: string;
  phoneNumber: string;
};

export function TenantActivationForm({
  token,
  tenantName,
  phoneNumber,
}: TenantActivationFormProps) {
  const [state, formAction, isPending] = useActionState(
    activateTenantAccountAction,
    initialTenantActivationActionState,
  );

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Account activated"
        errorTitle="Activation failed"
      />

      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className={
                state.ok
                  ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                  : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              }
            >
              {state.message}
            </div>
          ) : null}

          <input type="hidden" name="token" value={token} />

          <div className="mb-4 rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Tenant</p>
            <p className="mt-2 font-extrabold text-text-strong">{tenantName}</p>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              {phoneNumber}
            </p>
          </div>

          <Input
            label="Create password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            error={state.fieldErrors?.password?.[0]}
            required
          />

          <Input
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            error={state.fieldErrors?.confirmPassword?.[0]}
            required
          />
        </CardContent>

        <CardFooter className="items-stretch">
          <Button type="submit" isLoading={isPending} fullWidth>
            Activate Tenant Account
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
