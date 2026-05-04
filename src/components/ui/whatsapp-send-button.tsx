"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type WhatsAppSendButtonProps = {
  phoneNumber: string;
  message: string;
  label?: string;
};

function buildWhatsAppUrl(phoneNumber: string, message: string) {
  const digitsOnly = phoneNumber.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${digitsOnly}?text=${encodedMessage}`;
}

export function WhatsAppSendButton({
  phoneNumber,
  message,
  label = "Send via WhatsApp",
}: WhatsAppSendButtonProps) {
  const whatsappUrl = buildWhatsAppUrl(phoneNumber, message);

  return (
    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="block">
      <Button type="button" fullWidth>
        <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
        {label}
      </Button>
    </a>
  );
}
