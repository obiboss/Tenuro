"use client";

import { useActionState } from "react";
import { createTenantMoveOutNoticeAction } from "@/actions/quit-notices.actions";
import { initialTenantMoveOutNoticeActionState } from "@/actions/quit-notices.state";
import type { TenantDashboardMoveOutNoticeRow } from "@/server/repositories/tenant-dashboard.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import { CalendarClock, Home } from "lucide-react";

type TenantMoveOutNoticeCardProps = {
  moveOutNotice: TenantDashboardMoveOutNoticeRow | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function TenantMoveOutNoticeCard({
  moveOutNotice,
}: TenantMoveOutNoticeCardProps) {
  const [state, formAction, isPending] = useActionState(
    createTenantMoveOutNoticeAction,
    initialTenantMoveOutNoticeActionState,
  );

  if (moveOutNotice || state.ok) {
    return (
      <div className="space-y-4">
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Move-out notice submitted"
          errorTitle="Move-out notice failed"
        />

        <TrustNotice
          title="Move-out notice submitted"
          description="Your landlord can now review your planned move-out date. Your tenancy remains active until move-out is confirmed."
          icon={<Home aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        {moveOutNotice ? (
          <div className="rounded-button bg-background p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{moveOutNotice.status}</Badge>
              <p className="text-sm font-bold text-text-muted">
                Submitted {formatDate(moveOutNotice.created_at)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm font-bold text-text-muted">
                  Planned move-out date
                </p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {formatDate(moveOutNotice.vacate_by_date)}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-text-muted">Notice date</p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {formatDate(moveOutNotice.notice_date)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-text-muted">
              {moveOutNotice.reason}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Move-out notice submitted"
        errorTitle="Move-out notice failed"
      />

      <TrustNotice
        title="This does not end your tenancy immediately"
        description="Your landlord must review and confirm move-out before the unit becomes vacant."
        icon={<CalendarClock aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <Input
        label="Planned move-out date"
        name="plannedMoveOutDate"
        type="date"
        required
        error={state.fieldErrors?.plannedMoveOutDate?.[0]}
      />

      <Textarea
        label="Reason or note"
        name="reason"
        required
        placeholder="Example: I do not intend to renew my tenancy and plan to leave on the selected date."
        error={state.fieldErrors?.reason?.[0]}
      />

      <Button type="submit" isLoading={isPending} fullWidth>
        Submit Move-Out Notice
      </Button>
    </form>
  );
}
