import { z } from "zod";
import {
  MANAGER_COLLECTION_MODES,
  MANAGER_MANAGEMENT_FEE_TYPES,
  MANAGER_PAYMENT_METHODS,
  MANAGER_PAYMENT_RECEIVERS,
  MANAGER_PAYSTACK_CHARGE_BEARERS,
  MANAGER_REMITTANCE_PAYMENT_METHODS,
} from "@/constants/manager";
import {
  propertyRuleAppliesToSchema,
  propertyRuleCategorySchema,
} from "@/server/validators/property-rule.schema";

function emptyStringToUndefined(value: unknown) {
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
    emptyStringToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const requiredTextSchema = (params: {
  min?: number;
  max: number;
  requiredMessage: string;
  maxMessage: string;
}) =>
  z
    .string()
    .trim()
    .min(params.min ?? 1, params.requiredMessage)
    .max(params.max, params.maxMessage);

const optionalEmailSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().email("Enter a valid email address.").optional(),
);

const optionalDateSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
);

const optionalUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .url("Enter a valid proof URL.")
    .max(1000, "Proof URL is too long.")
    .optional(),
);

const moneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .min(0, "Amount cannot be negative."),
);

const positiveMoneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .positive("Amount must be greater than zero."),
);

const optionalBooleanFromFormSchema = z.preprocess((value) => {
  return value === true || value === "true" || value === "on" || value === "1";
}, z.boolean());

const managerPropertyServiceChargeSchema = z.object({
  chargeCode: optionalTextSchema(80, "Service charge code is too long."),
  chargeName: requiredTextSchema({
    min: 1,
    max: 120,
    requiredMessage: "Enter the service charge name.",
    maxMessage: "Service charge name is too long.",
  }),
  description: optionalTextSchema(500, "Service charge description is too long."),
  amount: positiveMoneySchema,
  isRequiredBeforeMoveIn: z.boolean().default(true),
});

const managerPropertyRuleSchema = z.object({
  title: requiredTextSchema({
    min: 3,
    max: 180,
    requiredMessage: "Enter the rule title.",
    maxMessage: "Rule title is too long.",
  }),
  description: requiredTextSchema({
    min: 5,
    max: 1000,
    requiredMessage: "Enter the rule description.",
    maxMessage: "Rule description is too long.",
  }),
  category: propertyRuleCategorySchema.default("other"),
  appliesTo: propertyRuleAppliesToSchema.default("new_tenants"),
  requiresTenantAcknowledgement: z.boolean().default(true),
});

function assertUniqueServiceChargeNames(
  charges: Array<{ chargeName: string }>,
) {
  const seen = new Set<string>();

  for (const charge of charges) {
    const key = charge.chargeName.trim().toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
  }

  return true;
}

export const createManagerOrganizationSchema = z.object({
  organizationName: requiredTextSchema({
    min: 2,
    max: 180,
    requiredMessage: "Enter the organization name.",
    maxMessage: "Organization name is too long.",
  }),
  organizationPhone: optionalTextSchema(30, "Phone number is too long."),
  organizationEmail: optionalEmailSchema,
  rcNumber: optionalTextSchema(40, "RC number is too long."),
  officeAddress: optionalTextSchema(300, "Office address is too long."),
});

export const createManagerLandlordClientSchema = z.object({
  landlordName: requiredTextSchema({
    min: 2,
    max: 180,
    requiredMessage: "Enter the landlord name.",
    maxMessage: "Landlord name is too long.",
  }),
  landlordPhone: optionalTextSchema(30, "Phone number is too long."),
  landlordEmail: optionalEmailSchema,
  landlordAddress: optionalTextSchema(300, "Address is too long."),
  notes: optionalTextSchema(600, "Notes are too long."),
});

export const saveManagerLandlordPayoutProfileSchema = z.object({
  payoutProfileId: z.preprocess(emptyStringToUndefined, uuidSchema.optional()),
  landlordClientId: uuidSchema,
  paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
  receiverName: requiredTextSchema({
    min: 2,
    max: 180,
    requiredMessage: "Enter the receiver name.",
    maxMessage: "Receiver name is too long.",
  }),
  receiverPhone: optionalTextSchema(30, "Phone number is too long."),
  bankName: optionalTextSchema(120, "Bank name is too long."),
  bankCode: optionalTextSchema(30, "Bank code is too long."),
  accountNumber: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, "Enter a valid 10-digit account number.")
      .optional(),
  ),
  accountName: optionalTextSchema(180, "Account name is too long."),
  payoutNote: optionalTextSchema(600, "Payout note is too long."),
  isDefault: optionalBooleanFromFormSchema.default(true),
});

