export const MANAGER_COLLECTION_MODES = [
  "automatic_split",
  "manager_collects",
  "landlord_direct",
] as const;

export type ManagerCollectionMode = (typeof MANAGER_COLLECTION_MODES)[number];

export const MANAGER_MANAGEMENT_FEE_TYPES = ["percentage", "flat"] as const;

export type ManagerManagementFeeType =
  (typeof MANAGER_MANAGEMENT_FEE_TYPES)[number];

export const MANAGER_PAYSTACK_CHARGE_BEARERS = [
  "tenant",
  "landlord",
  "manager",
  "bopa",
] as const;

export type ManagerPaystackChargeBearer =
  (typeof MANAGER_PAYSTACK_CHARGE_BEARERS)[number];

export const MANAGER_PAYMENT_RECEIVERS = [
  "landlord",
  "manager",
  "bopa_verified",
  "other",
] as const;

export type ManagerPaymentReceiver = (typeof MANAGER_PAYMENT_RECEIVERS)[number];

export const MANAGER_RENT_PAYMENT_STATUSES = [
  "recorded",
  "pending_confirmation",
  "verified",
  "rejected",
  "reversed",
] as const;

export type ManagerRentPaymentStatus =
  (typeof MANAGER_RENT_PAYMENT_STATUSES)[number];

export const MANAGER_REMITTANCE_STATUSES = [
  "recorded",
  "pending_confirmation",
  "confirmed",
  "rejected",
  "reversed",
] as const;

export type ManagerRemittanceStatus =
  (typeof MANAGER_REMITTANCE_STATUSES)[number];

export const MANAGER_UNIT_STATUSES = [
  "vacant",
  "reserved",
  "occupied",
  "inactive",
] as const;

export type ManagerUnitStatus = (typeof MANAGER_UNIT_STATUSES)[number];

export const MANAGER_TENANT_STATUSES = [
  "active",
  "moved_out",
  "eviction_notice",
  "inactive",
] as const;

export type ManagerTenantStatus = (typeof MANAGER_TENANT_STATUSES)[number];

export const MANAGER_CURRENT_TENANT_STATUSES = [
  "active",
  "eviction_notice",
] as const satisfies readonly ManagerTenantStatus[];

export type ManagerCurrentTenantStatus =
  (typeof MANAGER_CURRENT_TENANT_STATUSES)[number];

export function isManagerCurrentTenantStatus(
  status: string,
): status is ManagerCurrentTenantStatus {
  return MANAGER_CURRENT_TENANT_STATUSES.some(
    (currentStatus) => currentStatus === status,
  );
}

export const MANAGER_PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "other",
] as const;

export type ManagerPaymentMethod = (typeof MANAGER_PAYMENT_METHODS)[number];

export const MANAGER_REMITTANCE_PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "cheque",
  "other",
] as const;

export type ManagerRemittancePaymentMethod =
  (typeof MANAGER_REMITTANCE_PAYMENT_METHODS)[number];

export const MANAGER_MAINTENANCE_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type ManagerMaintenancePriority =
  (typeof MANAGER_MAINTENANCE_PRIORITIES)[number];

export const MANAGER_MAINTENANCE_STATUSES = [
  "reported",
  "in_progress",
  "resolved",
  "cancelled",
] as const;

export type ManagerMaintenanceStatus =
  (typeof MANAGER_MAINTENANCE_STATUSES)[number];

export const MANAGER_COLLECTION_MODE_LABELS: Record<
  ManagerCollectionMode,
  string
> = {
  automatic_split: "Automatic split",
  manager_collects: "Manager collects",
  landlord_direct: "Landlord direct",
};

export const MANAGER_MANAGEMENT_FEE_TYPE_LABELS: Record<
  ManagerManagementFeeType,
  string
> = {
  percentage: "Percentage",
  flat: "Flat fee",
};

export const MANAGER_PAYSTACK_CHARGE_BEARER_LABELS: Record<
  ManagerPaystackChargeBearer,
  string
> = {
  tenant: "Tenant",
  landlord: "Landlord",
  manager: "Manager",
  bopa: "BOPA",
};

export const MANAGER_PAYMENT_RECEIVER_LABELS: Record<
  ManagerPaymentReceiver,
  string
> = {
  landlord: "Landlord",
  manager: "Manager",
  bopa_verified: "BOPA verified",
  other: "Other",
};

export const MANAGER_RENT_PAYMENT_STATUS_LABELS: Record<
  ManagerRentPaymentStatus,
  string
> = {
  recorded: "Recorded",
  pending_confirmation: "Pending confirmation",
  verified: "Verified",
  rejected: "Rejected",
  reversed: "Reversed",
};

export const MANAGER_REMITTANCE_STATUS_LABELS: Record<
  ManagerRemittanceStatus,
  string
> = {
  recorded: "Recorded",
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  rejected: "Rejected",
  reversed: "Reversed",
};

export const MANAGER_UNIT_STATUS_LABELS: Record<ManagerUnitStatus, string> = {
  vacant: "Vacant",
  reserved: "Reserved",
  occupied: "Occupied",
  inactive: "Inactive",
};

export const MANAGER_TENANT_STATUS_LABELS: Record<ManagerTenantStatus, string> =
  {
    active: "Current",
    moved_out: "Moved out",
    eviction_notice: "Notice served",
    inactive: "Inactive",
  };

export const MANAGER_PAYMENT_METHOD_LABELS: Record<
  ManagerPaymentMethod,
  string
> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  other: "Other",
};

export const MANAGER_REMITTANCE_PAYMENT_METHOD_LABELS: Record<
  ManagerRemittancePaymentMethod,
  string
> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  other: "Other",
};

export const MANAGER_MAINTENANCE_PRIORITY_LABELS: Record<
  ManagerMaintenancePriority,
  string
> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const MANAGER_MAINTENANCE_STATUS_LABELS: Record<
  ManagerMaintenanceStatus,
  string
> = {
  reported: "Reported",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

export function isManagerCollectionMode(
  value: string,
): value is ManagerCollectionMode {
  return MANAGER_COLLECTION_MODES.includes(value as ManagerCollectionMode);
}

export function isManagerManagementFeeType(
  value: string,
): value is ManagerManagementFeeType {
  return MANAGER_MANAGEMENT_FEE_TYPES.includes(
    value as ManagerManagementFeeType,
  );
}

export function isManagerPaystackChargeBearer(
  value: string,
): value is ManagerPaystackChargeBearer {
  return MANAGER_PAYSTACK_CHARGE_BEARERS.includes(
    value as ManagerPaystackChargeBearer,
  );
}

export function isManagerPaymentReceiver(
  value: string,
): value is ManagerPaymentReceiver {
  return MANAGER_PAYMENT_RECEIVERS.includes(value as ManagerPaymentReceiver);
}

export function isManagerUnitStatus(value: string): value is ManagerUnitStatus {
  return MANAGER_UNIT_STATUSES.includes(value as ManagerUnitStatus);
}
