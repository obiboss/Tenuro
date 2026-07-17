"use client";

import { Copy, MessageCircle } from "lucide-react";
import { buildWaMeUrl, resolveWhatsAppShareTarget } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/cn";

type WhatsAppShareActionsProps = {
  phoneNumber?: string | null;
  message: string;
  copyText?: string;
  whatsappLabel?: string;
  copyLabel?: string;
  className?: string;
  compact?: boolean;
};

export function WhatsAppShareActions({
  phoneNumber = null,
  message,
  copyText,
  whatsappLabel = "Send on WhatsApp",
  copyLabel = "Copy message",
  className,
  compact = false,
}: WhatsAppShareActionsProps) {
  const { showToast } = useToast();
  const target = resolveWhatsAppShareTarget(phoneNumber);
  const whatsappUrl = buildWaMeUrl({ phoneNumber, message });
  const textToCopy = copyText ?? message;

  function handleWhatsAppClick(event: React.MouseEvent<HTMLAnchorElement>) {
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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast({
        title: "Copied",
        description: "Message copied. You can paste it into WhatsApp or SMS.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Copy failed",
        description: "Could not copy to clipboard. Please copy manually.",
        tone: "error",
      });
    }
  }

  return (
    <div
      className={cn(
        compact ? "flex flex-wrap gap-2" : "grid gap-2 sm:grid-cols-2",
        className,
      )}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleWhatsAppClick}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          compact ? "w-auto" : "w-full",
        )}
      >
        <MessageCircle aria-hidden="true" size={16} strokeWidth={2.6} />
        <span>{whatsappLabel}</span>
      </a>

      <Button
        type="button"
        variant="secondary"
        fullWidth={!compact}
        onClick={() => {
          void handleCopy();
        }}
      >
        <Copy aria-hidden="true" size={16} strokeWidth={2.6} />
        {copyLabel}
      </Button>
    </div>
  );
}
