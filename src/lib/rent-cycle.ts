export const RENT_PAYMENT_FREQUENCIES = [
  "annual",
  "biannual",
  "quarterly",
  "monthly",
] as const;

export type RentPaymentFrequency =
  (typeof RENT_PAYMENT_FREQUENCIES)[number];

export const RENT_PAYMENT_FREQUENCY_LABELS: Record<
  RentPaymentFrequency,
  string
> = {
  annual: "Yearly",
  biannual: "Every 6 months",
  quarterly: "Every 3 months",
  monthly: "Monthly",
};

type DateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getCurrentLagosDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("The current Lagos date could not be calculated.");
  }

  return `${year}-${month}-${day}`;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function parseDateParts(value: string): DateParts {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error("Invalid date value.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const monthIndex = month - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > daysInMonth(year, monthIndex)
  ) {
    throw new Error("Invalid date value.");
  }

  return { year, monthIndex, day };
}

function formatDateParts(parts: DateParts) {
  const month = String(parts.monthIndex + 1).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${String(parts.year).padStart(4, "0")}-${month}-${day}`;
}

function toUtcDate(value: string) {
  const parts = parseDateParts(value);
  return new Date(Date.UTC(parts.year, parts.monthIndex, parts.day));
}

export function getRentFrequencyMonths(frequency: RentPaymentFrequency) {
  if (frequency === "monthly") {
    return 1;
  }

  if (frequency === "quarterly") {
    return 3;
  }

  if (frequency === "biannual") {
    return 6;
  }

  return 12;
}

/**
 * Calculates a cycle date directly from the original anchor. This deliberately
 * does not add months to a previously calculated date, so a 31 January anchor
 * produces 28/29 February, 31 March, 30 April, and 31 May without permanent
 * drift to the 28th.
 */
export function calculateAnchoredRentCycleDate(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  cycleIndex: number;
}) {
  if (!Number.isInteger(params.cycleIndex)) {
    throw new Error("Rent cycle index must be a whole number.");
  }

  const anchor = parseDateParts(params.anchorDate);
  const monthOffset =
    getRentFrequencyMonths(params.paymentFrequency) * params.cycleIndex;
  const absoluteMonth = anchor.year * 12 + anchor.monthIndex + monthOffset;
  const targetYear = Math.floor(absoluteMonth / 12);
  const targetMonthIndex = positiveModulo(absoluteMonth, 12);
  const targetDay = Math.min(
    anchor.day,
    daysInMonth(targetYear, targetMonthIndex),
  );

  return formatDateParts({
    year: targetYear,
    monthIndex: targetMonthIndex,
    day: targetDay,
  });
}

export function addDaysToDateOnly(value: string, days: number) {
  const date = toUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function compareDateOnly(first: string, second: string) {
  parseDateParts(first);
  parseDateParts(second);
  return first.localeCompare(second);
}

export function calculateRentCycleIndex(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  cycleDate: string;
}): number | null {
  const anchor = parseDateParts(params.anchorDate);
  const candidate = parseDateParts(params.cycleDate);
  const frequencyMonths = getRentFrequencyMonths(params.paymentFrequency);
  const monthDifference =
    (candidate.year - anchor.year) * 12 +
    (candidate.monthIndex - anchor.monthIndex);

  if (monthDifference < 0) {
    return null;
  }

  const estimatedIndex = Math.floor(monthDifference / frequencyMonths);

  for (
    let cycleIndex = Math.max(0, estimatedIndex - 1);
    cycleIndex <= estimatedIndex + 1;
    cycleIndex += 1
  ) {
    if (
      calculateAnchoredRentCycleDate({
        anchorDate: params.anchorDate,
        paymentFrequency: params.paymentFrequency,
        cycleIndex,
      }) === params.cycleDate
    ) {
      return cycleIndex;
    }
  }

  return null;
}

export function isAnchoredRentCycleDate(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  cycleDate: string;
}) {
  return calculateRentCycleIndex(params) !== null;
}

export function calculateRentPeriod(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  cycleIndex: number;
}) {
  const periodStart = calculateAnchoredRentCycleDate(params);
  const nextPeriodStart = calculateAnchoredRentCycleDate({
    ...params,
    cycleIndex: params.cycleIndex + 1,
  });

  return {
    cycleIndex: params.cycleIndex,
    periodStart,
    periodEnd: addDaysToDateOnly(nextPeriodStart, -1),
    nextRentDueDate: nextPeriodStart,
  };
}

export function calculateRentPeriodFromStart(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  periodStart: string;
}) {
  const cycleIndex = calculateRentCycleIndex({
    anchorDate: params.anchorDate,
    paymentFrequency: params.paymentFrequency,
    cycleDate: params.periodStart,
  });

  if (cycleIndex === null) {
    throw new Error(
      "The rent-cycle date does not match the original move-in date.",
    );
  }

  return calculateRentPeriod({
    anchorDate: params.anchorDate,
    paymentFrequency: params.paymentFrequency,
    cycleIndex,
  });
}

export function calculateCurrentRentCycle(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  referenceDate?: string;
}) {
  const referenceDate = params.referenceDate ?? getCurrentLagosDateOnly();
  const anchor = parseDateParts(params.anchorDate);
  const reference = parseDateParts(referenceDate);
  const frequencyMonths = getRentFrequencyMonths(params.paymentFrequency);
  const monthDifference =
    (reference.year - anchor.year) * 12 +
    (reference.monthIndex - anchor.monthIndex);

  let cycleIndex = Math.max(0, Math.floor(monthDifference / frequencyMonths));

  while (
    cycleIndex > 0 &&
    compareDateOnly(
      calculateAnchoredRentCycleDate({
        anchorDate: params.anchorDate,
        paymentFrequency: params.paymentFrequency,
        cycleIndex,
      }),
      referenceDate,
    ) > 0
  ) {
    cycleIndex -= 1;
  }

  while (
    compareDateOnly(
      calculateAnchoredRentCycleDate({
        anchorDate: params.anchorDate,
        paymentFrequency: params.paymentFrequency,
        cycleIndex: cycleIndex + 1,
      }),
      referenceDate,
    ) <= 0
  ) {
    cycleIndex += 1;
  }

  return calculateRentPeriod({
    anchorDate: params.anchorDate,
    paymentFrequency: params.paymentFrequency,
    cycleIndex,
  });
}

/** Returns the rent due date currently in force. Before the first renewal, it
 * returns the first due date rather than the move-in date. */
export function calculateCurrentRentDueDate(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  referenceDate?: string;
}) {
  const firstDueDate = calculateAnchoredRentCycleDate({
    anchorDate: params.anchorDate,
    paymentFrequency: params.paymentFrequency,
    cycleIndex: 1,
  });
  const referenceDate = params.referenceDate ?? getCurrentLagosDateOnly();

  if (compareDateOnly(referenceDate, firstDueDate) < 0) {
    return firstDueDate;
  }

  const currentCycle = calculateCurrentRentCycle({
    ...params,
    referenceDate,
  });

  return currentCycle.periodStart === params.anchorDate
    ? firstDueDate
    : currentCycle.periodStart;
}

/** Returns the first due date on or after the supplied reference date. */
export function calculateNextRentDueDate(params: {
  anchorDate: string;
  paymentFrequency: RentPaymentFrequency;
  referenceDate?: string;
}) {
  const referenceDate = params.referenceDate ?? getCurrentLagosDateOnly();
  const currentCycle = calculateCurrentRentCycle({
    ...params,
    referenceDate,
  });

  if (
    currentCycle.cycleIndex >= 1 &&
    currentCycle.periodStart === referenceDate
  ) {
    return currentCycle.periodStart;
  }

  return currentCycle.nextRentDueDate;
}
