import { tryNormalisePhoneNumber } from "@/lib/phone";

export type WhatsAppShareTarget =
  | { mode: "generic" }
  | { mode: "invalid" }
  | { mode: "direct"; national: string };

export function resolveWhatsAppShareTarget(
  phoneNumber?: string | null,
): WhatsAppShareTarget {
  const trimmed = phoneNumber?.trim();

  if (!trimmed) {
    return { mode: "generic" };
  }

  const recipient = tryNormalisePhoneNumber(trimmed);

  if (!recipient) {
    return { mode: "invalid" };
  }

  return {
    mode: "direct",
    national: recipient.national,
  };
}

export function buildWaMeUrl(params: {
  phoneNumber?: string | null;
  message: string;
}) {
  const encodedMessage = encodeURIComponent(params.message);
  const target = resolveWhatsAppShareTarget(params.phoneNumber);

  if (target.mode === "direct") {
    return `https://wa.me/${target.national}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}
