import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const moneySchema = z.coerce
  .number()
  .min(0, "Amount cannot be negative.")
  .max(999_999_999_999.99, "Amount is too large.");

export const positiveMoneySchema = z.coerce
  .number()
  .positive("Enter an amount greater than zero.")
  .max(999_999_999_999.99, "Amount is too large.");

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(20, "Phone number is too long.");

export const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+234[789][01]\d{8}$/, "Enter a valid Nigerian phone number.");

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .optional()
  .or(z.literal(""));

export const requiredEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");

export const dateSchema = z.coerce.date();

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const currencySchema = z.string().length(3).default("NGN");

export const countryCodeSchema = z.string().length(2).default("NG");

export const idempotencyKeySchema = z.string().uuid();

export const optionalTextSchema = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));
