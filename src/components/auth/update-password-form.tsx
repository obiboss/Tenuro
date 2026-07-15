"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  updateManagerRecoveredPasswordAction,
  updatePhoneRecoveredPasswordAction,
} from "@/actions/password-recovery.actions";
import { initialPasswordRecoveryActionState } from "@/actions/password-recovery.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToastProvider } from "@/components/ui/toast-provider";

type UpdatePasswordFormProps = {
  flow: "manager" | "phone";
};

export function UpdatePasswordForm({ flow }: UpdatePasswordFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const redirectedRef = useRef(false);
  const action =
    flow === "manager"
      ? updateManagerRecoveredPasswordAction
      : updatePhoneRecoveredPasswordAction;

  const [state, formAction, isPending] = useActionState(
    action,
    initialPasswordRecoveryActionState,
  );

  useEffect(() => {
    const firstInvalidField = state.fieldErrors?.password?.[0]
      ? "password"
      : state.fieldErrors?.confirmPassword?.[0]
        ? "confirmPassword"
        : null;

    if (firstInvalidField) {
      formRef.current
        ?.querySelector<HTMLInputElement>(`[name="${firstInvalidField}"]`)
        ?.focus();
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (!state.redirectTo || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;

    if (state.ok) {
      formRef.current?.reset();
    }

    const timeoutId = window.setTimeout(
      () => router.replace(state.redirectTo ?? "/login"),
      state.ok ? 900 : 1400,
    );

    return () => window.clearTimeout(timeoutId);
  }, [router, state.ok, state.redirectTo]);

  return (
    <ToastProvider>
      <form ref={formRef} action={formAction}>
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Password changed"
          errorTitle="Password not changed"
        />

        <Card>
          <CardContent>
            {state.message ? (
              <div
                role="status"
                aria-live="polite"
                className={
                  state.ok
                    ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                    : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
                }
              >
                {state.message}
              </div>
            ) : null}

            <Input
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              helperText="Use at least 8 characters."
              error={state.fieldErrors?.password?.[0]}
              required
            />

            <Input
              label="Confirm new password"
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
              {isPending ? "Changing password..." : "Change password"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </ToastProvider>
  );
}
