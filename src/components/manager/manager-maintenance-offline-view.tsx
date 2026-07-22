"use client";

import { ManagerMaintenanceForm } from "@/components/manager/manager-maintenance-form";
import { ManagerMaintenanceList } from "@/components/manager/manager-maintenance-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import { PageHeader } from "@/components/ui/page-header";
import {
  applyOfflineTenantOccupancy,
  mergeManagerRows,
} from "@/lib/offline/manager-data";
import type { ManagerMaintenanceRequestRow } from "@/server/repositories/manager-maintenance.repository";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerMaintenanceOfflineViewProps = {
  initialLandlordClients: ManagerLandlordClientRow[];
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  initialMaintenanceRequests: ManagerMaintenanceRequestRow[];
  selectedPropertyId: string;
};

export function ManagerMaintenanceOfflineView({
  initialLandlordClients,
  initialProperties,
  initialUnits,
  initialTenants,
  initialMaintenanceRequests,
  selectedPropertyId,
}: ManagerMaintenanceOfflineViewProps) {
  const offline = useManagerOfflineData();
  const landlordClients = mergeManagerRows(
    initialLandlordClients,
    offline.landlordClients,
  );
  const properties = mergeManagerRows(initialProperties, offline.properties);
  const tenants = mergeManagerRows(initialTenants, offline.tenants);
  const units = applyOfflineTenantOccupancy(
    mergeManagerRows(initialUnits, offline.units),
    tenants,
  );
  const maintenanceRequests = mergeManagerRows(
    initialMaintenanceRequests,
    offline.maintenanceRequests,
  ).filter(
    (request) =>
      !selectedPropertyId || request.property_id === selectedPropertyId,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Record property issues, expected repair costs, and their progress."
      />

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerMaintenanceForm
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
        />
        <ManagerMaintenanceList
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
          maintenanceRequests={maintenanceRequests}
          selectedPropertyId={selectedPropertyId}
        />
      </section>
    </div>
  );
}
