"use client";

import { ManagerPaymentForm } from "@/components/manager/manager-payment-form";
import { ManagerPaymentList } from "@/components/manager/manager-payment-list";
import { ManagerPaystackPaymentLinkForm } from "@/components/manager/manager-paystack-payment-link-form";
import { ManagerPaystackPaymentLinkList } from "@/components/manager/manager-paystack-payment-link-list";
import { useManagerOfflineData } from "@/components/manager/manager-offline-data-provider";
import { PageHeader } from "@/components/ui/page-header";
import {
  applyOfflineTenantOccupancy,
  mergeManagerRows,
} from "@/lib/offline/manager-data";
import type { ManagerRentPaymentRequestRow } from "@/server/repositories/manager-paystack.repository";
import type {
  ManagerLandlordClientRow,
  ManagerPropertyRow,
  ManagerRentPaymentRow,
  ManagerTenantRow,
  ManagerUnitRow,
} from "@/server/repositories/manager.repository";

type ManagerPaymentsOfflineViewProps = {
  initialLandlordClients: ManagerLandlordClientRow[];
  initialProperties: ManagerPropertyRow[];
  initialUnits: ManagerUnitRow[];
  initialTenants: ManagerTenantRow[];
  initialPayments: ManagerRentPaymentRow[];
  paystackPaymentRequests: ManagerRentPaymentRequestRow[];
};

export function ManagerPaymentsOfflineView({
  initialLandlordClients,
  initialProperties,
  initialUnits,
  initialTenants,
  initialPayments,
  paystackPaymentRequests,
}: ManagerPaymentsOfflineViewProps) {
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
  const payments = mergeManagerRows(initialPayments, offline.payments);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rent payments"
        description="Record manual rent payments or create Paystack links. BOPA calculates the split automatically."
      />

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerPaystackPaymentLinkForm
          landlordClients={initialLandlordClients}
          properties={initialProperties}
          units={initialUnits}
          tenants={initialTenants}
        />
        <ManagerPaystackPaymentLinkList
          properties={initialProperties}
          units={initialUnits}
          tenants={initialTenants}
          paymentRequests={paystackPaymentRequests}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[460px_1fr]">
        <ManagerPaymentForm
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
        />
        <ManagerPaymentList
          landlordClients={landlordClients}
          properties={properties}
          units={units}
          tenants={tenants}
          payments={payments}
        />
      </section>
    </div>
  );
}
