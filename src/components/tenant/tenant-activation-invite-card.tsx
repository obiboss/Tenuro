"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound } from "lucide-react";
import { generateTenantActivationLinkAction } from "@/actions/tenant-activation.actions";
import { initialTenantActivationInviteActionState } from "@/actions/tenant-activation.state";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";

type TenantActivationInviteCardProps = {
  tenantId: string;
};

function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

export function TenantActivationInviteCard({
  tenantId,
}: TenantActivationInviteCardProps) {
  const sentMessageRef = useRef<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    generateTenantActivationLinkAction,
    initialTenantActivationInviteActionState,
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
      title="Tenant Account Activation"
      description="Send the password setup link directly to the tenant on WhatsApp."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />

        <TrustNotice
          title="Send password setup link"
          description="Tenuro will generate the secure activation link and open WhatsApp with the message ready to send."
          icon={<KeyRound aria-hidden="true" size={22} strokeWidth={2.6} />}
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
          Send Activation Link
        </Button>
      </form>
    </SectionCard>
  );
}
