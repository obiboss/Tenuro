import { z } from "zod";
import { moneySchema, uuidSchema } from "./common.schema";

export const createUnitSchema = z.object({
  propertyId: uuidSchema,
  buildingName: z.string().trim().max(100).optional().or(z.literal("")),
  unitIdentifier: z.string().trim().min(1, "Enter the unit name.").max(80),
  unitType: z.enum(
    [
      "single_room",
      "self_contain",
      "room_and_parlour",
      "mini_flat",
      "two_bedroom_flat",
      "three_bedroom_flat",
      "duplex",
      "shop",
      "office_space",
      "other",
    ],
    {
      message: "Select the unit type.",
    },
  ),
  bedrooms: z.coerce.number().int().min(0).default(0),
  bathrooms: z.coerce.number().int().min(0).default(0),
  monthlyRent: moneySchema.optional().nullable(),
  annualRent: moneySchema.optional().nullable(),
  currencyCode: z.string().length(3).default("NGN"),
});

export const updateUnitSchema = createUnitSchema
  .omit({ propertyId: true })
  .partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
