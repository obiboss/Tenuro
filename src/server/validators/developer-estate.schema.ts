import { z } from "zod";
import { calculateLandCapacity } from "@/lib/developer/land-capacity";
import type { LandSizeUnit } from "@/lib/developer/land-capacity";
import { NIGERIA_STATES_LGAS } from "@/server/constants/nigeria-states-lgas";

const validStates = new Set(NIGERIA_STATES_LGAS.map((item) => item.state));

function isValidStateLgaPair(state: string, lga: string) {
  const match = NIGERIA_STATES_LGAS.find((item) => item.state === state);

  return Boolean(match?.lgas.includes(lga));
}

export const developerEstateStatusSchema = z.enum([
  "planning",
  "selling",
  "paused",
  "sold_out",
  "archived",
]);

export const estatePlotNumberingStyleSchema = z.enum([
  "numeric",
  "prefixed_numeric",
  "block_numeric",
]);

export const landSizeUnitSchema = z.enum(["sqm", "hectare", "acre"]);

export type EstatePlotNumberingStyle = z.infer<
  typeof estatePlotNumberingStyleSchema
>;

export const createDeveloperEstateSchema = z
  .object({
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
      .refine((value) => validStates.has(value), "Select a valid state."),
    lga: z.string().trim().min(1, "Select a valid LGA."),
    description: z
      .string()
      .trim()
      .max(600, "Description is too long.")
      .optional()
      .transform((value) => value || ""),
    status: developerEstateStatusSchema.default("planning"),
    initialPaymentPercentage: z.coerce
      .number()
      .positive("Initial payment percentage must be greater than zero.")
      .max(100, "Initial payment percentage cannot exceed 100%."),
    balanceSpreadMonths: z.coerce
      .number()
      .int("Balance spread must be a whole number.")
      .min(0, "Balance spread cannot be negative.")
      .max(120, "Balance spread is too long."),
    landSizeValue: z.coerce
      .number()
      .positive("Enter the total land size.")
      .max(999_999_999, "Land size is too high."),
    landSizeUnit: landSizeUnitSchema,
    reservedLandPercentage: z.coerce
      .number()
      .min(0, "Reserved land cannot be negative.")
      .max(95, "Reserved land is too high."),
    numberOfPlots: z.coerce
      .number()
      .int("Number of plots must be a whole number.")
      .min(1, "Enter at least one plot.")
      .max(500, "You can generate a maximum of 500 plots at once."),
    plotSizeSqm: z.coerce
      .number()
      .positive("Enter the size of each plot in sqm.")
      .max(999_999, "Plot size is too high."),
    pricePerPlot: z.coerce
      .number()
      .positive("Enter the selling price per plot.")
      .max(999_999_999_999, "Selling price is too high."),
    numberingStyle: estatePlotNumberingStyleSchema.default("numeric"),
    startingNumber: z.coerce
      .number()
      .int("Starting number must be a whole number.")
      .min(1, "Starting number must be at least 1.")
      .max(999_999, "Starting number is too high."),
    labelPrefix: z
      .string()
      .trim()
      .max(20, "Prefix is too long.")
      .optional()
      .transform((value) => value || ""),
    plotsPerBlock: z.coerce
      .number()
      .int("Plots per block must be a whole number.")
      .min(1, "Plots per block must be at least 1.")
      .max(100, "Plots per block is too high."),
    plotNote: z
      .string()
      .trim()
      .max(600, "Plot note is too long.")
      .optional()
      .transform((value) => value || ""),
  })
  .refine((value) => isValidStateLgaPair(value.state, value.lga), {
    path: ["lga"],
    message: "Select a valid LGA for the selected state.",
  })
  .refine(
    (value) =>
      value.initialPaymentPercentage >= 100 || value.balanceSpreadMonths >= 1,
    {
      path: ["balanceSpreadMonths"],
      message:
        "Enter how many months buyers have to pay the balance, or set initial payment to 100%.",
    },
  )
  .refine(
    (value) => {
      const capacity = calculateLandCapacity({
        landSizeValue: value.landSizeValue,
        landSizeUnit: value.landSizeUnit as LandSizeUnit,
        reservedLandPercentage: value.reservedLandPercentage,
        plotSizeSqm: value.plotSizeSqm,
      });

      return value.numberOfPlots <= capacity.maximumPlots;
    },
    {
      path: ["numberOfPlots"],
      message:
        "The number of plots is more than the usable land can carry. Reduce the plots, increase land size, or reduce reserved land.",
    },
  );

export type CreateDeveloperEstateInput = z.infer<
  typeof createDeveloperEstateSchema
>;
