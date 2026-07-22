import {
  calculateAnchoredRentCycleDate,
  calculateCurrentRentCycle,
  calculateCurrentRentDueDate,
  calculateRentPeriod,
  getCurrentLagosDateOnly,
  getRentFrequencyMonths,
  type RentPaymentFrequency,
} from "@/lib/rent-cycle";

export type ExistingTenantPaymentFrequency = RentPaymentFrequency;

export type ExistingTenantPaymentRecord = {
  amount: number;
  paidAt: string;
  note?: string;
};

export function isCompleteExistingTenantPayment(
  payment: ExistingTenantPaymentRecord,
) {
  return Number(payment.amount) > 0 && payment.paidAt.trim().length > 0;
}

export type ExistingTenantRentCycle = {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  rentCharged: number;
  assumedPaid: boolean;
  payments: ExistingTenantPaymentRecord[];
};

export type ExistingTenantArrearsSummary = {
  arrearsStartDate: string;
  currentDueDate: string;
  totalRentDue: number;
  totalPaymentsCounted: number;
  amountOwed: number;
  monthsOwed: number;
  paymentsCounted: number;
  cycles: ExistingTenantRentCycle[];
  paymentHistory: ExistingTenantPaymentRecord[];
};

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function getFrequencyMonths(frequency: ExistingTenantPaymentFrequency) {
  return getRentFrequencyMonths(frequency);
}

function referenceDateOnly(today?: Date) {
  return getCurrentLagosDateOnly(today);
}

export function calculateCurrentDueDate(params: {
  moveInDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  today?: Date;
}) {
  return calculateCurrentRentDueDate({
    anchorDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    referenceDate: referenceDateOnly(params.today),
  });
}

export function calculateCurrentRentCycleStartDate(params: {
  tenancyStartDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  today?: Date;
}) {
  return calculateCurrentRentCycle({
    anchorDate: params.tenancyStartDate,
    paymentFrequency: params.paymentFrequency,
    referenceDate: referenceDateOnly(params.today),
  }).periodStart;
}

export function getDefaultArrearsStartDate(params: {
  moveInDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  today?: Date;
  activeYearCount?: number;
}) {
  const activeYearCount = params.activeYearCount ?? 2;
  const currentDueDate = calculateCurrentDueDate(params);
  const currentIndex = Math.max(
    1,
    calculateCurrentRentCycle({
      anchorDate: params.moveInDate,
      paymentFrequency: params.paymentFrequency,
      referenceDate: currentDueDate,
    }).cycleIndex,
  );
  const cyclesPerYear = 12 / getFrequencyMonths(params.paymentFrequency);
  const startIndex = Math.max(
    1,
    currentIndex - activeYearCount * cyclesPerYear,
  );

  return calculateAnchoredRentCycleDate({
    anchorDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    cycleIndex: startIndex,
  });
}

function formatCycleLabel(periodStart: string, periodEnd: string) {
  const start = new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(periodStart));
  const end = new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(periodEnd));

  return `${start} – ${end}`;
}

export function buildRentCycles(params: {
  moveInDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  savedCycles?: ExistingTenantRentCycle[];
  today?: Date;
}) {
  const today = referenceDateOnly(params.today);
  const savedByPeriod = new Map(
    (params.savedCycles ?? []).map((cycle) => [cycle.periodStart, cycle]),
  );
  const cycles: ExistingTenantRentCycle[] = [];

  for (let cycleIndex = 1; ; cycleIndex += 1) {
    const period = calculateRentPeriod({
      anchorDate: params.moveInDate,
      paymentFrequency: params.paymentFrequency,
      cycleIndex,
    });

    if (period.periodStart > today) {
      break;
    }

    const saved = savedByPeriod.get(period.periodStart);
    const assumedPaid = saved?.assumedPaid ?? true;

    cycles.push({
      id: period.periodStart,
      label: formatCycleLabel(period.periodStart, period.periodEnd),
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      rentCharged: assumedPaid ? 0 : Number(saved?.rentCharged ?? 0),
      assumedPaid,
      payments: assumedPaid ? [] : (saved?.payments ?? []),
    });
  }

  return cycles;
}

export function deriveArrearsStartDate(params: {
  moveInDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  cycles: ExistingTenantRentCycle[];
}) {
  const recordingCycles = params.cycles
    .filter((cycle) => !cycle.assumedPaid)
    .map((cycle) => cycle.periodStart)
    .sort();

  if (recordingCycles.length > 0) {
    return recordingCycles[0];
  }

  return calculateAnchoredRentCycleDate({
    anchorDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    cycleIndex: 1,
  });
}

export function hasMeaningfulCycleArrears(cycle: ExistingTenantRentCycle) {
  const hasRentCharged = Number(cycle.rentCharged) > 0;
  const hasPayments = cycle.payments.some(isCompleteExistingTenantPayment);

  return hasRentCharged || hasPayments;
}

