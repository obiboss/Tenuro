"use server";

import { preparedWhatsappMessageSchema } from "@/server/validators/notification.schema";
import { createPreparedWhatsappMessage } from "@/server/services/whatsapp.service";

export type PreparedWhatsappActionState = {
  ok: boolean;
  message: string;
  whatsappUrl?: string;
};

export async function prepareWhatsappMessageAction(
  formData: FormData,
): Promise<PreparedWhatsappActionState> {
  try {
    const parsed = preparedWhatsappMessageSchema.parse({
      phoneNumber: formData.get("phoneNumber") || null,
      message: formData.get("message"),
    });

    const prepared = createPreparedWhatsappMessage({
      phoneNumber: parsed.phoneNumber,
      message: parsed.message,
    });

    return {
      ok: true,
      message: "WhatsApp message prepared.",
      whatsappUrl: prepared.whatsappUrl,
    };
  } catch {
    return {
      ok: false,
      message: "Could not prepare WhatsApp message.",
    };
  }
}
