"use client";

import { useActionState, useEffect, useState } from "react";
import { requestOTPAction, verifyOTPAction } from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TrustNotice } from "@/components/ui/trust-notice";

type PhoneLoginFormProps = {
  purpose?: "login" | "register";
};

const RESEND_SECONDS = 60;

export function PhoneLoginForm({ purpose = "login" }: PhoneLoginFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [requestState, requestAction, isRequestPending] = useActionState(
    requestOTPAction,
    initialAuthActionState,
  );

  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    verifyOTPAction,
    initialAuthActionState,
  );

  useEffect(() => {
    if (requestState.ok && requestState.phoneNumber) {
      setVerifiedPhone(requestState.phoneNumber);
      setCountdown(RESEND_SECONDS);
    }
  }, [requestState.ok, requestState.phoneNumber, requestState.message]);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const otpRequested = Boolean(verifiedPhone);

  if (!otpRequested) {
    return (
      <div className="space-y-5">
        <TrustNotice
          title="Sign in with your phone"
          description="We will send a verification code to your phone number."
        />

        <form action={requestAction}>
          <Card>
            <CardContent>
              {requestState.message ? (
                <div
                  role="alert"
                  className={
                    requestState.ok
                      ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                      : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
                  }
                >
                  {requestState.message}
                </div>
              ) : null}

              <input type="hidden" name="purpose" value={purpose} />

              <PhoneNumberInput
                label="Phone number"
                name="phoneNumber"
                value={phoneNumber}
                onChange={setPhoneNumber}
                error={requestState.fieldErrors?.phoneNumber?.[0]}
                helperText="Enter your number without the first 0. Example: 8149761904."
                required
              />
            </CardContent>

            <CardFooter className="items-stretch">
              <Button type="submit" isLoading={isRequestPending} fullWidth>
                Send Code
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TrustNotice
        title="Enter the code"
        description={`We sent a 6-digit code to ${
          requestState.maskedPhoneNumber ?? verifiedPhone
        }.`}
      />

      <Card>
        <form action={verifyAction}>
          <CardContent>
            {verifyState.message ? (
              <div
                role="alert"
                className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              >
                {verifyState.message}
              </div>
            ) : null}

            <input type="hidden" name="purpose" value={purpose} />
            <input type="hidden" name="phoneNumber" value={verifiedPhone} />

            <OtpCodeInput
              label="6-digit code"
              name="otpCode"
              error={verifyState.fieldErrors?.otpCode?.[0]}
              helperText="Enter the code sent to your phone."
            />
          </CardContent>

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isVerifyPending} fullWidth>
              Confirm Code
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setVerifiedPhone("");
                setPhoneNumber("");
                setCountdown(0);
              }}
            >
              Use another phone number
            </Button>
          </CardFooter>
        </form>

        <form action={requestAction} className="px-6 pb-6">
          <input type="hidden" name="purpose" value={purpose} />
          <input type="hidden" name="phoneNumber" value={verifiedPhone} />

          <Button
            type="submit"
            variant="secondary"
            fullWidth
            disabled={countdown > 0 || isRequestPending}
            isLoading={isRequestPending}
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
