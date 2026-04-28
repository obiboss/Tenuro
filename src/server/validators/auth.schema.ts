import { z } from "zod";

const phoneNumberSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number.")
  .max(20, "Enter a valid phone number.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");

    if (digits.startsWith("234")) {
      const localNumber = digits.slice(3);
      return /^[789][01]\d{8}$/.test(localNumber);
    }

    if (digits.startsWith("0")) {
      const localNumber = digits.slice(1);
      return /^[789][01]\d{8}$/.test(localNumber);
    }

    return /^[789][01]\d{8}$/.test(digits);
  }, "Enter a valid phone number.");

export const requestOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  purpose: z.enum(["login", "register"]).default("login"),
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
  purpose: z.enum(["login", "register"]).default("login"),
});

export const registerLandlordSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long."),
  phoneNumber: phoneNumberSchema,
  otpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const emailPasswordLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const emailPasswordRegisterSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

/**
 * Backward-compatible aliases.
 * Keep these so older imports do not break if another file still uses OTP uppercase naming.
 */
export const requestOTPSchema = requestOtpSchema;
export const verifyOTPSchema = verifyOtpSchema;
export const magicLinkSchema = magicLinkRequestSchema;

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RegisterLandlordInput = z.infer<typeof registerLandlordSchema>;
export type EmailPasswordLoginInput = z.infer<typeof emailPasswordLoginSchema>;
export type EmailPasswordRegisterInput = z.infer<
  typeof emailPasswordRegisterSchema
>;
export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;

/**
 * Backward-compatible type aliases.
 */
export type RequestOTPInput = RequestOtpInput;
export type VerifyOTPInput = VerifyOtpInput;
export type MagicLinkInput = MagicLinkRequestInput;
