import {
  addDays,
  addMonths,
  addYears,
  format,
  getDate,
  getMonth,
  isValid,
  parseISO,
  subDays,
} from "date-fns";

export type TenancyPaymentFrequency =
  | "annual"
  | "biannual"
  | "quarterly"
  | "monthly";

function parseDateInput(value: string) {
  const parsedDate = parseISO(value);

  if (!isValid(parsedDate)) {
    throw new Error("Invalid date value.");
  }

  return parsedDate;
}

export function getTodayDateInputValue() {
  return format(new Date(), "yyyy-MM-dd");
}

export function calculateTenancyEndDate(
  startDate: string,
  paymentFrequency: TenancyPaymentFrequency,
) {
  const parsedStartDate = parseDateInput(startDate);

  const nextPeriodStart =
    paymentFrequency === "annual"
      ? addYears(parsedStartDate, 1)
      : paymentFrequency === "biannual"
        ? addMonths(parsedStartDate, 6)
        : paymentFrequency === "quarterly"
          ? addMonths(parsedStartDate, 3)
          : addMonths(parsedStartDate, 1);

  return format(subDays(nextPeriodStart, 1), "yyyy-MM-dd");
}

export function calculateNextRentChargeDate(endDate: string) {
  return format(addDays(parseDateInput(endDate), 1), "yyyy-MM-dd");
}

export function getRentAnchorDay(startDate: string) {
  return getDate(parseDateInput(startDate));
}

export function getRentAnchorMonth(startDate: string) {
  return getMonth(parseDateInput(startDate)) + 1;
}

export function formatDisplayDate(value: string) {
  return format(parseDateInput(value), "dd/MM/yyyy");
}
