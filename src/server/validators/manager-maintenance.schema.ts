import { z } from "zod";
import {
  MANAGER_MAINTENANCE_PRIORITIES,
  MANAGER_MAINTENANCE_STATUSES,
} from "@/constants/manager";

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

const optionalUuidSchema = z.preprocess(
  emptyStringToUndefined,
  uuidSchema.optional(),
);

const optionalTextSchema = (max: number, message: string) =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().trim().max(max, message).optional(),
  );

const optionalDateSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .optional(),
);

const moneySchema = z.preprocess(
  moneyValue,
  z.coerce
    .number()
    .finite("Enter a valid amount.")
    .min(0, "Amount cannot be negative."),
);

export const createManagerMaintenanceRequestSchema = z
  .object({
    landlordClientId: uuidSchema,
    propertyId: uuidSchema,
    unitId: optionalUuidSchema,
    tenantId: optionalUuidSchema,
    issueTitle: z
      .string()
      .trim()
      .min(2, "Enter the repair issue.")
      .max(180, "Repair issue is too long."),
    issueDescription: optionalTextSchema(
      1200,
      "Issue description is too long.",
    ),
    priority: z.enum(MANAGER_MAINTENANCE_PRIORITIES).default("medium"),
    status: z.enum(MANAGER_MAINTENANCE_STATUSES).default("reported"),
    estimatedCost: moneySchema.default(0),
    actualCost: moneySchema.default(0),
    vendorName: optionalTextSchema(180, "Vendor name is too long."),
    reportedDate: z
      .preprocess(
        emptyStringToUndefined,
        z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid reported date.")
          .optional(),
      )
      .default(new Date().toISOString().slice(0, 10)),
    resolvedDate: optionalDateSchema,
    notes: optionalTextSchema(800, "Notes are too long."),
  })
  .refine(
    (value) => {
      if (!value.resolvedDate) {
        return true;
      }

      return value.resolvedDate >= value.reportedDate;
    },
    {
      path: ["resolvedDate"],
      message: "Resolved date cannot be before reported date.",
    },
  )
  .refine(
    (value) => {
      if (value.status !== "resolved") {
        return true;
      }

      return Boolean(value.resolvedDate);
    },
    {
      path: ["resolvedDate"],
      message: "Set a resolved date when the repair is resolved.",
    },
  );

export type CreateManagerMaintenanceRequestInput = z.infer<
  typeof createManagerMaintenanceRequestSchema
>;
