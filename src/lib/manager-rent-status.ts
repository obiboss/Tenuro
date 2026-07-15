export const MANAGER_RENT_DUE_SOON_DAYS = 30;

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export type ManagerRentStatusTenant = {
  id: string;
  unit_id: string;
  status: string;
  rent_amount: number;
  current_balance: number;
  next_rent_due_date: string | null;
  move_out_date: string | null;
};

export type ManagerRentStatusUnit = {
  id: string;
  status: string;
};

export type ManagerTenantRentStatusKind =
  | "owing"
  | "due_soon"
  | "clear"
  | "none";

export type ManagerTenantCurrentEligibility = {
  isCurrentRentBearingTenant: boolean;
  isStoredCurrentTenant: boolean;
  hasAssignedUnit: boolean;
  hasRentAmount: boolean;
  hasNextRentDueDate: boolean;
  hasEndedTenancy: boolean;
};

export type ManagerTenantRentStatus = ManagerTenantCurrentEligibility & {
  kind: ManagerTenantRentStatusKind;
  label: string;
  daysFromToday: number | null;
  amountDue: number;
};

function formatNairaAmount(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}

function parseDateOnlyToUtcMs(value: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

export function getDateOnlyFromDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getCalendarDaysFromDateOnly(params: {
  targetDate: string | null;
  todayDate?: string;
}) {
  const targetTimestamp = parseDateOnlyToUtcMs(params.targetDate);
  const todayTimestamp = parseDateOnlyToUtcMs(
    params.todayDate ?? getDateOnlyFromDate(),
  );

  if (targetTimestamp === null || todayTimestamp === null) {
    return null;
  }

  return Math.round((targetTimestamp - todayTimestamp) / DAY_IN_MS);
}

export function getManagerTenantCurrentEligibility(params: {
  tenant: ManagerRentStatusTenant;
  unit?: ManagerRentStatusUnit | null;
}): ManagerTenantCurrentEligibility {
  const { tenant, unit } = params;
  const rentAmount = Number(tenant.rent_amount);
  const hasAssignedUnit = Boolean(unit && unit.id === tenant.unit_id);
  const hasRentAmount = Number.isFinite(rentAmount) && rentAmount > 0;
  const hasNextRentDueDate =
    parseDateOnlyToUtcMs(tenant.next_rent_due_date) !== null;
  const hasEndedTenancy =
    tenant.status === "moved_out" || Boolean(tenant.move_out_date);
  const isStoredCurrentTenant =
    tenant.status === "active" || tenant.status === "eviction_notice";
  const isCurrentRentBearingTenant = Boolean(
    hasAssignedUnit &&
      unit?.status !== "inactive" &&
      hasRentAmount &&
      hasNextRentDueDate &&
      !hasEndedTenancy &&
      isStoredCurrentTenant,
  );

  return {
    isCurrentRentBearingTenant,
    isStoredCurrentTenant,
    hasAssignedUnit,
    hasRentAmount,
    hasNextRentDueDate,
    hasEndedTenancy,
  };
}

export function getManagerTenantRentStatus(params: {
  tenant: ManagerRentStatusTenant;
  unit?: ManagerRentStatusUnit | null;
  todayDate?: string;
}): ManagerTenantRentStatus {
  const { tenant, unit, todayDate } = params;
  const eligibility = getManagerTenantCurrentEligibility({ tenant, unit });
  const rentAmount = Number(tenant.rent_amount);
  const currentBalance = Number(tenant.current_balance);
  const safeRentAmount = Number.isFinite(rentAmount) ? rentAmount : 0;
  const safeCurrentBalance = Number.isFinite(currentBalance)
    ? currentBalance
    : 0;
  const daysFromToday = getCalendarDaysFromDateOnly({
    targetDate: tenant.next_rent_due_date,
    todayDate,
  });
  const amountDue =
    safeCurrentBalance > 0 ? safeCurrentBalance : safeRentAmount;

  if (!eligibility.isCurrentRentBearingTenant) {
    return {
      ...eligibility,
      kind: "none",
      label: eligibility.isStoredCurrentTenant ? "No due date" : "",
      daysFromToday,
      amountDue: 0,
    };
  }

  if (safeCurrentBalance > 0) {
    return {
      ...eligibility,
      kind: "owing",
      label: `${formatNairaAmount(safeCurrentBalance)} owing`,
      daysFromToday,
      amountDue,
    };
  }

  if (daysFromToday !== null && daysFromToday < 0) {
    const overdueDays = Math.abs(daysFromToday);

    return {
      ...eligibility,
      kind: "owing",
      label: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
      daysFromToday,
      amountDue,
    };
  }

  if (
    daysFromToday !== null &&
    daysFromToday >= 0 &&
    daysFromToday <= MANAGER_RENT_DUE_SOON_DAYS
  ) {
    return {
      ...eligibility,
      kind: "due_soon",
      label:
        daysFromToday === 0
          ? "Due today"
          : `Due in ${daysFromToday} day${daysFromToday === 1 ? "" : "s"}`,
      daysFromToday,
      amountDue,
    };
  }

  return {
    ...eligibility,
    kind: "clear",
    label: "Paid up",
    daysFromToday,
    amountDue,
  };
}
