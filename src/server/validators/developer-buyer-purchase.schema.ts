import { z } from "zod";
import { phoneNumberSchema } from "@/server/validators/auth.schema";

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || "")
  .refine(
    (value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Enter a valid email address.",
  );

const optionalNameSchema = z
  .string()
  .trim()
  .max(140, "Name is too long.")
  .optional()
  .transform((value) => value || "");

export const startDeveloperBuyerPurchaseSchema = z.object({
  estateId: z.string().uuid("Estate is invalid."),
  plotId: z.string().uuid("Plot is invalid."),
  buyerPhone: phoneNumberSchema,
  buyerName: optionalNameSchema,
  buyerEmail: optionalEmailSchema,
  note: z
    .string()
    .trim()
    .max(600, "Note is too long.")
    .optional()
    .transform((value) => value || ""),
});

export const submitBuyerPurchaseDetailsSchema = z.object({
  token: z.string().trim().min(16, "Purchase link is invalid."),
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(140, "Full name is too long."),
  phoneNumber: phoneNumberSchema,
  email: optionalEmailSchema,
  nin: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "NIN must be 11 digits."),
  residentialAddress: z
    .string()
    .trim()
    .min(5, "Enter your address.")
    .max(260, "Address is too long."),
  nextOfKinName: z
    .string()
    .trim()
    .min(2, "Enter next of kin name.")
    .max(140, "Next of kin name is too long."),
  nextOfKinPhone: phoneNumberSchema,
});

export type StartDeveloperBuyerPurchaseInput = z.infer<
  typeof startDeveloperBuyerPurchaseSchema
>;

export type SubmitBuyerPurchaseDetailsInput = z.infer<
  typeof submitBuyerPurchaseDetailsSchema
>;
