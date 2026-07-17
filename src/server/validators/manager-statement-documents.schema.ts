import { z } from "zod";

function emptyStringToNull(value: unknown) {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }

  return value;
}

const optionalDateSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().date().nullable(),
);

const reportDateRangeSchema = z
  .object({
    dateFrom: optionalDateSchema,
    dateTo: optionalDateSchema,
  })
  .superRefine((value, context) => {
    if (
      value.dateFrom &&
      value.dateTo &&
      value.dateFrom > value.dateTo
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "The end date cannot be before the start date.",
      });
    }
  });

export const managerStatementDocumentQuerySchema =
  reportDateRangeSchema.extend({
    landlordClientId: z
      .string()
      .trim()
      .uuid("Select a valid landlord."),
  });

export const managerPropertyReportQuerySchema =
  reportDateRangeSchema.extend({
    propertyId: z
      .string()
      .trim()
      .uuid("Select a valid property."),
  });

export type ManagerStatementDocumentQueryInput = z.infer<
  typeof managerStatementDocumentQuerySchema
>;

export type ManagerPropertyReportQueryInput = z.infer<
  typeof managerPropertyReportQuerySchema
>;

export const managerStatementDocumentIdSchema = z
  .string()
  .trim()
  .uuid("Invalid report selected.");
