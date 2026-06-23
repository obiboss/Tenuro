"use client";

import { useActionState } from "react";
import { createBuyerSalePortalLinkAction } from "@/actions/developer-buyer-portal.actions";
import { initialDeveloperBuyerPortalActionState } from "@/actions/developer-buyer-portal.state";
import { WhatsAppShareActions } from "@/components/ui/whatsapp-share-actions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { buildDeveloperBuyerPortalWhatsappMessage } from "@/lib/whatsapp-messages";

type DeveloperBuyerPortalLinkFormProps = {
  saleId: string;
  buyerName: string;
  buyerPhone?: string | null;
  estatePlotLabel: string;
};

export function DeveloperBuyerPortalLinkForm({
  saleId,
  buyerName,
  buyerPhone = null,
  estatePlotLabel,
}: DeveloperBuyerPortalLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    createBuyerSalePortalLinkAction,
    initialDeveloperBuyerPortalActionState,
  );

  const portalMessage = state.portalUrl
    ? buildDeveloperBuyerPortalWhatsappMessage({
        buyerName,
        estatePlotLabel,
        portalUrl: state.portalUrl,
      })
    : "";

  return (
    <SectionCard
      title="Buyer Payment Portal"
      description="Create a secure link for the buyer to view payments, receipts, and documents."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="saleId" value={saleId} />

        {state.message ? (
          <div
            role="alert"
            className={
              state.ok
                ? "rounded-button bg-success-soft px-4 py-3 text-sm font-semibold text-success"
                : "rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
            }
          >
            {state.message}
          </div>
        ) : null}

        {state.portalUrl ? (
          <div className="space-y-3 rounded-button bg-background p-4">
            <p className="text-sm font-bold text-text-muted">Buyer portal link</p>

            <p className="break-all text-sm font-semibold leading-6 text-text-strong">
              {state.portalUrl}
            </p>

            <WhatsAppShareActions
              phoneNumber={buyerPhone}
              message={portalMessage}
              copyText={portalMessage}
              whatsappLabel="Send on WhatsApp"
              copyLabel="Copy message"
            />
          </div>
        ) : null}

        <Button type="submit" isLoading={isPending}>
          Generate Buyer Portal Link
        </Button>
      </form>
    </SectionCard>
  );
}
