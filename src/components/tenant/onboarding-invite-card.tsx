"use client";

import { useActionState, useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { generateTenantOnboardingLinkAction } from "@/actions/onboarding.actions";
import { initialOnboardingInviteActionState } from "@/actions/onboarding.state";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";

type OnboardingInviteCardProps = {
  tenantId: string;
};

export function OnboardingInviteCard({ tenantId }: OnboardingInviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [state, formAction, isPending] = useActionState(
    generateTenantOnboardingLinkAction,
    initialOnboardingInviteActionState,
  );

  async function copyInviteText() {
    if (!state.whatsappMessage) {
      return;
    }

    await navigator.clipboard.writeText(state.whatsappMessage);
    setCopied(true);
  }

  return (
    <SectionCard
      title="Tenant Onboarding"
      description="Prepare a secure link the tenant can use to complete their profile."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />

        <TrustNotice
          title="Secure tenant link"
          description="The link expires after 72 hours and only the protected token is stored."
          icon={
            <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
          }
        />

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

        {state.onboardingUrl ? (
          <div className="space-y-3">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-strong">
                Onboarding link
              </p>
              <p className="mt-2 break-all text-sm leading-6 text-text-muted">
                {state.onboardingUrl}
              </p>
            </div>

            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-strong">
                WhatsApp message
              </p>
              <p className="mt-2 text-sm leading-6 text-text-muted">
                {state.whatsappMessage}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={copyInviteText}
            >
              <Copy aria-hidden="true" size={18} strokeWidth={2.6} />
              {copied ? "Copied" : "Copy WhatsApp Message"}
            </Button>
          </div>
        ) : null}

        <Button type="submit" isLoading={isPending} fullWidth>
          Generate Onboarding Link
        </Button>
      </form>
    </SectionCard>
  );
}
