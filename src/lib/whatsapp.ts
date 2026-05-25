import { tryNormalisePhoneNumber } from "@/lib/phone";

export function buildWaMeUrl(params: {
  phoneNumber?: string | null;
  message: string;
}) {
  const encodedMessage = encodeURIComponent(params.message);
  const recipient = tryNormalisePhoneNumber(params.phoneNumber);

  if (!recipient) {
    return `https://wa.me/?text=${encodedMessage}`;
  }

  return `https://wa.me/${recipient.national}?text=${encodedMessage}`;
}
