import { z } from "zod";
import {
  RENT_PAYMENT_FREQUENCIES,
  type RentPaymentFrequency,
} from "@/lib/rent-cycle";
import { moneySchema, positiveMoneySchema, uuidSchema } from "./common.schema";

const unitFieldsSchema = z.object({
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
  rentFrequency: z.enum(RENT_PAYMENT_FREQUENCIES).optional(),
  rentAmount: positiveMoneySchema.optional().nullable(),
  // Kept temporarily for older agent/offline callers. New landlord forms use
  // rentFrequency + rentAmount only.
  monthlyRent: moneySchema.optional().nullable(),
  annualRent: moneySchema.optional().nullable(),
  currencyCode: z.string().length(3).default("NGN"),
});

type RawRentFields = {
  rentFrequency?: RentPaymentFrequency;
  rentAmount?: number | null;
  monthlyRent?: number | null;
  annualRent?: number | null;
};

function resolveRentConfiguration(
  value: RawRentFields,
  context: z.RefinementCtx,
  required: boolean,
) {
  const annualRent = Number(value.annualRent ?? 0);
  const monthlyRent = Number(value.monthlyRent ?? 0);
  const explicitAmount = Number(value.rentAmount ?? 0);
  const hasAnyRentField =
    value.rentFrequency !== undefined ||
    value.rentAmount !== undefined ||
    value.annualRent !== undefined ||
    value.monthlyRent !== undefined;

  if (!required && !hasAnyRentField) {
    return null;
  }

  if (annualRent > 0 && monthlyRent > 0) {
    context.addIssue({
      code: "custom",
      path: ["rentAmount"],
      message: "Choose one rent frequency and enter one rent amount.",
    });
    return null;
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
    return null;
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
    return null;
  }

  return {
    rentFrequency,
    rentAmount,
    annualRent: rentFrequency === "annual" ? rentAmount : null,
    monthlyRent: rentFrequency === "monthly" ? rentAmount : null,
  };
}

export const createUnitSchema = unitFieldsSchema.transform((value, context) => {
  const rent = resolveRentConfiguration(value, context, true);

  if (!rent) {
    return z.NEVER;
  }

  return {
    ...value,
    ...rent,
  };
});

const updateUnitFieldsSchema = unitFieldsSchema.omit({ propertyId: true }).partial();

export const updateUnitSchema = updateUnitFieldsSchema.transform(
  (value, context) => {
    const rent = resolveRentConfiguration(value, context, false);

    if (
      (value.rentFrequency !== undefined ||
        value.rentAmount !== undefined ||
        value.annualRent !== undefined ||
        value.monthlyRent !== undefined) &&
      !rent
    ) {
      return z.NEVER;
    }

    return rent ? { ...value, ...rent } : value;
  },
);

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
