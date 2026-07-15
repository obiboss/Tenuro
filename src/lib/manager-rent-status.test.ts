import assert from "node:assert/strict";
import { MANAGER_CURRENT_TENANT_STATUSES } from "../constants/manager";
import {
  MANAGER_RENT_DUE_SOON_DAYS,
  getCalendarDaysFromDateOnly,
  getManagerTenantCurrentEligibility,
  getManagerTenantRentStatus,
  type ManagerRentStatusTenant,
  type ManagerRentStatusUnit,
} from "./manager-rent-status";

const occupiedUnit: ManagerRentStatusUnit = {
  id: "unit-1",
  status: "occupied",
};

function createTenant(
  overrides: Partial<ManagerRentStatusTenant> = {},
): ManagerRentStatusTenant {
  return {
    id: "tenant-1",
    unit_id: occupiedUnit.id,
    status: "active",
    rent_amount: 100_000,
    current_balance: 0,
    next_rent_due_date: "2026-07-21",
    move_out_date: null,
    ...overrides,
  };
}

assert.equal(MANAGER_RENT_DUE_SOON_DAYS, 30);
assert.deepEqual([...MANAGER_CURRENT_TENANT_STATUSES], [
  "active",
  "eviction_notice",
]);
const currentTenantStatuses = new Set<string>(MANAGER_CURRENT_TENANT_STATUSES);
assert.equal(currentTenantStatuses.has("inactive"), false);
assert.equal(currentTenantStatuses.has("moved_out"), false);
assert.equal(
  getCalendarDaysFromDateOnly({
    targetDate: "2026-07-21",
    todayDate: "2026-07-14",
  }),
  7,
);

const inactiveOccupiedTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    status: "inactive",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(inactiveOccupiedTenantStatus.isCurrentRentBearingTenant, false);
assert.equal(inactiveOccupiedTenantStatus.kind, "none");
assert.equal(inactiveOccupiedTenantStatus.label, "");

const reservedInactiveTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    status: "inactive",
  }),
  unit: {
    id: occupiedUnit.id,
    status: "reserved",
  },
  todayDate: "2026-07-14",
});

assert.equal(reservedInactiveTenantStatus.isCurrentRentBearingTenant, false);
assert.equal(reservedInactiveTenantStatus.kind, "none");

const movedOutTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    status: "moved_out",
    move_out_date: "2026-06-30",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(movedOutTenantStatus.isCurrentRentBearingTenant, false);
assert.equal(movedOutTenantStatus.kind, "none");

const evictionNoticeTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    status: "eviction_notice",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(evictionNoticeTenantStatus.isCurrentRentBearingTenant, true);
assert.equal(evictionNoticeTenantStatus.kind, "due_soon");
assert.equal(evictionNoticeTenantStatus.label, "Due in 7 days");

const dueTomorrowTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    next_rent_due_date: "2026-07-15",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(dueTomorrowTenantStatus.kind, "due_soon");
assert.equal(dueTomorrowTenantStatus.label, "Due in 1 day");

const dueTodayTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    next_rent_due_date: "2026-07-14",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(dueTodayTenantStatus.kind, "due_soon");
assert.equal(dueTodayTenantStatus.label, "Due today");

const paidUpTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    next_rent_due_date: "2026-08-20",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(paidUpTenantStatus.kind, "clear");
assert.equal(paidUpTenantStatus.label, "Paid up");

const owingTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    current_balance: 25_000,
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(owingTenantStatus.kind, "owing");
assert.equal(owingTenantStatus.label, "\u20a625,000 owing");

const activeTenantOnVacantUnitStatus = getManagerTenantRentStatus({
  tenant: createTenant(),
  unit: {
    id: occupiedUnit.id,
    status: "vacant",
  },
  todayDate: "2026-07-14",
});

assert.equal(activeTenantOnVacantUnitStatus.isCurrentRentBearingTenant, true);
assert.equal(activeTenantOnVacantUnitStatus.kind, "due_soon");

const missingDueDateEligibility = getManagerTenantCurrentEligibility({
  tenant: createTenant({
    next_rent_due_date: null,
  }),
  unit: occupiedUnit,
});

assert.equal(missingDueDateEligibility.isStoredCurrentTenant, true);
assert.equal(missingDueDateEligibility.hasNextRentDueDate, false);

const overdueTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    next_rent_due_date: "2026-07-13",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(overdueTenantStatus.kind, "owing");
assert.equal(overdueTenantStatus.label, "Overdue by 1 day");

const longOverdueTenantStatus = getManagerTenantRentStatus({
  tenant: createTenant({
    next_rent_due_date: "2026-07-10",
  }),
  unit: occupiedUnit,
  todayDate: "2026-07-14",
});

assert.equal(longOverdueTenantStatus.kind, "owing");
assert.equal(longOverdueTenantStatus.label, "Overdue by 4 days");
