"use client";

import { useActionState } from "react";
import { createBuyerSalePortalLinkAction } from "@/actions/developer-buyer-portal.actions";
import { initialDeveloperBuyerPortalActionState } from "@/actions/developer-buyer-portal.state";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";

type DeveloperBuyerPortalLinkFormProps = {
  saleId: string;
  buyerName: string;
};

function buildWhatsAppShareText(params: {
  buyerName: string;
  portalUrl: string;
}) {
  return `Hello ${params.buyerName}, use this secure Boldverse Property link to view your plot details, payment schedule, confirmed payments, and payment receipts: ${params.portalUrl}`;
}

export function DeveloperBuyerPortalLinkForm({
  saleId,
  buyerName,
}: DeveloperBuyerPortalLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    createBuyerSalePortalLinkAction,
    initialDeveloperBuyerPortalActionState,
  );

  const whatsappHref = state.portalUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        buildWhatsAppShareText({
          buyerName,
          portalUrl: state.portalUrl,
        }),
      )}`
    : null;

  return (
    <SectionCard
      title="Buyer Payment Portal"
      description="Create one secure reusable link the buyer can use to view plot details, payment schedule, confirmed payments, and receipts."
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
            <p className="text-sm font-bold text-text-muted">
              Buyer portal link
            </p>

            <p className="break-all text-sm font-semibold leading-6 text-text-strong">
              {state.portalUrl}
            </p>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
              >
                Send via WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" isLoading={isPending}>
          Generate Buyer Portal Link
        </Button>
      </form>
    </SectionCard>
  );
}
