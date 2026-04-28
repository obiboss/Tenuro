import { AppError } from "@/server/errors/app-error";

export type NormalisedPhoneNumber = {
  e164: string;
  local: string;
  national: string;
};

export function normalisePhoneNumber(value: string): NormalisedPhoneNumber {
  const rawValue = value.trim();

  if (!rawValue) {
    throw new AppError("INVALID_PHONE", "Enter a valid phone number.", 400);
  }

  const digits = rawValue.replace(/\D/g, "");

  let localWithoutZero = "";

  if (digits.startsWith("234")) {
    localWithoutZero = digits.slice(3);
  } else if (digits.startsWith("0")) {
    localWithoutZero = digits.slice(1);
  } else {
    localWithoutZero = digits;
  }

  if (!/^[789][01]\d{8}$/.test(localWithoutZero)) {
    throw new AppError("INVALID_PHONE", "Enter a valid phone number.", 400);
  }

  return {
    e164: `+234${localWithoutZero}`,
    local: `0${localWithoutZero}`,
    national: `234${localWithoutZero}`,
  };
}

export function maskPhoneNumber(phoneNumber: string) {
  const normalised = normalisePhoneNumber(phoneNumber);
  const visibleStart = normalised.e164.slice(0, 7);
  const visibleEnd = normalised.e164.slice(-2);

  return `${visibleStart}****${visibleEnd}`;
}
