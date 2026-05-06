"use client";

import { useActionState } from "react";
import { confirmTenantMoveOutAction } from "@/actions/quit-notices.actions";
import { initialConfirmMoveOutActionState } from "@/actions/quit-notices.state";
import type { QuitNoticeDetailRow } from "@/server/repositories/quit-notices.repository";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustNotice } from "@/components/ui/trust-notice";
import { CheckCircle2, Home } from "lucide-react";

type MoveOutConfirmationCardProps = {
  tenantId: string;
  notices: QuitNoticeDetailRow[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(date);
}

function isConfirmableNotice(notice: QuitNoticeDetailRow) {
  return notice.status === "issued" || notice.status === "delivered";
}

export function MoveOutConfirmationCard({
  tenantId,
  notices,
}: MoveOutConfirmationCardProps) {
  const [state, formAction, isPending] = useActionState(
    confirmTenantMoveOutAction,
    initialConfirmMoveOutActionState,
  );

  const confirmableNotices = notices.filter(isConfirmableNotice);

  if (confirmableNotices.length === 0) {
    return (
      <TrustNotice
        title="No pending move-out notice"
        description="Move-out confirmation becomes available after a quit notice or tenant move-out notice has been issued."
        icon={<Home aria-hidden="true" size={22} strokeWidth={2.6} />}
      />
    );
  }

  return (
    <div className="space-y-5">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Move-out confirmed"
        errorTitle="Move-out failed"
      />

      <TrustNotice
        title="Confirm only after the tenant has actually moved out"
        description="This closes the tenancy and marks the unit vacant. Ledger, payments, receipts, and documents remain saved for history."
        icon={<CheckCircle2 aria-hidden="true" size={22} strokeWidth={2.6} />}
      />

      <div className="space-y-4">
        {confirmableNotices.map((notice) => (
          <form
            key={notice.id}
            action={formAction}
            className="rounded-card border border-border-soft bg-white p-5 shadow-card"
          >
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="quitNoticeId" value={notice.id} />

            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">
                    {notice.notice_type === "tenant_intent_to_vacate"
                      ? "Tenant move-out notice"
                      : "Quit notice"}
                  </Badge>
                  <Badge tone="neutral">{notice.status}</Badge>
                </div>

                <p className="mt-3 text-sm font-bold text-text-muted">
                  Vacate-by date
                </p>
                <p className="mt-1 font-extrabold text-text-strong">
                  {formatDate(notice.vacate_by_date)}
                </p>
              </div>

              <div className="text-sm leading-6 text-text-muted md:max-w-sm md:text-right">
                {notice.reason}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input
                label="Actual move-out date"
                name="actualMoveOutDate"
                type="date"
                required
                error={state.fieldErrors?.actualMoveOutDate?.[0]}
              />

              <Textarea
                label="Final note"
                name="finalNote"
                placeholder="Optional note, e.g. keys received, inspection completed."
                error={state.fieldErrors?.finalNote?.[0]}
              />
            </div>

            <Button type="submit" isLoading={isPending} fullWidth>
              Confirm Move-Out and Mark Unit Vacant
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
