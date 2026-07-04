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

export const managerStatementDocumentQuerySchema = z.object({
  landlordClientId: z.string().trim().uuid("Select a valid landlord."),
  dateFrom: optionalDateSchema,
  dateTo: optionalDateSchema,
});

export type ManagerStatementDocumentQueryInput = z.infer<
  typeof managerStatementDocumentQuerySchema
>;
