"use client";

import { useActionState, useEffect, useRef } from "react";
import { requestManagerPasswordResetAction } from "@/actions/password-recovery.actions";
import { initialPasswordRecoveryActionState } from "@/actions/password-recovery.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastProvider } from "@/components/ui/toast-provider";

type ManagerForgotPasswordFormProps = {
  initialErrorMessage?: string;
};

export function ManagerForgotPasswordForm({
  initialErrorMessage,
}: ManagerForgotPasswordFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    requestManagerPasswordResetAction,
    initialPasswordRecoveryActionState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }

    if (state.fieldErrors?.email?.[0]) {
      formRef.current?.querySelector<HTMLInputElement>('[name="email"]')?.focus();
    }
  }, [state]);

  const statusMessage = state.message || initialErrorMessage || "";
  const statusOk = state.message ? state.ok : false;

  return (
    <ToastProvider>
      <form ref={formRef} action={formAction}>
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Reset link sent"
          errorTitle="Reset link not sent"
        />

        <Card>
          <CardContent>
            {statusMessage ? (
              <div
                role="status"
                aria-live="polite"
                className={
                  statusOk
                    ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                    : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
                }
              >
                {statusMessage}
              </div>
            ) : null}

            <Input
              label="Work email address"
              name="email"
              type="email"
              placeholder="you@firm.com"
              autoComplete="email"
              error={state.fieldErrors?.email?.[0]}
              required
            />
          </CardContent>

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isPending} fullWidth>
              {isPending ? "Sending..." : "Send reset link"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </ToastProvider>
  );
}
