"use client";

import { useActionState } from "react";
import { updateDemoRequestStatusAction } from "@/actions/demo-request.actions";
import { initialPlatformAdminDemoRequestActionState } from "@/actions/demo-request.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import type { DemoRequestStatus } from "@/server/validators/demo-request.schema";

const statusOptions: Array<{
  label: string;
  value: DemoRequestStatus;
}> = [
  { label: "Waiting for contact", value: "pending" },
  { label: "Contacted", value: "contacted" },
  { label: "Demo scheduled", value: "scheduled" },
  { label: "Demo completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export function DemoRequestStatusControls({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: DemoRequestStatus;
}) {
  const [state, action, isPending] = useActionState(
    updateDemoRequestStatusAction,
    initialPlatformAdminDemoRequestActionState,
  );

  return (
    <form action={action} className="space-y-3">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Demo request updated"
        errorTitle="Update failed"
      />

      <input type="hidden" name="requestId" value={requestId} readOnly />

      <label
        htmlFor={`demo-request-status-${requestId}`}
        className="block text-xs font-bold uppercase tracking-wide text-text-muted"
      >
        Request status
      </label>

      <select
        id={`demo-request-status-${requestId}`}
        name="status"
        defaultValue={currentStatus}
        disabled={isPending}
        className="min-h-11 w-full rounded-button border border-border-soft bg-white px-3 py-2 text-sm font-bold text-text-strong outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Button type="submit" size="sm" fullWidth disabled={isPending}>
        {isPending ? "Saving..." : "Save status"}
      </Button>
    </form>
  );
}
