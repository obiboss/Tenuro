import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

export type ManagerOfflineSyncStatus = "waiting" | "review" | "synced";

export type ManagerOfflineRowMetadata = {
  offline_sync_status?: ManagerOfflineSyncStatus;
  offline_sync_error?: string | null;
  offline_client_mutation_id?: string;
  offline_landlord_name?: string | null;
  offline_synced_at?: string;
};

export type ManagerOfflineLandlordClientRow = ManagerLandlordClientRow &
  ManagerOfflineRowMetadata;
export type ManagerOfflinePropertyRow = ManagerPropertyRow &
  ManagerOfflineRowMetadata;
export type ManagerOfflineUnitRow = ManagerUnitRow & ManagerOfflineRowMetadata;
export type ManagerOfflineTenantRow = ManagerTenantRow & ManagerOfflineRowMetadata;
export type ManagerOfflineRentPaymentRow = ManagerRentPaymentRow &
  ManagerOfflineRowMetadata;
export type ManagerOfflineMaintenanceRequestRow = ManagerMaintenanceRequestRow &
  ManagerOfflineRowMetadata;

export function getManagerOfflineSyncStatus(
  row: unknown,
): ManagerOfflineSyncStatus | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }

  const status = (row as ManagerOfflineRowMetadata).offline_sync_status;

  return status === "waiting" || status === "review" || status === "synced"
    ? status
    : null;
}

export function isManagerOfflineRow(row: unknown) {
  return getManagerOfflineSyncStatus(row) !== null;
}

export function isManagerUnsyncedRow(row: unknown) {
  const status = getManagerOfflineSyncStatus(row);
  return status === "waiting" || status === "review";
}

export function getManagerOfflineStatusLabel(row: unknown) {
  const status = getManagerOfflineSyncStatus(row);

  if (status === "review") {
    return "Needs review";
  }

  if (status === "waiting") {
    return "Saved on this device";
  }

  if (status === "synced") {
    return "Synced";
  }

  return null;
}

export function mergeManagerRows<
  T extends { id: string; updated_at?: string },
>(serverRows: T[], offlineRows: T[]) {
  const merged = new Map(serverRows.map((row) => [row.id, row]));

  for (const row of offlineRows) {
    const current = merged.get(row.id);

    if (!current) {
      merged.set(row.id, row);
      continue;
    }

    if (isManagerUnsyncedRow(row)) {
      merged.set(row.id, { ...current, ...row });
      continue;
    }

    const currentUpdatedAt = Date.parse(current.updated_at ?? "") || 0;
    const offlineUpdatedAt = Date.parse(row.updated_at ?? "") || 0;

    if (offlineUpdatedAt > currentUpdatedAt) {
      merged.set(row.id, { ...current, ...row });
    }
  }

  return Array.from(merged.values());
}

export function applyOfflineTenantOccupancy(
  units: ManagerOfflineUnitRow[],
  tenants: ManagerOfflineTenantRow[],
) {
  const occupiedUnitIds = new Set(
    tenants
      .filter(
        (tenant) =>
          tenant.status === "active" || tenant.status === "eviction_notice",
      )
      .map((tenant) => tenant.unit_id),
  );

  return units.map((unit) => {
    if (!occupiedUnitIds.has(unit.id) || unit.status === "inactive") {
      return unit;
    }

    return {
      ...unit,
      status: "occupied" as const,
    };
  });
}
