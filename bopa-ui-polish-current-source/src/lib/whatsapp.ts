import { tryNormalisePhoneNumber } from "@/lib/phone";

export type WhatsAppShareTarget =
  | { mode: "generic" }
  | { mode: "invalid" }
  | { mode: "direct"; phoneDigits: string };

function toWhatsAppPhoneDigits(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("234") && digits.length >= 13) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `234${digits}`;
  }

  return digits.length >= 11 ? digits : null;
}

export function resolveWhatsAppShareTarget(
  phoneNumber?: string | null,
): WhatsAppShareTarget {
  const trimmed = phoneNumber?.trim();

  if (!trimmed) {
    return { mode: "generic" };
  }

  const recipient = tryNormalisePhoneNumber(trimmed);

  if (!recipient) {
    const fallbackPhoneDigits = toWhatsAppPhoneDigits(trimmed);

    return fallbackPhoneDigits
      ? { mode: "direct", phoneDigits: fallbackPhoneDigits }
      : { mode: "invalid" };
  }

  const phoneDigits = toWhatsAppPhoneDigits(recipient.national);

  if (!phoneDigits) {
    return { mode: "invalid" };
  }

  return {
    mode: "direct",
    phoneDigits,
  };
}

export function buildWaMeUrl(params: {
  phoneNumber?: string | null;
  message: string;
}) {
  const encodedMessage = encodeURIComponent(params.message);
  const target = resolveWhatsAppShareTarget(params.phoneNumber);

  if (target.mode === "direct") {
    return `https://wa.me/${target.phoneDigits}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}
