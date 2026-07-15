"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  resendPhoneRecoveryCodeAction,
  verifyPhoneRecoveryOtpAction,
} from "@/actions/password-recovery.actions";
import { initialPasswordRecoveryActionState } from "@/actions/password-recovery.state";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToastProvider } from "@/components/ui/toast-provider";

const RESEND_COOLDOWN_SECONDS = 60;

type VerifyRecoveryOtpFormProps = {
  maskedPhoneNumber: string;
};

export function VerifyRecoveryOtpForm({
  maskedPhoneNumber,
}: VerifyRecoveryOtpFormProps) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [verifyState, verifyAction, isVerifying] = useActionState(
    verifyPhoneRecoveryOtpAction,
    initialPasswordRecoveryActionState,
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendPhoneRecoveryCodeAction,
    initialPasswordRecoveryActionState,
  );

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldown((currentCooldown) => Math.max(0, currentCooldown - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldown]);

  useEffect(() => {
    if (resendState.ok && resendState.message) {
      const timeoutId = window.setTimeout(() => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [resendState.message, resendState.ok]);

  useEffect(() => {
    const redirectTo = verifyState.redirectTo ?? resendState.redirectTo;

    if (!redirectTo || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;

    const timeoutId = window.setTimeout(
      () => router.push(redirectTo),
      verifyState.ok ? 800 : 1400,
    );

    return () => window.clearTimeout(timeoutId);
  }, [
    resendState.redirectTo,
    router,
    verifyState.ok,
    verifyState.redirectTo,
  ]);

  const statusMessage = verifyState.message || resendState.message;
  const statusOk = verifyState.message ? verifyState.ok : resendState.ok;

  return (
    <ToastProvider>
      <ActionResultToast
        ok={verifyState.ok}
        message={verifyState.message}
        successTitle="Code verified"
        errorTitle="Verification failed"
      />
      <ActionResultToast
        ok={resendState.ok}
        message={resendState.message}
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

          <div className="rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Code sent to</p>
            <p className="mt-2 font-extrabold text-text-strong">
              {maskedPhoneNumber}
            </p>
          </div>

          <form id="verify-recovery-otp-form" action={verifyAction}>
            <OtpCodeInput
              name="otpCode"
              label="Verification code"
              error={verifyState.fieldErrors?.otpCode?.[0]}
              helperText="Enter the 6-digit code sent to your phone."
            />
          </form>
        </CardContent>

        <CardFooter className="items-stretch sm:items-center">
          <Button
            form="verify-recovery-otp-form"
            type="submit"
            isLoading={isVerifying}
            fullWidth
          >
            {isVerifying ? "Verifying..." : "Verify code"}
          </Button>

          <form action={resendAction}>
            <Button
              type="submit"
              variant="secondary"
              disabled={cooldown > 0 || isResending}
              isLoading={isResending}
              fullWidth
            >
              {cooldown > 0
                ? `Send again in ${cooldown}s`
                : isResending
                  ? "Sending..."
                  : "Send again"}
            </Button>
          </form>

          <Link
            href="/forgot-password"
            className="text-center text-sm font-bold text-primary hover:text-primary-hover"
          >
            Change phone number
          </Link>
        </CardFooter>
      </Card>
    </ToastProvider>
  );
}
