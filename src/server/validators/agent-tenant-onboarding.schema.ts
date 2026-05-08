import { z } from "zod";
import { phoneNumberSchema } from "@/server/validators/auth.schema";

export const createAgentTenantOnboardingLinkSchema = z.object({
  listingId: z.string().uuid(),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the tenant's full name.")
    .max(120, "Tenant name is too long."),
  phoneNumber: phoneNumberSchema,
  email: z
    .string()
    .trim()
    .email("Enter a valid tenant email address.")
    .optional()
    .or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateAgentTenantOnboardingLinkInput = z.infer<
  typeof createAgentTenantOnboardingLinkSchema
>;
