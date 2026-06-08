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
  })
  .refine((value) => isValidStateLgaPair(value.state, value.lga), {
    path: ["lga"],
    message: "Select a valid LGA for the selected state.",
  });

export type CreateDeveloperEstateInput = z.infer<
  typeof createDeveloperEstateSchema
>;
