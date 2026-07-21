"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { BOPA_WHATSAPP_NUMBER_DISPLAY } from "@/constants/bopa-contact";
import { buildWaMeUrl } from "@/lib/whatsapp";

export function DemoRequestWhatsAppComposer({
  requesterName,
  requesterPhoneNumber,
  workspaceLabel,
}: {
  requesterName: string;
  requesterPhoneNumber: string;
  workspaceLabel: string;
}) {
  const [message, setMessage] = useState(
    [
      `Hello ${requesterName},`,
      "",
      `Thank you for requesting a ${workspaceLabel} demonstration. This is the BOPA team contacting you to confirm a suitable time.`,
    ].join("\n"),
  );
  const whatsappUrl = buildWaMeUrl({
    phoneNumber: requesterPhoneNumber,
    message,
  });

  return (
    <div className="rounded-button border border-success/25 bg-success-soft p-4">
      <Textarea
        label="WhatsApp message"
        name={`demo-whatsapp-${requesterPhoneNumber}`}
        rows={4}
        maxLength={1_000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        helperText={`Edit the message, then open WhatsApp. Send it from BOPA's WhatsApp account: ${BOPA_WHATSAPP_NUMBER_DISPLAY}.`}
        className="bg-white"
      />

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-button bg-success px-4 text-sm font-black text-white transition hover:opacity-90"
      >
        <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
        Open WhatsApp to this requester
      </a>
    </div>
  );
}
