import { AppError } from "@/server/errors/app-error";
import {
  maskPhoneNumber as maskPhoneNumberLib,
  normalisePhoneNumber as normalisePhoneNumberLib,
  type NormalisedPhoneNumber,
} from "@/lib/phone";

export type { NormalisedPhoneNumber };

export function normalisePhoneNumber(value: string): NormalisedPhoneNumber {
  try {
    return normalisePhoneNumberLib(value);
  } catch {
    throw new AppError("INVALID_PHONE", "Enter a valid phone number.", 400);
  }
}

export function maskPhoneNumber(phoneNumber: string) {
  return maskPhoneNumberLib(phoneNumber);
}
