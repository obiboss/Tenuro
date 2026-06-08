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

export const createDeveloperBuyerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter the buyer's full name.")
    .max(140, "Buyer name is too long."),
  phoneNumber: phoneNumberSchema,
  email: optionalEmailSchema,
  nin: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "NIN must be 11 digits."),
  nextOfKinName: z
    .string()
    .trim()
    .min(2, "Enter next of kin name.")
    .max(140, "Next of kin name is too long."),
  nextOfKinPhone: phoneNumberSchema,
  residentialAddress: z
    .string()
    .trim()
    .min(5, "Enter buyer residential address.")
    .max(260, "Residential address is too long."),
});

export const assignDeveloperBuyerToPlotSchema = z.object({
  buyerId: z.string().uuid("Buyer is invalid."),
  estateId: z.string().uuid("Estate is invalid."),
  plotId: z.string().uuid("Plot is invalid."),
  assignmentNote: z
    .string()
    .trim()
    .max(600, "Assignment note is too long.")
    .optional()
    .transform((value) => value || ""),
});

export type CreateDeveloperBuyerInput = z.infer<
  typeof createDeveloperBuyerSchema
>;

export type AssignDeveloperBuyerToPlotInput = z.infer<
  typeof assignDeveloperBuyerToPlotSchema
>;
