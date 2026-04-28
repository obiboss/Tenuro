"use client";

import { useActionState, useEffect, useState } from "react";
import {
  registerLandlordAction,
  requestOTPAction,
} from "@/actions/auth.actions";
import { initialAuthActionState } from "@/actions/auth.state";
import { OtpCodeInput } from "@/components/auth/otp-code-input";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";

const RESEND_SECONDS = 60;

export function LandlordProfileSetup() {
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [requestState, requestAction, isRequestPending] = useActionState(
    requestOTPAction,
    initialAuthActionState,
  );

  const [registerState, registerAction, isRegisterPending] = useActionState(
    registerLandlordAction,
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
          title="Create account with your phone"
          description="Your phone number will be your main way to access Tenuro."
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

              <input type="hidden" name="purpose" value="register" />

              <PhoneNumberInput
                label="Phone number"
                name="phoneNumber"
                value={phoneInput}
                onChange={setPhoneInput}
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
        title="Confirm your phone"
        description={`Enter the 6-digit code sent to ${
          requestState.maskedPhoneNumber ?? verifiedPhone
        }.`}
      />

      <Card>
        <form action={registerAction}>
          <CardContent>
            {registerState.message ? (
              <div
                role="alert"
                className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              >
                {registerState.message}
              </div>
            ) : null}

            <input type="hidden" name="phoneNumber" value={verifiedPhone} />

            <Input
              label="Full name"
              name="fullName"
              placeholder="Enter your full name"
              error={registerState.fieldErrors?.fullName?.[0]}
              required
            />

            <OtpCodeInput
              label="6-digit code"
              name="otpCode"
              error={registerState.fieldErrors?.otpCode?.[0]}
              helperText="Enter the code sent to your phone."
            />
          </CardContent>

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isRegisterPending} fullWidth>
              Create Account
            </Button>

            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => {
                setVerifiedPhone("");
                setPhoneInput("");
                setCountdown(0);
              }}
            >
              Use another phone number
            </Button>
          </CardFooter>
        </form>

        <form action={requestAction} className="px-6 pb-6">
          <input type="hidden" name="purpose" value="register" />
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
