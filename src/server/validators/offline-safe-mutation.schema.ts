import { z } from "zod";
import { RENT_PAYMENT_FREQUENCIES } from "@/lib/rent-cycle";
import {
  MANAGER_COLLECTION_MODES,
  MANAGER_MAINTENANCE_PRIORITIES,
  MANAGER_MAINTENANCE_STATUSES,
  MANAGER_MANAGEMENT_FEE_TYPES,
  MANAGER_PAYMENT_METHODS,
  MANAGER_PAYMENT_RECEIVERS,
  MANAGER_PAYSTACK_CHARGE_BEARERS,
} from "@/constants/manager";

const uuidSchema = z
  .string()
  .trim()
  .uuid("Invalid offline record.");

const nullableUuidSchema = z
  .union([uuidSchema, z.null()])
  .default(null);

const nullableText = (
  max: number,
  message: string,
) =>
  z
    .union([
      z.string().trim().max(max, message),
      z.null(),
    ])
    .transform((value) => {
      if (value === null) {
        return null;
      }

      return value.length > 0 ? value : null;
    });

const optionalEmail = z
  .union([
    z
      .string()
      .trim()
      .email("Enter a valid email address."),
    z.literal(""),
    z.null(),
  ])
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value.toLowerCase();
  });

const nigeriaDate = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Enter a valid date.",
  );

const positiveMoney = z
  .number()
  .finite()
  .positive("Amount must be greater than zero.");

const nonNegativeMoney = z
  .number()
  .finite()
  .nonnegative("Amount cannot be negative.");

const updateBase = {
  clientMutationId: uuidSchema,
  workspaceId: uuidSchema,
  entityId: uuidSchema,
  operation: z.literal("update"),
  baseRevision: z
    .number()
    .int()
    .nonnegative(),
};

const managerMaintenanceCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("manager"),
    workspaceId: uuidSchema,
    entityType: z.literal(
      "manager_maintenance_request",
    ),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        landlordClientId: uuidSchema,
        propertyId: uuidSchema,
        unitId: nullableUuidSchema,
        tenantId: nullableUuidSchema,
        issueTitle: z
          .string()
          .trim()
          .min(2, "Enter the repair issue.")
          .max(180, "Repair issue is too long."),
        issueDescription: nullableText(
          1200,
          "Issue description is too long.",
        ),
        priority: z.enum(
          MANAGER_MAINTENANCE_PRIORITIES,
        ),
        estimatedCost: z
          .number()
          .finite()
          .positive(
            "Expected amount must be greater than zero.",
          ),
        vendorName: nullableText(
          180,
          "Vendor name is too long.",
        ),
        reportedDate: nigeriaDate,
        notes: nullableText(
          800,
          "Notes are too long.",
        ),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      !value.payload.tenantId ||
      Boolean(value.payload.unitId),
    {
      path: ["payload", "tenantId"],
      message:
        "Select the tenant unit before selecting the tenant.",
    },
  );

