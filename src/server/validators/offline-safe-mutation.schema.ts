import { z } from "zod";
import {
  MANAGER_MAINTENANCE_PRIORITIES,
  MANAGER_MAINTENANCE_STATUSES,
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
    managerPropertyUpdateSchema,
    managerTenantUpdateSchema,
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
