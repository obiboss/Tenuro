import { z } from "zod";

export const createCaretakerInviteSchema = z.object({
  caretakerName: z.string().trim().min(2, "Enter the caretaker name."),
  caretakerPhone: z.string().trim().min(7, "Enter a valid phone number."),
  propertyIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one property."),
  note: z.string().trim().max(500).optional(),
});

export type CreateCaretakerInviteInput = z.infer<
  typeof createCaretakerInviteSchema
>;

export const acceptCaretakerInviteSignupSchema = z.object({
  token: z.string().trim().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
});

export type AcceptCaretakerInviteSignupInput = z.infer<
  typeof acceptCaretakerInviteSignupSchema
>;

export const acceptCaretakerInviteSchema = z.object({
  token: z.string().trim().min(1),
});

export type AcceptCaretakerInviteInput = z.infer<
  typeof acceptCaretakerInviteSchema
>;

export const revokeCaretakerAccessSchema = z.object({
  caretakerProfileId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
});

export type RevokeCaretakerAccessInput = z.infer<
  typeof revokeCaretakerAccessSchema
>;
