import { z } from "zod";

export const managerDocumentShareTokenSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{43}$/,
    "This report link is invalid.",
  );
