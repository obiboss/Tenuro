"use client";

import { MessageCircle } from "lucide-react";
import { buildWaMeUrl } from "@/lib/whatsapp";
import { tryNormalisePhoneNumber } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const { showToast } = useToast();
  const recipient = tryNormalisePhoneNumber(phoneNumber);
  const whatsappUrl = buildWaMeUrl({ phoneNumber, message });

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (recipient) {
      return;
    }

    event.preventDefault();
    showToast({
      title: "Phone number missing",
      description:
        "This tenant does not have a valid Nigerian phone number for WhatsApp.",
      tone: "error",
    });
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="block"
      onClick={handleClick}
    >
      <Button type="button" fullWidth>
        <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
        {label}
      </Button>
    </a>
  );
}
