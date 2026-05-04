"use client";

import { useActionState, useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { generateTenantActivationLinkAction } from "@/actions/tenant-activation.actions";
import { initialTenantActivationInviteActionState } from "@/actions/tenant-activation.state";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { WhatsAppSendButton } from "@/components/ui/whatsapp-send-button";

type TenantActivationInviteCardProps = {
  tenantId: string;
};

export function TenantActivationInviteCard({
  tenantId,
}: TenantActivationInviteCardProps) {
  const [copied, setCopied] = useState(false);

  const [state, formAction, isPending] = useActionState(
    generateTenantActivationLinkAction,
    initialTenantActivationInviteActionState,
  );

  async function copyInviteText() {
    if (!state.whatsappMessage) {
      return;
    }

    await navigator.clipboard.writeText(state.whatsappMessage);
    setCopied(true);
  }

  const canSendViaWhatsApp = Boolean(
    state.tenantWhatsappNumber && state.whatsappMessage,
  );

  return (
    <SectionCard
      title="Tenant Account Activation"
      description="Send the password setup link after the tenant has completed the required rental steps."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="tenantId" value={tenantId} />

        <TrustNotice
          title="Password setup link"
          description="The tenant will use this secure link to create their login password."
          icon={<KeyRound aria-hidden="true" size={22} strokeWidth={2.6} />}
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

        {state.activationUrl ? (
          <div className="space-y-3">
            <div className="rounded-button bg-background p-4">
              <p className="text-sm font-bold text-text-strong">
                Message preview
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">
                {state.whatsappMessage}
              </p>
            </div>

            {canSendViaWhatsApp ? (
              <WhatsAppSendButton
                phoneNumber={state.tenantWhatsappNumber ?? ""}
                message={state.whatsappMessage ?? ""}
                label="Send Activation Link"
              />
            ) : null}

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={copyInviteText}
            >
              <Copy aria-hidden="true" size={18} strokeWidth={2.6} />
              {copied ? "Copied" : "Copy Message"}
            </Button>
          </div>
        ) : null}

        <Button type="submit" isLoading={isPending} fullWidth>
          Generate Activation Link
        </Button>
      </form>
    </SectionCard>
  );
}
