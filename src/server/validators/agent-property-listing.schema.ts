import { z } from "zod";
import { phoneNumberSchema } from "@/server/validators/auth.schema";
import { RENT_PAYMENT_FREQUENCIES } from "@/lib/rent-cycle";
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
    rentFrequency: z.enum(RENT_PAYMENT_FREQUENCIES).optional(),
    rentAmount: optionalMoneySchema,
    // Legacy fields remain accepted for deployed agent forms. The resolved
    // output always contains one frequency and one matching amount.
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
  .transform((value, context) => {
    const annualRent = Number(value.annualRent ?? 0);
    const monthlyRent = Number(value.monthlyRent ?? 0);
    const explicitAmount = Number(value.rentAmount ?? 0);

    if (annualRent > 0 && monthlyRent > 0) {
      context.addIssue({
        code: "custom",
        path: ["rentAmount"],
        message: "Choose one rent frequency and enter one rent amount.",
      });
      return z.NEVER;
    }

    const rentFrequency =
      value.rentFrequency ?? (monthlyRent > 0 ? "monthly" : "annual");
    const legacyAmount = rentFrequency === "monthly" ? monthlyRent : annualRent;
    const rentAmount = explicitAmount > 0 ? explicitAmount : legacyAmount;

    if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
      context.addIssue({
        code: "custom",
        path: ["rentAmount"],
        message: "Enter the rent amount for this unit.",
      });
      return z.NEVER;
    }

    if (
      value.rentFrequency &&
      ((rentFrequency === "annual" && monthlyRent > 0 && annualRent <= 0) ||
        (rentFrequency === "monthly" && annualRent > 0 && monthlyRent <= 0))
    ) {
      context.addIssue({
        code: "custom",
        path: ["rentAmount"],
        message: "The rent amount must match the selected rent frequency.",
      });
      return z.NEVER;
    }

    return {
      ...value,
      rentFrequency,
      rentAmount,
      annualRent: rentFrequency === "annual" ? rentAmount : null,
      monthlyRent: rentFrequency === "monthly" ? rentAmount : null,
    };
  });

export type AgentPropertyListingInput = z.infer<
  typeof agentPropertyListingSchema
>;