export const createManagerPropertySchema = z
  .object({
    landlordClientId: uuidSchema,
    propertyName: requiredTextSchema({
      min: 2,
      max: 180,
      requiredMessage: "Enter the property name.",
      maxMessage: "Property name is too long.",
    }),
    propertyAddress: requiredTextSchema({
      min: 3,
      max: 300,
      requiredMessage: "Enter the property address.",
      maxMessage: "Property address is too long.",
    }),
    city: optionalTextSchema(120, "City is too long."),
    state: optionalTextSchema(120, "State is too long."),
    lga: optionalTextSchema(120, "LGA is too long."),
    collectionMode: z.enum(MANAGER_COLLECTION_MODES),
    managementFeeType: z.enum(MANAGER_MANAGEMENT_FEE_TYPES),
    managementFeeValue: moneySchema,
    paystackChargeBearer: z.enum(MANAGER_PAYSTACK_CHARGE_BEARERS),
    paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
    hasExistingTenants: optionalBooleanFromFormSchema.default(false),
    serviceCharges: z.array(managerPropertyServiceChargeSchema).default([]),
    propertyRules: z.array(managerPropertyRuleSchema).default([]),
    notes: optionalTextSchema(600, "Notes are too long."),
  })
  .refine((value) => assertUniqueServiceChargeNames(value.serviceCharges), {
    path: ["serviceCharges"],
    message: "Service charge names must be unique.",
  })
  .refine(
    (value) =>
      value.managementFeeType !== "percentage" ||
      value.managementFeeValue <= 100,
    {
      path: ["managementFeeValue"],
      message: "Percentage fee cannot be more than 100%.",
    },
  );

export const createManagerUnitSchema = z.object({
  landlordClientId: uuidSchema,
  propertyId: uuidSchema,
  unitLabel: requiredTextSchema({
    min: 1,
    max: 120,
    requiredMessage: "Enter the unit label.",
    maxMessage: "Unit label is too long.",
  }),
  unitType: optionalTextSchema(80, "Unit type is too long."),
  rentAmount: moneySchema,
  notes: optionalTextSchema(600, "Notes are too long."),
});

export const completeManagerExistingTenantSetupSchema = z.object({
  propertyId: uuidSchema,
});

export const createManagerTenantSchema = z.object({
  landlordClientId: uuidSchema,
  propertyId: uuidSchema,
  unitId: uuidSchema,
  fullName: requiredTextSchema({
    min: 2,
    max: 180,
    requiredMessage: "Enter the tenant name.",
    maxMessage: "Tenant name is too long.",
  }),
  phoneNumber: requiredTextSchema({
    min: 7,
    max: 30,
    requiredMessage: "Enter the tenant phone number.",
    maxMessage: "Phone number is too long.",
  }),
  email: optionalEmailSchema,
  occupation: optionalTextSchema(120, "Occupation is too long."),
  rentAmount: moneySchema,
  currentBalance: moneySchema.default(0),
  moveInDate: optionalDateSchema,
  nextRentDueDate: optionalDateSchema,
  notes: optionalTextSchema(600, "Notes are too long."),
});

export const recordManagerRentPaymentSchema = z
  .object({
    landlordClientId: uuidSchema,
    propertyId: uuidSchema,
    unitId: uuidSchema,
    tenantId: uuidSchema,
    amountPaid: positiveMoneySchema,
    paymentMethod: z.enum(MANAGER_PAYMENT_METHODS),
    paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
    paymentReference: optionalTextSchema(160, "Payment reference is too long."),
    proofUrl: optionalUrlSchema,
    paymentDate: z
      .preprocess(
        emptyStringToUndefined,
        z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid payment date.")
          .optional(),
      )
      .default(new Date().toISOString().slice(0, 10)),
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
    notes: optionalTextSchema(600, "Notes are too long."),
  })
  .refine(
    (value) => {
      if (!value.periodStart || !value.periodEnd) {
        return true;
      }

      return value.periodEnd >= value.periodStart;
    },
    {
      path: ["periodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

export const recordManagerLandlordRemittanceSchema = z
  .object({
    landlordClientId: uuidSchema,
    payoutProfileId: z.preprocess(
      emptyStringToUndefined,
      uuidSchema.optional(),
    ),
    amountRemitted: positiveMoneySchema,
    remittanceDate: z
      .preprocess(
        emptyStringToUndefined,
        z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid remittance date.")
          .optional(),
      )
      .default(new Date().toISOString().slice(0, 10)),
    periodStart: optionalDateSchema,
    periodEnd: optionalDateSchema,
    paymentMethod: z.enum(MANAGER_REMITTANCE_PAYMENT_METHODS),
    paymentReference: optionalTextSchema(160, "Payment reference is too long."),
    proofUrl: optionalUrlSchema,
    notes: optionalTextSchema(600, "Notes are too long."),
  })
  .refine(
    (value) => {
      if (!value.periodStart || !value.periodEnd) {
        return true;
      }

      return value.periodEnd >= value.periodStart;
    },
    {
      path: ["periodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

export type CreateManagerOrganizationInput = z.infer<
  typeof createManagerOrganizationSchema
>;

export type CreateManagerLandlordClientInput = z.infer<
  typeof createManagerLandlordClientSchema
>;

export type SaveManagerLandlordPayoutProfileInput = z.infer<
  typeof saveManagerLandlordPayoutProfileSchema
>;

export type CreateManagerPropertyInput = z.infer<
  typeof createManagerPropertySchema
>;

export type CreateManagerUnitInput = z.infer<typeof createManagerUnitSchema>;

export type CompleteManagerExistingTenantSetupInput = z.infer<
  typeof completeManagerExistingTenantSetupSchema
>;

export type CreateManagerTenantInput = z.infer<
  typeof createManagerTenantSchema
>;

export type RecordManagerRentPaymentInput = z.infer<
  typeof recordManagerRentPaymentSchema
>;

export type RecordManagerLandlordRemittanceInput = z.infer<
  typeof recordManagerLandlordRemittanceSchema
>;
