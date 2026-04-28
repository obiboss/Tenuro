"use client";

import { useActionState } from "react";
import { createTenantShellAction } from "@/actions/tenants.actions";
import { initialTenantActionState } from "@/actions/tenant.state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
      <Card>
        <CardContent>
          {state.message ? (
            <div
              role="alert"
              className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            >
              {state.message}
            </div>
          ) : null}

          <Select
            label="Unit"
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
            label="Tenant name"
            name="fullName"
            placeholder="Enter tenant full name"
            error={state.fieldErrors?.fullName?.[0]}
            required
          />

          <Input
            label="Phone number"
            name="phoneNumber"
            placeholder="Example: 08012345678"
            error={state.fieldErrors?.phoneNumber?.[0]}
            required
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="Optional"
            error={state.fieldErrors?.email?.[0]}
          />

          <Textarea
            label="Private note"
            name="landlordNotes"
            placeholder="Optional note only you can see"
            helperText="This note is private and will not be shown to the tenant."
            error={state.fieldErrors?.landlordNotes?.[0]}
          />
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            isLoading={isPending}
            disabled={unitOptions.length === 0}
          >
            Save Tenant
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
