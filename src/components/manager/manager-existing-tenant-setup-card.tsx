"use client";

import { useActionState } from "react";
import { completeManagerExistingTenantSetupAction } from "@/actions/manager.actions";
import { initialManagerActionState } from "@/actions/manager.state";
import { Button } from "@/components/ui/button";

type ManagerExistingTenantSetupCardProps = {
  propertyId: string;
  propertyName: string;
  hasUnits: boolean;
};

export function ManagerExistingTenantSetupCard({
  propertyId,
  propertyName,
  hasUnits,
}: ManagerExistingTenantSetupCardProps) {
  const [state, formAction, isPending] = useActionState(
    completeManagerExistingTenantSetupAction,
    initialManagerActionState,
  );

  if (state.ok) {
    return (
      <section className="rounded-card border border-success/20 bg-success-soft p-4">
        <p className="font-black text-text-strong">
          Existing tenant setup complete
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
          {propertyName} will now use tenant and unit records for ongoing
          occupancy.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-primary/20 bg-primary-soft p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-text-strong">
            Existing tenant setup in progress
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Capture the tenants already living here, then mark this setup
            complete. Some units can remain vacant.
          </p>
          {state.message ? (
            <p className="mt-2 text-sm font-semibold text-danger">
              {state.message}
            </p>
          ) : null}
        </div>

        <form action={formAction} className="shrink-0">
          <input type="hidden" name="propertyId" value={propertyId} />
          <Button type="submit" isLoading={isPending} disabled={!hasUnits}>
            Existing tenants captured
          </Button>
        </form>
      </div>
    </section>
  );
}
