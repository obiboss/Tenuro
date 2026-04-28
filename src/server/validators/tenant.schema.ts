import { z } from "zod";
import { optionalEmailSchema, phoneSchema, uuidSchema } from "./common.schema";

export const createTenantShellSchema = z.object({
  unitId: uuidSchema,
  fullName: z.string().trim().min(2, "Enter the tenant name.").max(120),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,
  landlordNotes: z.string().max(2000).optional(),
});

export const updateTenantSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the tenant name.")
    .max(120)
    .optional(),
  phoneNumber: phoneSchema.optional(),
  email: optionalEmailSchema,
  dateOfBirth: z.coerce.date().optional(),
  homeAddress: z.string().trim().max(300).optional(),
  occupation: z.string().trim().max(120).optional(),
  employer: z.string().trim().max(120).optional(),
  landlordNotes: z.string().max(2000).optional(),
});

export const rejectTenantSchema = z.object({
  reason: z.string().trim().min(3, "Enter the reason.").max(500),
});

export type CreateTenantShellInput = z.infer<typeof createTenantShellSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
