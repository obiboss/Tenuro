import { z } from "zod";

export const developerPlotStatusSchema = z.enum([
  "available",
  "reserved",
  "active",
  "sold",
  "blocked",
]);

export const bulkDeveloperPlotNumberingStyleSchema = z.enum([
  "numeric",
  "prefixed_numeric",
  "block_numeric",
]);

export const createDeveloperPlotTypeSchema = z.object({
  estateId: z.string().uuid("Estate is invalid."),
  typeName: z
    .string()
    .trim()
    .min(2, "Enter the plot kind name.")
    .max(120, "Plot kind name is too long."),
  sizeLabel: z
    .string()
    .trim()
    .min(1, "Enter the plot size.")
    .max(80, "Plot size is too long."),
  defaultPrice: z.coerce
    .number()
    .positive("Selling price must be greater than zero.")
    .max(999_999_999_999, "Selling price is too high."),
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

export const createBulkDeveloperPlotsSchema = z.object({
  estateId: z.string().uuid("Estate is invalid."),
  landSize: z
    .string()
    .trim()
    .min(1, "Enter the total land size.")
    .max(80, "Land size is too long."),
  numberOfPlots: z.coerce
    .number()
    .int("Number of plots must be a whole number.")
    .min(1, "Enter at least one plot.")
    .max(500, "You can generate up to 500 plots at once."),
  plotSizeLabel: z
    .string()
    .trim()
    .min(1, "Enter the size of each plot.")
    .max(80, "Plot size is too long."),
  numberingStyle: bulkDeveloperPlotNumberingStyleSchema.default("numeric"),
  startingNumber: z.coerce
    .number()
    .int("Starting number must be a whole number.")
    .min(1, "Starting number must be at least 1.")
    .max(999_999, "Starting number is too high."),
  labelPrefix: z
    .string()
    .trim()
    .max(12, "Prefix is too long.")
    .optional()
    .transform((value) => value || ""),
  plotsPerBlock: z.coerce
    .number()
    .int("Plots per block must be a whole number.")
    .min(1, "Plots per block must be at least 1.")
    .max(100, "Plots per block cannot exceed 100."),
  pricePerPlot: z.coerce
    .number()
    .positive("Price per plot must be greater than zero.")
    .max(999_999_999_999, "Price per plot is too high."),
  note: z
    .string()
    .trim()
    .max(600, "Note is too long.")
    .optional()
    .transform((value) => value || ""),
});

export type CreateDeveloperPlotTypeInput = z.infer<
  typeof createDeveloperPlotTypeSchema
>;

export type CreateDeveloperPlotInput = z.infer<
  typeof createDeveloperPlotSchema
>;

export type CreateBulkDeveloperPlotsInput = z.infer<
  typeof createBulkDeveloperPlotsSchema
>;

export type BulkDeveloperPlotNumberingStyle = z.infer<
  typeof bulkDeveloperPlotNumberingStyleSchema
>;
