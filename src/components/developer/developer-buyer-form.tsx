"use client";

import { useActionState, useState } from "react";
import { createDeveloperBuyerAction } from "@/actions/developer-buyers.actions";
import { initialDeveloperBuyerActionState } from "@/actions/developer-buyers.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function DeveloperBuyerForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");

  const [state, formAction, isPending] = useActionState(
    createDeveloperBuyerAction,
    initialDeveloperBuyerActionState,
  );

  return (
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
            label="Buyer full name"
            name="fullName"
            placeholder="Enter buyer full name"
            autoComplete="name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <PhoneNumberInput
            label="Buyer phone number"
            name="phoneNumber"
            value={phoneNumber}
            onChange={setPhoneNumber}
            error={state.fieldErrors?.phoneNumber?.[0]}
            helperText="Enter number without the first 0. Example: 8149761904."
            required
          />

          <Input
            label="Buyer email"
            name="email"
            type="email"
            placeholder="Optional"
            autoComplete="email"
            error={state.fieldErrors?.email?.[0]}
          />

          <Input
            label="NIN"
            name="nin"
            inputMode="numeric"
            placeholder="11-digit NIN"
            error={state.fieldErrors?.nin?.[0]}
            required
          />

          <Input
            label="Residential address"
            name="residentialAddress"
            placeholder="Enter buyer residential address"
            autoComplete="street-address"
            error={state.fieldErrors?.residentialAddress?.[0]}
            required
          />

          <Input
            label="Next of kin name"
            name="nextOfKinName"
            placeholder="Enter next of kin full name"
            error={state.fieldErrors?.nextOfKinName?.[0]}
            required
          />

          <PhoneNumberInput
            label="Next of kin phone"
            name="nextOfKinPhone"
            value={nextOfKinPhone}
            onChange={setNextOfKinPhone}
            error={state.fieldErrors?.nextOfKinPhone?.[0]}
            helperText="Enter number without the first 0. Example: 8149761904."
            required
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" isLoading={isPending}>
            Create Buyer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
