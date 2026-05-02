"use client";

import { useActionState, useEffect, useRef } from "react";
import { generateRentReceiptAction } from "@/actions/receipts.actions";
import { initialReceiptActionState } from "@/actions/receipt.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";

type ReceiptDownloadButtonProps = {
  paymentId: string;
  receiptPath: string | null;
};

export function ReceiptDownloadButton({
  paymentId,
  receiptPath,
}: ReceiptDownloadButtonProps) {
  const openedUrlRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    generateRentReceiptAction,
    initialReceiptActionState,
  );

  const hasGeneratedReceipt = Boolean(receiptPath);
  const receiptDownloadUrl = state.receiptDownloadUrl ?? null;

  useEffect(() => {
    if (!receiptDownloadUrl || openedUrlRef.current === receiptDownloadUrl) {
      return;
    }

    openedUrlRef.current = receiptDownloadUrl;

    window.open(receiptDownloadUrl, "_blank", "noopener,noreferrer");
  }, [receiptDownloadUrl]);

  return (
    <div className="space-y-2">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Receipt ready"
        errorTitle="Receipt failed"
      />

      <form action={formAction}>
        <input type="hidden" name="paymentId" value={paymentId} />

        <Button
          type="submit"
          variant="secondary"
          isLoading={isPending}
          fullWidth
        >
          {hasGeneratedReceipt ? "Download Receipt" : "Generate Receipt"}
        </Button>
      </form>

      {state.ok && receiptDownloadUrl ? (
        <p className="text-xs font-semibold leading-5 text-text-muted">
          Receipt opened in a new tab. If it did not open, check your browser
          popup settings and click Download Receipt again.
        </p>
      ) : null}
    </div>
  );
}
