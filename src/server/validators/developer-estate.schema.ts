import { z } from "zod";

export const developerEstateStatusSchema = z.enum([
  "planning",
  "selling",
  "paused",
  "sold_out",
  "archived",
]);

export const createDeveloperEstateSchema = z.object({
  estateName: z
    .string()
    .trim()
    .min(2, "Enter the estate name.")
    .max(160, "Estate name is too long."),
  location: z
    .string()
    .trim()
    .min(2, "Enter the estate location.")
    .max(240, "Location is too long."),
  city: z
    .string()
    .trim()
    .max(80, "City is too long.")
    .optional()
    .transform((value) => value || ""),
  state: z
    .string()
    .trim()
    .max(80, "State is too long.")
    .optional()
    .transform((value) => value || ""),
  description: z
    .string()
    .trim()
    .max(600, "Description is too long.")
    .optional()
    .transform((value) => value || ""),
  status: developerEstateStatusSchema.default("planning"),
});

export type CreateDeveloperEstateInput = z.infer<
  typeof createDeveloperEstateSchema
>;
