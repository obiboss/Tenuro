"use client";

import { useActionState, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import {
  createCaretakerProofRequestAction,
  createLandlordProofRequestAction,
} from "@/actions/caretaker.actions";
import { initialCaretakerProofRequestActionState } from "@/actions/caretaker.state";
import { Button } from "@/components/ui/button";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";
import { formatNaira } from "@/server/utils/money";

type RequestPaymentProofPanelProps = {
  requester?: "caretaker" | "landlord";
  tenancyId: string;
  tenantName: string;
  tenantPhone: string | null;
  propertyUnitLabel: string;
  rentAmount: number;
};

export function RequestPaymentProofPanel({
  requester = "caretaker",
  tenancyId,
  tenantName,
  tenantPhone,
  propertyUnitLabel,
  rentAmount,
}: RequestPaymentProofPanelProps) {
  const requestAction =
    requester === "landlord"
      ? createLandlordProofRequestAction
      : createCaretakerProofRequestAction;
  const [state, formAction, isPending] = useActionState(
    requestAction,
    initialCaretakerProofRequestActionState,
  );
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function copyProofLink() {
    if (!state.proofUrl) {
      return;
    }

    await navigator.clipboard.writeText(state.proofUrl);
    setCopyMessage("Proof link copied.");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border-soft bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Tenant
        </p>
        <h2 className="mt-1 text-xl font-black text-text-strong">
          {tenantName}
        </h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          {propertyUnitLabel}
        </p>
        <p className="mt-3 text-sm font-bold text-text-muted">
          Rent: {formatNaira(rentAmount)}
        </p>
      </div>

      <form
        action={formAction}
        className="rounded-card border border-border-soft bg-white p-4"
      >
        <input type="hidden" name="tenancyId" value={tenancyId} />

        <div className="space-y-2">
          <h3 className="text-base font-black text-text-strong">
            Ask tenant to confirm payment
          </h3>
          <p className="text-sm leading-6 text-text-muted">
            BOPA will create a secure link for the tenant to enter the amount
            paid, payment date and upload their bank receipt. You will confirm
            it before BOPA records the payment and prepares the receipt.
          </p>
        </div>

        {state.message ? (
          <p
            className={`mt-4 rounded-2xl p-3 text-sm font-bold ${
              state.ok
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        {!state.proofUrl ? (
          <Button type="submit" fullWidth className="mt-4" disabled={isPending}>
            <MessageCircle aria-hidden="true" size={16} strokeWidth={2.6} />
            {isPending ? "Creating link..." : "Create payment link"}
          </Button>
        ) : null}
      </form>

      {state.proofUrl ? (
        <div className="rounded-card border border-border-soft bg-white p-4">
          <h3 className="text-base font-black text-text-strong">
            Send to tenant
          </h3>
          <p className="mt-1 break-all text-sm font-semibold text-text-muted">
            {state.proofUrl}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <WhatsAppSendButton
              phoneNumber={state.tenantPhone ?? tenantPhone}
              message={state.whatsappMessage ?? state.proofUrl}
              label="Send on WhatsApp"
            />

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={copyProofLink}
            >
              <Copy aria-hidden="true" size={16} strokeWidth={2.6} />
              Copy link
            </Button>
          </div>

          {copyMessage ? (
            <p className="mt-3 text-sm font-bold text-success">{copyMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
