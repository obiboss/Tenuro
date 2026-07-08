"use client";

import { MessageCircle } from "lucide-react";
import { buildWaMeUrl, resolveWhatsAppShareTarget } from "@/lib/whatsapp";
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
      description: "Add a valid phone number before sending on WhatsApp.",
      tone: "error",
    });
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={handleClick}
    >
      <MessageCircle aria-hidden="true" size={18} strokeWidth={2.6} />
      <span>{label}</span>
    </a>
  );
}
