"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";
import { renewTenancyAction } from "@/actions/tenancies.actions";
import { initialTenancyActionState } from "@/actions/tenancy.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";

type RenewTenancyButtonProps = {
  tenancyId: string;
};

export function RenewTenancyButton({ tenancyId }: RenewTenancyButtonProps) {
  const router = useRouter();
  const handledMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    renewTenancyAction,
    initialTenancyActionState,
  );

  useEffect(() => {
    if (!state.ok || !state.message) {
      return;
    }

    if (handledMessageRef.current === state.message) {
      return;
    }

    handledMessageRef.current = state.message;
    router.refresh();
  }, [router, state.message, state.ok]);

  return (
    <form action={formAction}>
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Tenancy renewed"
        errorTitle="Renewal failed"
      />

      <input type="hidden" name="tenancyId" value={tenancyId} />

      {state.message && !state.ok ? (
        <div
          role="alert"
          className="mb-3 rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <Button type="submit" variant="secondary" isLoading={isPending} fullWidth>
        <RefreshCcw aria-hidden="true" size={18} strokeWidth={2.6} />
        Renew Tenancy
      </Button>
    </form>
  );
}
