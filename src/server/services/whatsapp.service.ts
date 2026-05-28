import "server-only";

import { buildWaMeUrl } from "@/lib/whatsapp";

export function createPreparedWhatsappMessage(params: {
  phoneNumber: string | null;
  message: string;
}) {
  return {
    phoneNumber: params.phoneNumber,
    message: params.message,
    whatsappUrl: buildWaMeUrl({
      phoneNumber: params.phoneNumber,
      message: params.message,
    }),
  };
}
