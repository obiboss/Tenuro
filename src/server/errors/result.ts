import { ZodError } from "zod";
import { ERROR_MESSAGES } from "./error-map";
import { AppError, isAppError } from "./app-error";

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
      message: ERROR_MESSAGES.VALIDATION_FAILED,
      fieldErrors: error.flatten().fieldErrors,
    };
  }

  if (isAppError(error)) {
    return {
      ok: false,
      message: error.userMessage,
    };
  }

  return {
    ok: false,
    message: ERROR_MESSAGES.SERVER_ERROR,
  };
}

export function toAppError(
  code: keyof typeof ERROR_MESSAGES,
  status = 400,
): AppError {
  return new AppError(code, ERROR_MESSAGES[code], status);
}
