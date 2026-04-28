import { ZodError } from "zod";
import { AppError, isAppError } from "./app-error";
import { ERROR_MESSAGES } from "./error-map";

export type ActionResult<T = unknown> =
  | {
      ok: true;
      message: string;
      data?: T;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

type DatabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const FALLBACK_ERROR_MESSAGE =
  "We could not complete this action. Please check the details and try again.";

const VALIDATION_ERROR_MESSAGE =
  "Some information is missing or incorrect. Please check the highlighted fields.";

const DATABASE_ERROR_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503":
    "This action could not be completed because a related record is missing.",
  "23502": "Some required information is missing.",
  "23514": "Some information does not meet the required rule.",
  "42501": "You do not have permission to perform this action.",
  PGRST116: "We could not find the record you are trying to access.",
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDatabaseLikeError(error: unknown): error is DatabaseLikeError {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    "code" in error ||
    "message" in error ||
    "details" in error ||
    "hint" in error
  );
}

function getFirstZodFieldMessage(error: ZodError) {
  const flattened = error.flatten();
  const fieldErrors = flattened.fieldErrors as Record<
    string,
    string[] | undefined
  >;

  for (const messages of Object.values(fieldErrors)) {
    const firstMessage = messages?.[0];

    if (hasText(firstMessage)) {
      return firstMessage;
    }
  }

  const formError = flattened.formErrors[0];

  if (hasText(formError)) {
    return formError;
  }

  return VALIDATION_ERROR_MESSAGE;
}

function getReadableDatabaseError(error: DatabaseLikeError) {
  if (hasText(error.code) && DATABASE_ERROR_MESSAGES[error.code]) {
    return DATABASE_ERROR_MESSAGES[error.code];
  }

  const rawMessage = [error.message, error.details, error.hint]
    .filter(hasText)
    .join(" ")
    .toLowerCase();

  if (!rawMessage) {
    return FALLBACK_ERROR_MESSAGE;
  }

  if (
    rawMessage.includes("duplicate key") ||
    rawMessage.includes("already exists") ||
    rawMessage.includes("unique constraint")
  ) {
    return "This record already exists.";
  }

  if (
    rawMessage.includes("foreign key") ||
    rawMessage.includes("violates foreign key constraint")
  ) {
    return "This action could not be completed because a related record is missing.";
  }

  if (
    rawMessage.includes("not-null constraint") ||
    rawMessage.includes("null value in column")
  ) {
    return "Some required information is missing.";
  }

  if (
    rawMessage.includes("check constraint") ||
    rawMessage.includes("violates check constraint")
  ) {
    return "Some information does not meet the required rule.";
  }

  if (
    rawMessage.includes("permission denied") ||
    rawMessage.includes("row-level security") ||
    rawMessage.includes("violates row-level security policy")
  ) {
    return "You do not have permission to perform this action.";
  }

  if (
    rawMessage.includes("invalid input syntax for type uuid") ||
    rawMessage.includes("invalid uuid")
  ) {
    return "The selected record is no longer valid. Please refresh the page and try again.";
  }

  if (
    rawMessage.includes("function") &&
    rawMessage.includes("does not exist")
  ) {
    return "A required database setup is missing. Please run the latest migration.";
  }

  if (rawMessage.includes("column") && rawMessage.includes("does not exist")) {
    return "A required database column is missing. Please run the latest migration.";
  }

  if (
    rawMessage.includes("relation") &&
    rawMessage.includes("does not exist")
  ) {
    return "A required database table is missing. Please run the latest migration.";
  }

  return FALLBACK_ERROR_MESSAGE;
}

export function successResult<T>(message: string, data?: T): ActionResult<T> {
  return {
    ok: true,
    message,
    data,
  };
}

export function errorResult(error: unknown): ActionResult {
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: getFirstZodFieldMessage(error),
      fieldErrors: error.flatten().fieldErrors,
    };
  }

  if (isAppError(error)) {
    return {
      ok: false,
      message: error.userMessage,
    };
  }

  if (isDatabaseLikeError(error)) {
    return {
      ok: false,
      message: getReadableDatabaseError(error),
    };
  }

  if (error instanceof Error && hasText(error.message)) {
    return {
      ok: false,
      message: FALLBACK_ERROR_MESSAGE,
    };
  }

  return {
    ok: false,
    message: ERROR_MESSAGES.SERVER_ERROR || FALLBACK_ERROR_MESSAGE,
  };
}

export function toAppError(
  code: keyof typeof ERROR_MESSAGES,
  status = 400,
): AppError {
  return new AppError(code, ERROR_MESSAGES[code], status);
}
