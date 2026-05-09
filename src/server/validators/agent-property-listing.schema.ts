import { z } from "zod";
import { phoneNumberSchema } from "@/server/validators/auth.schema";
import { positiveMoneySchema } from "@/server/validators/common.schema";

const optionalMoneySchema = z.union([positiveMoneySchema, z.null()]).optional();

const optionalNonNegativeMoneySchema = z
  .union([z.coerce.number().min(0), z.null()])
  .optional();

export const agentPropertyListingSchema = z
  .object({
    landlordFullName: z
      .string()
      .trim()
      .min(2, "Enter the landlord's full name.")
      .max(120, "Landlord name is too long."),
    landlordPhoneNumber: phoneNumberSchema,
    landlordEmail: z
      .string()
      .trim()
      .email("Enter a valid landlord email address.")
      .optional()
      .or(z.literal("")),

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

    buildingName: z.string().trim().max(120).optional().or(z.literal("")),
    unitIdentifier: z.string().trim().min(1, "Enter the unit name.").max(80),
    unitType: z.enum([
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
    ]),
    bedrooms: z.coerce.number().int().min(0).max(20),
    bathrooms: z.coerce.number().int().min(0).max(20),
    annualRent: optionalMoneySchema,
    monthlyRent: optionalMoneySchema,

    agentCommissionAmount: optionalNonNegativeMoneySchema,
    agentCommissionNote: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("")),

    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((value) => value.annualRent || value.monthlyRent, {
    path: ["annualRent"],
    message: "Enter annual rent or monthly rent.",
  });

export type AgentPropertyListingInput = z.infer<
  typeof agentPropertyListingSchema
>;
