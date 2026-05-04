"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { generateTenantOnboardingLinkAction } from "@/actions/onboarding.actions";
import { initialOnboardingInviteActionState } from "@/actions/onboarding.state";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";

type OnboardingInviteCardProps = {
  tenantId: string;
};

function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

export function OnboardingInviteCard({ tenantId }: OnboardingInviteCardProps) {
  const sentMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    generateTenantOnboardingLinkAction,
    initialOnboardingInviteActionState,
  );

  useEffect(() => {
    if (
      !state.ok ||
      !state.whatsappMessage ||
      !state.tenantWhatsappNumber ||
      sentMessageRef.current === state.whatsappMessage
    ) {
      return;
    }

    sentMessageRef.current = state.whatsappMessage;

    window.location.assign(
      buildWhatsAppUrl(state.tenantWhatsappNumber, state.whatsappMessage),
    );
  }, [state.ok, state.tenantWhatsappNumber, state.whatsappMessage]);

  return (
    <SectionCard
      title="Tenant Onboarding"
      description="Send a secure onboarding link directly to the tenant on WhatsApp."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />

        <TrustNotice
          title="Send onboarding link"
          description="Tenuro will generate the secure link and open WhatsApp with the message ready to send."
          icon={
            <MessageCircle aria-hidden="true" size={22} strokeWidth={2.6} />
          }
        />

        {state.message && !state.ok ? (
          <div
            role="alert"
            className="rounded-button bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            {state.message}
          </div>
        ) : null}

        <Button type="submit" isLoading={isPending} fullWidth>
          Send Onboarding Link
        </Button>
      </form>
    </SectionCard>
  );
}
