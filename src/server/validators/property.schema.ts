import { z } from "zod";

export const createPropertySchema = z.object({
  propertyName: z.string().trim().min(2, "Enter the property name.").max(120),
  address: z
    .string()
    .trim()
    .min(5, "Enter the full property address.")
    .max(300),
  state: z.string().trim().min(2, "Select the state.").max(80),
  lga: z.string().trim().min(2, "Select the LGA.").max(80),
  propertyType: z.enum(["residential", "mixed_use", "flat_complex"], {
    message: "Select the property type.",
  }),
  countryCode: z.string().length(2).default("NG"),
  currencyCode: z.string().length(3).default("NGN"),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
