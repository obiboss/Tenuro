import { z } from "zod";
import { DEVELOPER_STAFF_TITLES } from "@/constants/developer-staff-permissions";

export const developerStaffTitleSchema = z.enum(DEVELOPER_STAFF_TITLES);

export const createDeveloperStaffRoleLinkSchema = z.object({
  staffTitle: developerStaffTitleSchema,
});

export const acceptDeveloperStaffRoleLinkSchema = z
  .object({
    token: z.string().trim().min(20, "Staff onboarding link is invalid."),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Full name is too long."),
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Enter your phone number.")
      .max(30, "Phone number is too long."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .optional()
      .or(z.literal(""))
      .transform((value) => value || ""),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(72, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type CreateDeveloperStaffRoleLinkInput = z.infer<
  typeof createDeveloperStaffRoleLinkSchema
>;

export type AcceptDeveloperStaffRoleLinkInput = z.infer<
  typeof acceptDeveloperStaffRoleLinkSchema
>;
