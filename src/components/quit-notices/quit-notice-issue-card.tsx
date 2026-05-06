"use client";

import { useActionState } from "react";
import { createAndIssueQuitNoticeAction } from "@/actions/quit-notices.actions";
import { initialQuitNoticeActionState } from "@/actions/quit-notices.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TrustNotice } from "@/components/ui/trust-notice";
import { FileText, MessageCircle } from "lucide-react";

type QuitNoticeIssueCardProps = {
  tenantId: string;
  tenancyId: string;
};

export function QuitNoticeIssueCard({
  tenantId,
  tenancyId,
}: QuitNoticeIssueCardProps) {
  const [state, formAction, isPending] = useActionState(
    createAndIssueQuitNoticeAction,
    initialQuitNoticeActionState,
  );

  return (
    <ToastProvider>
      <form action={formAction} className="space-y-5">
        <ActionResultToast
          ok={state.ok}
          message={state.message}
          successTitle="Quit notice prepared"
          errorTitle="Quit notice failed"
        />

        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="tenancyId" value={tenancyId} />

        <TrustNotice
          title="This will not mark the unit vacant"
          description="The tenancy remains active until move-out is confirmed in the later move-out workflow."
          icon={<FileText aria-hidden="true" size={22} strokeWidth={2.6} />}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Notice date"
            name="noticeDate"
            type="date"
            required
            error={state.fieldErrors?.noticeDate?.[0]}
          />

          <Input
            label="Vacate-by date"
            name="vacateByDate"
            type="date"
            required
            error={state.fieldErrors?.vacateByDate?.[0]}
          />
        </div>

        <Textarea
          label="Reason for quit notice"
          name="reason"
          required
          placeholder="Example: Non-payment of rent, breach of tenancy terms, or landlord requires possession."
          error={state.fieldErrors?.reason?.[0]}
        />

        <Textarea
          label="Private landlord note"
          name="landlordNotes"
          placeholder="Optional internal note. This is stored with the notice record."
          error={state.fieldErrors?.landlordNotes?.[0]}
        />

        <Button type="submit" isLoading={isPending} fullWidth>
          Prepare Quit Notice
        </Button>

        {state.ok ? (
          <div className="rounded-button bg-success-soft p-4">
            <p className="text-sm font-extrabold text-success">
              Quit notice is ready
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              {state.pdfDownloadUrl ? (
                <a
                  href={state.pdfDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-button bg-white px-4 py-2 text-sm font-extrabold text-success shadow-soft"
                >
                  Download PDF
                </a>
              ) : null}

              {state.whatsappUrl ? (
                <a
                  href={state.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
                >
                  <MessageCircle
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2.6}
                  />
                  Open WhatsApp Draft
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>
    </ToastProvider>
  );
}
