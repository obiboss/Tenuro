"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { prepareRentReceiptWhatsAppAction } from "@/actions/receipts.actions";
import { initialReceiptActionState } from "@/actions/receipt.state";
import { ActionResultToast } from "@/components/ui/action-result-toast";
import { Button } from "@/components/ui/button";

type ReceiptWhatsAppButtonProps = {
  paymentId: string;
};

export function ReceiptWhatsAppButton({
  paymentId,
}: ReceiptWhatsAppButtonProps) {
  const openedUrlRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    prepareRentReceiptWhatsAppAction,
    initialReceiptActionState,
  );

  useEffect(() => {
    if (!state.whatsappUrl || openedUrlRef.current === state.whatsappUrl) {
      return;
    }

    openedUrlRef.current = state.whatsappUrl;
    window.open(state.whatsappUrl, "_blank", "noopener,noreferrer");
  }, [state.whatsappUrl]);

  return (
    <div className="space-y-2">
      <ActionResultToast
        ok={state.ok}
        message={state.message}
        successTitle="WhatsApp ready"
        errorTitle="WhatsApp preparation failed"
      />

      <form action={formAction}>
        <input type="hidden" name="paymentId" value={paymentId} />

        <Button
          type="submit"
          variant="secondary"
          isLoading={isPending}
          fullWidth
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Send aria-hidden="true" size={16} strokeWidth={2.6} />
            Send Receipt on WhatsApp
          </span>
        </Button>
      </form>

      {state.ok && state.whatsappUrl ? (
        <p className="text-xs font-semibold leading-5 text-text-muted">
          WhatsApp opened in a new tab with the receipt message.
        </p>
      ) : null}
    </div>
  );
}
