"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { requestPhonePasswordRecoveryAction } from "@/actions/password-recovery.actions";
import { initialPasswordRecoveryActionState } from "@/actions/password-recovery.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToastProvider } from "@/components/ui/toast-provider";

type PhoneForgotPasswordFormProps = {
  initialErrorMessage?: string;
};

export function PhoneForgotPasswordForm({
  initialErrorMessage,
}: PhoneForgotPasswordFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const redirectedRef = useRef(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, formAction, isPending] = useActionState(
    requestPhonePasswordRecoveryAction,
    initialPasswordRecoveryActionState,
  );

  useEffect(() => {
    if (state.fieldErrors?.phoneNumber?.[0]) {
      formRef.current?.querySelector<HTMLInputElement>('input[type="tel"]')?.focus();
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (!state.ok || !state.redirectTo || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;
    formRef.current?.reset();
    setPhoneNumber("");

    const timeoutId = window.setTimeout(() => {
      router.push(state.redirectTo ?? "/forgot-password/verify");
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [router, state.ok, state.redirectTo]);

  const statusMessage = state.message || initialErrorMessage || "";
  const statusOk = state.message ? state.ok : false;

  return (
    <ToastProvider>
      <form ref={formRef} action={formAction}>
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Code sent"
          errorTitle="Code not sent"
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

            <PhoneNumberInput
              label="Phone number"
              name="phoneNumber"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={state.fieldErrors?.phoneNumber?.[0]}
              helperText="Enter your number without the first 0. Example: 8149761904."
              disabled={isPending}
              required
            />
          </CardContent>

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isPending} fullWidth>
              {isPending ? "Sending..." : "Send verification code"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </ToastProvider>
  );
}
