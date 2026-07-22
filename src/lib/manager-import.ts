import { z } from "zod";
import {
  MANAGER_COLLECTION_MODES,
  MANAGER_MANAGEMENT_FEE_TYPES,
  MANAGER_PAYMENT_METHODS,
  MANAGER_PAYMENT_RECEIVERS,
  MANAGER_PAYSTACK_CHARGE_BEARERS,
} from "@/constants/manager";

const optionalText = z.string().trim().max(300).nullable();
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const managerImportRowSchema = z
  .object({
    rowNumber: z.number().int().min(2),
    landlordName: z.string().trim().min(2).max(180),
    landlordPhone: optionalText,
    landlordEmail: z.string().email().nullable(),
    landlordAddress: optionalText,
    propertyName: z.string().trim().min(2).max(180),
    propertyAddress: z.string().trim().min(3).max(300),
    city: optionalText,
    state: optionalText,
    lga: optionalText,
    collectionMode: z.enum(MANAGER_COLLECTION_MODES),
    managementFeeType: z.enum(MANAGER_MANAGEMENT_FEE_TYPES),
    managementFeeValue: z.number().finite().min(0),
    paystackChargeBearer: z.enum(MANAGER_PAYSTACK_CHARGE_BEARERS),
    paymentReceiver: z.enum(MANAGER_PAYMENT_RECEIVERS),
    unitLabel: z.string().trim().min(1).max(120),
    unitType: optionalText,
    rentAmount: z.number().finite().positive(),
    tenantName: optionalText,
    tenantPhone: optionalText,
    tenantEmail: z.string().email().nullable(),
    occupation: optionalText,
    moveInDate: optionalDate,
    nextRentDueDate: optionalDate,
    currentBalance: z.number().finite().min(0),
    lastPaymentAmount: z.number().finite().positive().nullable(),
    lastPaymentDate: optionalDate,
    paymentMethod: z.enum(MANAGER_PAYMENT_METHODS).nullable(),
    paymentReference: optionalText,
  })
  .superRefine((row, context) => {
    if (
      row.managementFeeType === "percentage" &&
      row.managementFeeValue > 100
    ) {
      context.addIssue({
        code: "custom",
        path: ["managementFeeValue"],
        message: "A percentage fee cannot be more than 100%.",
      });
    }

    if (row.tenantName) {
      if (!row.tenantPhone) {
        context.addIssue({
          code: "custom",
          path: ["tenantPhone"],
          message: "Add the tenant phone number.",
        });
      }

      if (!row.moveInDate) {
        context.addIssue({
          code: "custom",
          path: ["moveInDate"],
          message: "Add the tenancy start date.",
        });
      }

      if (!row.nextRentDueDate) {
        context.addIssue({
          code: "custom",
          path: ["nextRentDueDate"],
          message: "Add the next rent due date.",
        });
      }
    }

    if (
      row.lastPaymentAmount !== null ||
      row.lastPaymentDate !== null ||
      row.paymentMethod !== null ||
      row.paymentReference !== null
    ) {
      if (!row.tenantName) {
        context.addIssue({
          code: "custom",
          path: ["lastPaymentAmount"],
          message: "A payment must have a tenant on the same row.",
        });
      }

      if (row.lastPaymentAmount === null || !row.lastPaymentDate) {
        context.addIssue({
          code: "custom",
          path: ["lastPaymentAmount"],
          message: "Add both the last payment amount and date.",
        });
      }
    }
  });

export type ManagerImportRow = z.infer<typeof managerImportRowSchema>;

export type ManagerImportIssue = {
  rowNumber: number;
  message: string;
};

export type ManagerImportPreviewState = {
  ok: boolean;
  message: string;
  fileName?: string;
  rows?: ManagerImportRow[];
  issues?: ManagerImportIssue[];
};

export type ManagerImportResult = {
  ok: boolean;
  message: string;
  created: {
    landlords: number;
    properties: number;
    units: number;
    tenants: number;
    payments: number;
  };
  reused: number;
  skippedPayments: number;
  issues: ManagerImportIssue[];
};
