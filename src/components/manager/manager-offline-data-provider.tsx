"use client";

import { liveQuery, type Subscription } from "dexie";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { openOfflineDatabase } from "@/lib/offline/database";
import type {
  ManagerOfflineLandlordClientRow,
  ManagerOfflineMaintenanceRequestRow,
  ManagerOfflinePropertyRow,
  ManagerOfflineRentPaymentRow,
  ManagerOfflineTenantRow,
  ManagerOfflineUnitRow,
} from "@/lib/offline/manager-data";
import type { OfflineEntityRecord } from "@/lib/offline/types";

export type ManagerOfflineDataSnapshot = {
  ready: boolean;
  landlordClients: ManagerOfflineLandlordClientRow[];
  properties: ManagerOfflinePropertyRow[];
  units: ManagerOfflineUnitRow[];
  tenants: ManagerOfflineTenantRow[];
  payments: ManagerOfflineRentPaymentRow[];
  maintenanceRequests: ManagerOfflineMaintenanceRequestRow[];
};

const EMPTY_SNAPSHOT: ManagerOfflineDataSnapshot = {
  ready: false,
  landlordClients: [],
  properties: [],
  units: [],
  tenants: [],
  payments: [],
  maintenanceRequests: [],
};

const ManagerOfflineDataContext =
  createContext<ManagerOfflineDataSnapshot>(EMPTY_SNAPSHOT);

function isVisibleManagerRecord(record: OfflineEntityRecord) {
  return !record.deletedAt;
}

function toRows<T>(records: OfflineEntityRecord[]) {
  return records
    .filter(isVisibleManagerRecord)
    .map((record) => record.data as unknown as T);
}

async function readManagerOfflineData(input: {
  ownerProfileId: string;
  workspaceId: string;
}): Promise<ManagerOfflineDataSnapshot> {
  const db = await openOfflineDatabase();
  const scope = [input.ownerProfileId, input.workspaceId] as [string, string];
  const [
    landlordClients,
    properties,
    units,
    tenants,
    payments,
    maintenanceRequests,
  ] = await Promise.all([
      db.managerLandlordClients
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
      db.managerProperties
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
      db.managerUnits
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
      db.managerTenants
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
      db.managerRentPayments
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
      db.managerMaintenanceRequests
        .where("[ownerProfileId+workspaceId]")
        .equals(scope)
        .toArray(),
    ]);

  return {
    ready: true,
    landlordClients: toRows<ManagerOfflineLandlordClientRow>(landlordClients),
    properties: toRows<ManagerOfflinePropertyRow>(properties),
    units: toRows<ManagerOfflineUnitRow>(units),
    tenants: toRows<ManagerOfflineTenantRow>(tenants),
    payments: toRows<ManagerOfflineRentPaymentRow>(payments),
    maintenanceRequests:
      toRows<ManagerOfflineMaintenanceRequestRow>(maintenanceRequests),
  };
}

export function ManagerOfflineDataProvider({
  ownerProfileId,
  workspaceId,
  children,
}: {
  ownerProfileId: string;
  workspaceId: string | null;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (!workspaceId) {
      setSnapshot({ ...EMPTY_SNAPSHOT, ready: true });
      return;
    }

    let subscription: Subscription | null = null;

    try {
      subscription = liveQuery(() =>
        readManagerOfflineData({ ownerProfileId, workspaceId }),
      ).subscribe({
        next: setSnapshot,
        error: () => setSnapshot({ ...EMPTY_SNAPSHOT, ready: true }),
      });
    } catch {
      setSnapshot({ ...EMPTY_SNAPSHOT, ready: true });
    }

    return () => subscription?.unsubscribe();
  }, [ownerProfileId, workspaceId]);

  const value = useMemo(() => snapshot, [snapshot]);

  return (
    <ManagerOfflineDataContext.Provider value={value}>
      {children}
    </ManagerOfflineDataContext.Provider>
  );
}

export function useManagerOfflineData() {
  return useContext(ManagerOfflineDataContext);
}
