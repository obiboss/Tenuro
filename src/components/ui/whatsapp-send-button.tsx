"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type WhatsAppSendButtonProps = {
  phoneNumber: string;
  message: string;
  label?: string;
};

import { buildWaMeUrl } from "@/lib/whatsapp";

export function WhatsAppSendButton({
  phoneNumber,
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
