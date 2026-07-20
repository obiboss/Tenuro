"use client";

import { useActionState } from "react";
import { createTenantShellAction } from "@/actions/tenants.actions";
import { initialTenantActionState } from "@/actions/tenant.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type VacantUnit = {
  id: string;
  propertyName: string;
  unitIdentifier: string;
  annualRent: number | null;
  monthlyRent: number | null;
  currencyCode: string;
};

type TenantShellFormProps = {
  vacantUnits: VacantUnit[];
};

function formatMoney(amount: number | null, currencyCode: string) {
  if (amount === null) {
    return "rent not set";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TenantShellForm({ vacantUnits }: TenantShellFormProps) {
  const [state, formAction, isPending] = useActionState(
    createTenantShellAction,
    initialTenantActionState,
  );

  const unitOptions = vacantUnits.map((unit) => ({
    value: unit.id,
    label: `${unit.propertyName} — ${unit.unitIdentifier} — ${formatMoney(
      unit.annualRent,
      unit.currencyCode,
    )}`,
  }));

  return (
    <form action={formAction}>
      <Card className="border border-border-soft shadow-card">
        <CardContent>
          <input type="hidden" name="email" value="" />
          <input type="hidden" name="landlordNotes" value="" />

          {state.message ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {state.message}
            </div>
          ) : null}

          <Select
            label="Apartment or unit"
            name="unitId"
            placeholder={
              unitOptions.length > 0
                ? "Select the tenant's unit"
                : "No vacant unit available"
            }
            options={unitOptions}
            error={state.fieldErrors?.unitId?.[0]}
            disabled={unitOptions.length === 0}
            required
          />

          <Input
            label="Tenant’s full name"
            name="fullName"
            placeholder="Enter tenant full name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Tenant’s phone number"
            name="phoneNumber"
            placeholder="Example: 08012345678"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

          <div className="rounded-button bg-background p-4 text-sm font-semibold leading-6 text-text-muted">
            The tenant will complete their occupation, identification and
            guarantor details using the secure link.
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={unitOptions.length === 0}
            size="lg"
            fullWidth
          >
            Save and prepare tenant link
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
