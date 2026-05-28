import { z } from "zod";

export const notificationIdSchema = z.string().uuid();

export const preparedWhatsappMessageSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(30).nullable(),
  message: z.string().trim().min(1).max(2000),
});
