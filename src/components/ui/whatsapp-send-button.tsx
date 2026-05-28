"use client";

import { MessageCircle } from "lucide-react";
import { buildWaMeUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

type WhatsAppSendButtonProps = {
  phoneNumber?: string | null;
  message: string;
  label?: string;
};

export function WhatsAppSendButton({
  phoneNumber = null,
  message,
  label = "Send via WhatsApp",
}: WhatsAppSendButtonProps) {
  const whatsappUrl = buildWaMeUrl({ phoneNumber, message });

  return (
    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="block">
      <Button type="button" fullWidth>
        <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
        {label}
      </Button>
    </a>
  );
}
