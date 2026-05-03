import { z } from "zod";
import { uuidSchema } from "@/server/validators/common.schema";
import { passwordSchema } from "@/server/validators/auth.schema";

export const generateTenantActivationLinkSchema = z.object({
  tenantId: uuidSchema,
});

export const activateTenantAccountSchema = z
  .object({
    token: z.string().trim().min(20, "Activation token is invalid."),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type GenerateTenantActivationLinkInput = z.infer<
  typeof generateTenantActivationLinkSchema
>;

export type ActivateTenantAccountInput = z.infer<
  typeof activateTenantAccountSchema
>;