export function normalizeRentCycleAfterEdit(
  cycle: ExistingTenantRentCycle,
): ExistingTenantRentCycle {
  if (cycle.assumedPaid) {
    return {
      ...cycle,
      rentCharged: 0,
      payments: [],
    };
  }

  if (!hasMeaningfulCycleArrears(cycle)) {
    return {
      ...cycle,
      assumedPaid: true,
      rentCharged: 0,
      payments: [],
    };
  }

  return cycle;
}

export function startRecordingCycleArrears(
  cycle: ExistingTenantRentCycle,
  defaultRentAmount: number,
): ExistingTenantRentCycle {
  return {
    ...cycle,
    assumedPaid: false,
    rentCharged: defaultRentAmount > 0 ? defaultRentAmount : 0,
    payments: [],
  };
}

function normalizePayments(
  payments: ExistingTenantPaymentRecord[],
): ExistingTenantPaymentRecord[] {
  return payments
    .map((payment) => ({
      amount: Number(payment.amount),
      paidAt: payment.paidAt,
      note: payment.note?.trim() ?? "",
    }))
    .filter(isCompleteExistingTenantPayment)
    .sort((firstPayment, secondPayment) =>
      firstPayment.paidAt.localeCompare(secondPayment.paidAt),
    );
}

function paymentBelongsToCycle(
  payment: ExistingTenantPaymentRecord,
  cycle: ExistingTenantRentCycle,
) {
  const paidAt = parseDateOnly(payment.paidAt).getTime();
  const periodStart = parseDateOnly(cycle.periodStart).getTime();
  const periodEnd = parseDateOnly(cycle.periodEnd).getTime();

  return paidAt >= periodStart && paidAt <= periodEnd;
}

export function getCycleBalance(cycle: ExistingTenantRentCycle) {
  const paymentsTotal = cycle.payments
    .filter(isCompleteExistingTenantPayment)
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  return Math.max(cycle.rentCharged - paymentsTotal, 0);
}

export type RentCycleStatus =
  "fully_paid" | "part_paid" | "not_paid" | "assumed_paid";

export function getCycleStatus(
  cycle: ExistingTenantRentCycle,
): RentCycleStatus {
  if (cycle.assumedPaid || !hasMeaningfulCycleArrears(cycle)) {
    return "assumed_paid";
  }

  const balance = getCycleBalance(cycle);
  const hasPayments = cycle.payments.some(isCompleteExistingTenantPayment);

  if (balance <= 0) {
    return "fully_paid";
  }

  if (hasPayments) {
    return "part_paid";
  }

  return "not_paid";
}

export function calculateArrearsFromCycles(params: {
  moveInDate: string;
  paymentFrequency: ExistingTenantPaymentFrequency;
  cycles: ExistingTenantRentCycle[];
  today?: Date;
}): ExistingTenantArrearsSummary {
  const today = params.today ?? new Date();
  const arrearsStartDate = deriveArrearsStartDate({
    moveInDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    cycles: params.cycles,
  });
  const activeCycles = params.cycles.filter((cycle) => !cycle.assumedPaid);
  const totalRentDue = activeCycles.reduce(
    (total, cycle) => total + Number(cycle.rentCharged || 0),
    0,
  );

  const paymentHistory = normalizePayments(
    activeCycles.flatMap((cycle) => cycle.payments),
  );

  const totalPaymentsCounted = paymentHistory.reduce(
    (total, payment) => total + payment.amount,
    0,
  );

  const amountOwed = Math.max(totalRentDue - totalPaymentsCounted, 0);
  const defaultRent =
    activeCycles[0]?.rentCharged ??
    params.cycles.find((cycle) => !cycle.assumedPaid)?.rentCharged ??
    0;

  const frequencyMonths = getFrequencyMonths(params.paymentFrequency);
  const monthsOwed =
    amountOwed <= 0 || defaultRent <= 0
      ? 0
      : Math.ceil((amountOwed / defaultRent) * frequencyMonths);

  return {
    arrearsStartDate,
    currentDueDate: calculateCurrentDueDate({
      moveInDate: params.moveInDate,
      paymentFrequency: params.paymentFrequency,
      today,
    }),
    totalRentDue,
    totalPaymentsCounted,
    amountOwed,
    monthsOwed,
    paymentsCounted: paymentHistory.length,
    cycles: params.cycles,
    paymentHistory,
  };
}

/** Flat rent schedule used when saving legacy/simple arrears payloads. */
export function calculateFlatArrears(params: {
  moveInDate: string;
  arrearsStartDate: string;
  rentAmount: number;
  paymentFrequency: ExistingTenantPaymentFrequency;
  paymentHistory: ExistingTenantPaymentRecord[];
  today?: Date;
}) {
  const cycles = buildRentCycles({
    moveInDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    today: params.today,
  }).map((cycle) => {
    const cyclePayments = params.paymentHistory.filter((payment) =>
      paymentBelongsToCycle(payment, cycle),
    );

    if (cyclePayments.length === 0) {
      return cycle;
    }

    return {
      ...cycle,
      assumedPaid: false,
      rentCharged: params.rentAmount,
      payments: cyclePayments,
    };
  });

  return calculateArrearsFromCycles({
    moveInDate: params.moveInDate,
    paymentFrequency: params.paymentFrequency,
    cycles,
    today: params.today,
  });
}
