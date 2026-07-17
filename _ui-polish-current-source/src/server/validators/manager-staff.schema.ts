import { z } from "zod";

export const managerStaffRoleSchema = z.enum([
  "manager",
  "accountant",
  "property_officer",
  "maintenance_officer",
]);

export const createManagerStaffInviteSchema = z.object({
  staffName: z
    .string()
    .trim()
    .min(2, "Enter the staff name.")
    .max(120, "Staff name is too long."),
  staffEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  staffRole: managerStaffRoleSchema,
  note: z
    .string()
    .trim()
    .max(300, "Note is too long.")
    .optional()
    .or(z.literal("")),
});

export const acceptManagerStaffInviteSchema = z.object({
  token: z.string().trim().min(20, "Invite token is invalid."),
});

export type CreateManagerStaffInviteInput = z.infer<
  typeof createManagerStaffInviteSchema
>;
