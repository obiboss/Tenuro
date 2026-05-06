import { AppError, isAppError } from "@/server/errors/app-error";
import { normalisePhoneNumber } from "@/server/utils/phone";

export type WhatsAppRecipient = {
  e164: string;
  local: string;
  national: string;
};

export function getRequiredWhatsAppRecipient(
  phoneNumber: string | null | undefined,
): WhatsAppRecipient {
  if (!phoneNumber?.trim()) {
    throw new AppError(
      "WHATSAPP_PHONE_REQUIRED",
      "A valid WhatsApp phone number is required.",
      400,
    );
  }

  try {
    return normalisePhoneNumber(phoneNumber);
  } catch (error) {
    if (isAppError(error)) {
      throw new AppError(
        "INVALID_WHATSAPP_PHONE",
        "Enter a valid Nigerian WhatsApp phone number.",
        400,
      );
    }

    throw error;
  }
}

export function getOptionalWhatsAppRecipient(
  phoneNumber: string | null | undefined,
): WhatsAppRecipient | null {
  if (!phoneNumber?.trim()) {
    return null;
  }

  try {
    return normalisePhoneNumber(phoneNumber);
  } catch {
    return null;
  }
}

export function buildWaMeUrl(params: {
  phoneNumber?: string | null;
  message: string;
}) {
  const encodedMessage = encodeURIComponent(params.message);
  const recipient = getOptionalWhatsAppRecipient(params.phoneNumber);

  if (!recipient) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${recipient.national}?text=${encodedMessage}`;
}
