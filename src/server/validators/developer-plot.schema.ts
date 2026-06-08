import { z } from "zod";

export const developerPlotStatusSchema = z.enum([
  "available",
  "reserved",
  "active",
  "sold",
  "blocked",
]);

export const createDeveloperPlotTypeSchema = z.object({
  estateId: z.string().uuid("Estate is invalid."),
  typeName: z
    .string()
    .trim()
    .min(2, "Enter the plot type name.")
    .max(120, "Plot type name is too long."),
  sizeLabel: z
    .string()
    .trim()
    .min(1, "Enter the plot size.")
    .max(80, "Plot size is too long."),
  defaultPrice: z.coerce
    .number()
    .positive("Default price must be greater than zero.")
    .max(999_999_999_999, "Default price is too high."),
  description: z
    .string()
    .trim()
    .max(600, "Description is too long.")
    .optional()
    .transform((value) => value || ""),
});

export const createDeveloperPlotSchema = z.object({
  estateId: z.string().uuid("Estate is invalid."),
  plotTypeId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || ""),
  plotNumber: z
    .string()
    .trim()
    .min(1, "Enter the plot number.")
    .max(80, "Plot number is too long."),
  sizeLabel: z
    .string()
    .trim()
    .min(1, "Enter the plot size.")
    .max(80, "Plot size is too long."),
  price: z.coerce
    .number()
    .positive("Plot price must be greater than zero.")
    .max(999_999_999_999, "Plot price is too high."),
  status: developerPlotStatusSchema.default("available"),
  notes: z
    .string()
    .trim()
    .max(600, "Notes are too long.")
    .optional()
    .transform((value) => value || ""),
});

export type CreateDeveloperPlotTypeInput = z.infer<
  typeof createDeveloperPlotTypeSchema
>;

export type CreateDeveloperPlotInput = z.infer<
  typeof createDeveloperPlotSchema
>;
