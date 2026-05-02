"use client";

import { useActionState } from "react";
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
  const [state, formAction, isPending] = useActionState(
    generateRentReceiptAction,
    initialReceiptActionState,
  );

  const hasGeneratedReceipt = Boolean(receiptPath);
  const downloadUrl = state.receiptDownloadUrl;

  return (
    <div className="space-y-2">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="Receipt ready"
        errorTitle="Receipt failed"
      />

      {downloadUrl ? (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-soft hover:bg-primary-hover"
        >
          Download Receipt
        </a>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="paymentId" value={paymentId} />

          <Button
            type="submit"
            variant="secondary"
            isLoading={isPending}
            fullWidth
          >
            {hasGeneratedReceipt
              ? "Prepare Receipt Download"
              : "Generate Receipt"}
          </Button>
        </form>
      )}
    </div>
  );
}
