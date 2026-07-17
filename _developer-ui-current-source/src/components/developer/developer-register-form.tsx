"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerDeveloperAction } from "@/actions/developer-auth.actions";
import { initialDeveloperAuthActionState } from "@/actions/developer-auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrustNotice } from "@/components/ui/trust-notice";

export function DeveloperRegisterForm() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [state, formAction, isPending] = useActionState(
    registerDeveloperAction,
    initialDeveloperAuthActionState,
  );

  return (
    <div className="space-y-5">
      <TrustNotice
        title="Create a developer workspace"
        description="This account is separate from BOPA landlord access and is built for estate sales, buyer records, plot inventory, and payment tracking."
      />

      <form action={formAction}>
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

            <Input
              label="Full name"
              name="fullName"
              placeholder="Enter your full name"
              autoComplete="name"
              error={state.fieldErrors?.fullName?.[0]}
              required
            />

            <PhoneNumberInput
              label="Phone number"
              name="phoneNumber"
              value={phoneNumber}
              onChange={setPhoneNumber}
              error={state.fieldErrors?.phoneNumber?.[0]}
              helperText="Enter your number without the first 0. Example: 8149761904."
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={state.fieldErrors?.password?.[0]}
              required
            />

            <Input
              label="Developer company name"
              name="companyName"
              placeholder="Example: Greenfield Homes Ltd"
              autoComplete="organization"
              error={state.fieldErrors?.companyName?.[0]}
              required
            />

            <Input
              label="Company email"
              name="companyEmail"
              type="email"
              placeholder="company@example.com"
              autoComplete="email"
              error={state.fieldErrors?.companyEmail?.[0]}
            />

            <Input
              label="RC number"
              name="rcNumber"
              placeholder="Optional"
              error={state.fieldErrors?.rcNumber?.[0]}
            />

            <Input
              label="Office address"
              name="officeAddress"
              placeholder="Optional"
              autoComplete="street-address"
              error={state.fieldErrors?.officeAddress?.[0]}
            />
          </CardContent>

          <CardFooter className="items-stretch">
            <Button type="submit" isLoading={isPending} fullWidth>
              Create Developer Account
            </Button>

            <p className="text-center text-sm text-text-muted sm:text-left">
              Already have a developer account?{" "}
              <Link href="/developer/login" className="font-bold text-primary">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
