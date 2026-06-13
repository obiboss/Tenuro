import { z } from "zod";
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
  );

export type CreateDeveloperEstateInput = z.infer<
  typeof createDeveloperEstateSchema
>;
