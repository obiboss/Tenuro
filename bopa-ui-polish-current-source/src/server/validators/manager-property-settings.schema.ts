import { z } from "zod";

function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
}

function moneyValue(value: unknown) {
  if (typeof value === "string") {
    return value.replace(/,/g, "").trim();
  }

  return value;
}

const uuidSchema = z.string().trim().uuid("Invalid record selected.");

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const booleanFromFormSchema = z.preprocess(
  (value) =>
    value === true ||
    value === "true" ||
    value === "on" ||
    value === "1",
  z.boolean(),
);

const positiveMoneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .positive("Amount must be greater than zero."),
);

export const managerPropertyChargeBearerSchema = z.enum([
  "tenant",
  "landlord",
]);

export const managerPropertyChargeBillingCycleSchema = z.enum([
  "one_time",
  "monthly",
  "quarterly",
  "biannual",
  "annual",
]);

const serviceChargeSchema = z
  .object({
    chargeCode: optionalTextSchema(80, "Charge code is too long."),
    chargeName: z
      .string()
      .trim()
      .min(1, "Enter the charge name.")
      .max(120, "Charge name is too long."),
    description: optionalTextSchema(
      500,
      "Charge description is too long.",
    ),
    amount: positiveMoneySchema,
    chargeBearer: managerPropertyChargeBearerSchema,
    billingCycle: managerPropertyChargeBillingCycleSchema,
    isRequiredBeforeMoveIn: booleanFromFormSchema,
  })
  .transform((charge) => ({
    ...charge,
    isRequiredBeforeMoveIn:
      charge.chargeBearer === "tenant"
        ? charge.isRequiredBeforeMoveIn
        : false,
  }));

export const saveManagerPropertyServiceChargesSchema = z
  .object({
    propertyId: uuidSchema,
    landlordClientId: uuidSchema,
    charges: z
      .array(serviceChargeSchema)
      .max(20, "A property cannot have more than 20 active charges."),
  })
  .superRefine((value, context) => {
    const seenNames = new Set<string>();

    value.charges.forEach((charge, index) => {
      const normalizedName = charge.chargeName.toLocaleLowerCase("en-NG");

      if (seenNames.has(normalizedName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["charges", index, "chargeName"],
          message: "Charge names must be unique.",
        });
      }

      seenNames.add(normalizedName);
    });
  });

export type ManagerPropertyChargeBearer = z.infer<
  typeof managerPropertyChargeBearerSchema
>;

export type ManagerPropertyChargeBillingCycle = z.infer<
  typeof managerPropertyChargeBillingCycleSchema
>;

export type SaveManagerPropertyServiceChargesInput = z.infer<
  typeof saveManagerPropertyServiceChargesSchema
>;
