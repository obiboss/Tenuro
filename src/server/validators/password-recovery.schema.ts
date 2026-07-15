import { z } from "zod";
import {
  passwordSchema,
  phoneNumberSchema,
} from "@/server/validators/auth.schema";

export const managerForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export const phonePasswordRecoverySchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const recoveryOtpSchema = z.object({
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const passwordRecoveryUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export type ManagerForgotPasswordInput = z.infer<
  typeof managerForgotPasswordSchema
>;
export type PhonePasswordRecoveryInput = z.infer<
  typeof phonePasswordRecoverySchema
>;
export type RecoveryOtpInput = z.infer<typeof recoveryOtpSchema>;
export type PasswordRecoveryUpdateInput = z.infer<
  typeof passwordRecoveryUpdateSchema
>;
