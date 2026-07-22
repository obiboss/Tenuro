import { format, isValid, parseISO } from "date-fns";
import {
  calculateRentPeriod,
  getCurrentLagosDateOnly,
  getRentFrequencyMonths,
  type RentPaymentFrequency,
} from "@/lib/rent-cycle";

export type TenancyPaymentFrequency = RentPaymentFrequency;

function parseDateInput(value: string) {
  const parsedDate = parseISO(value);

  if (!isValid(parsedDate)) {
    throw new Error("Invalid date value.");
  }

  return parsedDate;
}

export function getTodayDateInputValue() {
  return getCurrentLagosDateOnly();
}

export function calculateTenancyEndDate(
  startDate: string,
  paymentFrequency: TenancyPaymentFrequency,
) {
  return calculateRentPeriod({
    anchorDate: startDate,
    paymentFrequency,
    cycleIndex: 0,
  }).periodEnd;
}

export function calculateNextRentChargeDate(endDate: string) {
  const date = parseDateInput(endDate);
  date.setDate(date.getDate() + 1);
  return format(date, "yyyy-MM-dd");
}

export function getRentAnchorDay(startDate: string) {
  return parseDateInput(startDate).getDate();
}

export function getRentAnchorMonth(startDate: string) {
  return parseDateInput(startDate).getMonth() + 1;
}

export function getPaymentFrequencyMonths(
  paymentFrequency: TenancyPaymentFrequency,
) {
  return getRentFrequencyMonths(paymentFrequency);
}

export function formatDisplayDate(value: string) {
  return format(parseDateInput(value), "dd/MM/yyyy");
}