const managerMaintenanceUpdateSchema = z
  .object({
    ...updateBase,
    workspaceType: z.literal("manager"),
    entityType: z.literal(
      "manager_maintenance_request",
    ),
    payload: z
      .object({
        issueTitle: z
          .string()
          .trim()
          .min(2, "Enter the repair issue.")
          .max(180, "Repair issue is too long."),
        issueDescription: nullableText(
          1200,
          "Issue description is too long.",
        ),
        priority: z.enum(
          MANAGER_MAINTENANCE_PRIORITIES,
        ),
        status: z.enum(
          MANAGER_MAINTENANCE_STATUSES,
        ),
        estimatedCost: z
          .number()
          .finite()
          .positive(
            "Expected amount must be greater than zero.",
          ),
        vendorName: nullableText(
          180,
          "Vendor name is too long.",
        ),
        reportedDate: nigeriaDate,
        resolvedDate: z
          .union([nigeriaDate, z.null()])
          .default(null),
        notes: nullableText(
          800,
          "Notes are too long.",
        ),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.payload.status !== "resolved" ||
      Boolean(value.payload.resolvedDate),
    {
      path: ["payload", "resolvedDate"],
      message:
        "Set a resolved date when the repair is resolved.",
    },
  )
  .refine(
    (value) =>
      !value.payload.resolvedDate ||
      value.payload.resolvedDate >=
        value.payload.reportedDate,
    {
      path: ["payload", "resolvedDate"],
      message:
        "Resolved date cannot be before reported date.",
    },
  );

const managerPropertyUpdateSchema = z
  .object({
    ...updateBase,
    workspaceType: z.literal("manager"),
    entityType: z.literal("manager_property"),
    payload: z
      .object({
        propertyName: z
          .string()
          .trim()
          .min(2, "Enter the property name.")
          .max(180, "Property name is too long."),
        propertyAddress: z
          .string()
          .trim()
          .min(3, "Enter the property address.")
          .max(280, "Property address is too long."),
        city: nullableText(
          100,
          "City is too long.",
        ),
        notes: nullableText(
          800,
          "Notes are too long.",
        ),
      })
      .strict(),
  })
  .strict();

const managerTenantUpdateSchema = z
  .object({
    ...updateBase,
    workspaceType: z.literal("manager"),
    entityType: z.literal("manager_tenant"),
    payload: z
      .object({
        fullName: z
          .string()
          .trim()
          .min(2, "Enter the tenant's full name.")
          .max(160, "Tenant name is too long."),
        phoneNumber: z
          .string()
          .trim()
          .min(7, "Enter a valid phone number.")
          .max(24, "Phone number is too long."),
        email: optionalEmail,
        occupation: nullableText(
          160,
          "Occupation is too long.",
        ),
        notes: nullableText(
          800,
          "Notes are too long.",
        ),
      })
      .strict(),
  })
  .strict();

const managerPropertyCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("manager"),
    workspaceId: uuidSchema,
    entityType: z.literal("manager_property"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        landlordClientId: uuidSchema,
        ownerMode: z.enum(["existing", "new"]),
        newLandlord: z
          .object({
            id: uuidSchema,
            landlordName: z.string().trim().min(2).max(180),
            landlordPhone: nullableText(30, "Phone number is too long.").default(null),
            landlordEmail: optionalEmail.default(null),
            landlordAddress: nullableText(300, "Address is too long.").default(null),
            notes: nullableText(600, "Notes are too long.").default(null),
          })
          .strict()
          .nullable(),
        propertyName: z.string().trim().min(2).max(180),
        propertyAddress: z.string().trim().min(3).max(300),
        city: nullableText(120, "City is too long.").default(null),
        state: nullableText(120, "State is too long.").default(null),
        lga: nullableText(120, "LGA is too long.").default(null),
        collectionMode: z.enum(MANAGER_COLLECTION_MODES),
        managementFeeType: z.enum(MANAGER_MANAGEMENT_FEE_TYPES),
        managementFeeValue: nonNegativeMoney,
        paystackChargeBearer: z.enum(MANAGER_PAYSTACK_CHARGE_BEARERS),
        paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
        hasExistingTenants: z.boolean(),
        serviceCharges: z
          .array(
            z
              .object({
                id: uuidSchema,
                chargeCode: nullableText(80, "Service charge code is too long.").default(null),
                chargeName: z.string().trim().min(1).max(120),
                description: nullableText(500, "Description is too long.").default(null),
                amount: positiveMoney,
                isRequiredBeforeMoveIn: z.boolean(),
              })
              .strict(),
          )
          .max(50),
        propertyRules: z
          .array(
            z
              .object({
                id: uuidSchema,
                title: z.string().trim().min(3).max(180),
                description: z.string().trim().min(5).max(1000),
                category: z.enum([
                  "occupancy",
                  "pets",
                  "payment",
                  "noise",
                  "business_use",
                  "maintenance",
                  "safety",
                  "documentation",
                  "other",
                ]),
                appliesTo: z.enum([
                  "all_tenants",
                  "new_tenants",
                  "renewing_tenants",
                ]),
                requiresTenantAcknowledgement: z.boolean(),
              })
              .strict(),
          )
          .max(50),
        notes: nullableText(600, "Notes are too long.").default(null),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      value.payload.managementFeeType !== "percentage" ||
      value.payload.managementFeeValue <= 100,
    {
      path: ["payload", "managementFeeValue"],
      message: "Percentage fee cannot be more than 100%.",
    },
  )
  .refine(
    (value) => {
      const names = value.payload.serviceCharges.map((charge) =>
        charge.chargeName.trim().toLowerCase(),
      );
      return new Set(names).size === names.length;
    },
    {
      path: ["payload", "serviceCharges"],
      message: "Service charge names must be unique.",
    },
  )
  .refine(
    (value) =>
      value.payload.ownerMode === "new"
        ? value.payload.newLandlord?.id === value.payload.landlordClientId
        : value.payload.newLandlord === null,
    {
      path: ["payload", "newLandlord"],
      message: "The landlord details do not match this property.",
    },
  );

const managerUnitCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("manager"),
    workspaceId: uuidSchema,
    entityType: z.literal("manager_unit"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        landlordClientId: uuidSchema,
        propertyId: uuidSchema,
        unitLabel: z.string().trim().min(1).max(120),
        unitType: nullableText(80, "Unit type is too long.").default(null),
        rentFrequency: z.enum(RENT_PAYMENT_FREQUENCIES),
        rentAmount: positiveMoney,
        notes: nullableText(600, "Notes are too long.").default(null),
      })
      .strict(),
  })
  .strict();

const managerTenantCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("manager"),
    workspaceId: uuidSchema,
    entityType: z.literal("manager_tenant"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        landlordClientId: uuidSchema,
        propertyId: uuidSchema,
        unitId: uuidSchema,
        fullName: z.string().trim().min(2).max(180),
        phoneNumber: z.string().trim().min(7).max(30),
        email: optionalEmail.default(null),
        occupation: nullableText(120, "Occupation is too long.").default(null),
        rentAmount: positiveMoney,
        paymentFrequency: z.enum(RENT_PAYMENT_FREQUENCIES),
        currentBalance: nonNegativeMoney,
        moveInDate: nigeriaDate,
        // Accepted for compatibility with queued mutations. The server ignores
        // this value and recalculates the due date from the unit and move-in anchor.
        nextRentDueDate: z.union([nigeriaDate, z.null()]).default(null),
        notes: nullableText(600, "Notes are too long.").default(null),
      })
      .strict(),
  })
  .strict();

const managerRentPaymentCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("manager"),
    workspaceId: uuidSchema,
    entityType: z.literal("manager_rent_payment"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        landlordClientId: uuidSchema,
        propertyId: uuidSchema,
        unitId: uuidSchema,
        tenantId: uuidSchema,
        amountPaid: positiveMoney,
        paymentMethod: z.enum(MANAGER_PAYMENT_METHODS),
        paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
        paymentReference: nullableText(160, "Reference is too long.").default(null),
        proofUrl: nullableText(1000, "Proof link is too long.").default(null),
        paymentDate: nigeriaDate,
        periodStart: z.union([nigeriaDate, z.null()]).default(null),
        periodEnd: z.union([nigeriaDate, z.null()]).default(null),
        notes: nullableText(600, "Notes are too long.").default(null),
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      !value.payload.periodStart ||
      !value.payload.periodEnd ||
      value.payload.periodEnd >= value.payload.periodStart,
    {
      path: ["payload", "periodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

const landlordPropertyCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("landlord"),
    workspaceId: uuidSchema,
    entityType: z.literal("landlord_property"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        propertyName: z.string().trim().min(2).max(120),
        address: z.string().trim().min(5).max(300),
        state: z.string().trim().min(2).max(80),
        lga: z.string().trim().min(2).max(80),
        propertyType: z.enum(["residential", "mixed_use", "flat_complex"]),
        countryCode: z.literal("NG"),
        currencyCode: z.literal("NGN"),
      })
      .strict(),
  })
  .strict();

const landlordUnitCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("landlord"),
    workspaceId: uuidSchema,
    entityType: z.literal("landlord_unit"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        propertyId: uuidSchema,
        buildingName: nullableText(100, "Building name is too long.").default(null),
        unitIdentifier: z.string().trim().min(1).max(80),
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
        bedrooms: z.number().int().nonnegative(),
        bathrooms: z.number().int().nonnegative(),
        rentFrequency: z.enum(RENT_PAYMENT_FREQUENCIES),
        rentAmount: positiveMoney,
        monthlyRent: z.union([nonNegativeMoney, z.null()]),
        annualRent: z.union([nonNegativeMoney, z.null()]),
        currencyCode: z.literal("NGN"),
      })
      .strict(),
  })
  .strict();

const landlordRentPaymentCreateSchema = z
  .object({
    clientMutationId: uuidSchema,
    workspaceType: z.literal("landlord"),
    workspaceId: uuidSchema,
    entityType: z.literal("landlord_rent_payment"),
    entityId: uuidSchema,
    operation: z.literal("create"),
    baseRevision: z.null(),
    payload: z
      .object({
        tenancyId: uuidSchema,
        amountPaid: positiveMoney,
        paymentMethod: z.enum(["bank_transfer", "cash", "other"]),
        paymentReference: nullableText(120, "Reference is too long.").default(null),
        paymentDate: z.string().datetime({ offset: true }),
        paymentForPeriodStart: z
          .union([z.string().datetime({ offset: true }), z.null()])
          .default(null),
        paymentForPeriodEnd: z
          .union([z.string().datetime({ offset: true }), z.null()])
          .default(null),
        notes: nullableText(1000, "Notes are too long.").default(null),
        idempotencyKey: uuidSchema,
      })
      .strict(),
  })
  .strict()
  .refine(
    (value) =>
      !value.payload.paymentForPeriodStart ||
      !value.payload.paymentForPeriodEnd ||
      value.payload.paymentForPeriodEnd >=
        value.payload.paymentForPeriodStart,
    {
      path: ["payload", "paymentForPeriodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

const developerEstateUpdateSchema = z
  .object({
    ...updateBase,
    workspaceType: z.literal("developer"),
    entityType: z.literal("developer_estate"),
    payload: z
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
        city: nullableText(
          80,
          "City is too long.",
        ),
        description: nullableText(
          600,
          "Description is too long.",
        ),
      })
      .strict(),
  })
  .strict();

const developerBuyerUpdateSchema = z
  .object({
    ...updateBase,
    workspaceType: z.literal("developer"),
    entityType: z.literal("developer_buyer"),
    payload: z
      .object({
        fullName: z
          .string()
          .trim()
          .min(2, "Enter the buyer's full name.")
          .max(140, "Buyer name is too long."),
        phoneNumber: z
          .string()
          .trim()
          .min(7, "Enter a valid phone number.")
          .max(24, "Phone number is too long."),
        email: optionalEmail,
      })
      .strict(),
  })
  .strict();

export const offlineSafeMutationSchema =
  z.union([
    managerMaintenanceCreateSchema,
    managerMaintenanceUpdateSchema,
    managerPropertyCreateSchema,
    managerPropertyUpdateSchema,
    managerUnitCreateSchema,
    managerTenantCreateSchema,
    managerTenantUpdateSchema,
    managerRentPaymentCreateSchema,
    landlordPropertyCreateSchema,
    landlordUnitCreateSchema,
    landlordRentPaymentCreateSchema,
    developerEstateUpdateSchema,
    developerBuyerUpdateSchema,
  ]);

export const offlineSafeMutationBatchSchema =
  z
    .object({
      mutations: z
        .array(offlineSafeMutationSchema)
        .min(
          1,
          "At least one offline change is required.",
        )
        .max(
          25,
          "A maximum of 25 offline changes can sync at once.",
        ),
    })
    .strict();

export type OfflineSafeMutationInput =
  z.infer<typeof offlineSafeMutationSchema>;
