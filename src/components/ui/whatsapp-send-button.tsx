"use client";

import { MessageCircle } from "lucide-react";
import { buildWaMeUrl, resolveWhatsAppShareTarget } from "@/lib/whatsapp";
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
  const target = resolveWhatsAppShareTarget(phoneNumber);
  const whatsappUrl = buildWaMeUrl({ phoneNumber, message });

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (target.mode !== "invalid") {
      return;
    }

    event.preventDefault();
    showToast({
      title: "Invalid phone number",
      description:
        "Add a valid phone number before sending on WhatsApp.",
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
