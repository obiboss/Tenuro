import assert from "node:assert/strict";
import {
  buildManagerOccupancySnapshot,
  buildManagerOverviewAttentionItems,
  type ManagerLandlordClientRow,
  type ManagerPropertyRow,
  type ManagerTenantRow,
  type ManagerUnitRow,
} from "./manager.repository";
import type { ManagerTenantOnboardingRequestRow } from "./manager-tenant-onboarding.repository";

function property(
  overrides: Partial<ManagerPropertyRow> = {},
): ManagerPropertyRow {
  return {
    id: "property-1",
    organization_id: "organization-1",
    landlord_client_id: "landlord-1",
    property_name: "Idowu House",
    property_address: "12 Idowu Street",
    city: null,
    state: "Lagos",
    lga: "Ikeja",
    collection_mode: "manager_collects",
    management_fee_type: "percentage",
    management_fee_value: 10,
    paystack_charge_bearer: "tenant",
    payment_receiver: "manager",
    notes: null,
    existing_tenant_setup_required: false,
    existing_tenant_setup_completed_at: null,
    existing_tenant_setup_completed_by_profile_id: null,
    status: "active",
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

function unit(overrides: Partial<ManagerUnitRow> = {}): ManagerUnitRow {
  return {
    id: "unit-1",
    organization_id: "organization-1",
    landlord_client_id: "landlord-1",
    property_id: "property-1",
    unit_label: "Flat 1",
    unit_type: "2-bedroom flat",
    rent_amount: 100_000,
    status: "vacant",
    notes: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

function tenant(overrides: Partial<ManagerTenantRow> = {}): ManagerTenantRow {
  return {
    id: "tenant-1",
    organization_id: "organization-1",
    landlord_client_id: "landlord-1",
    property_id: "property-1",
    unit_id: "unit-1",
    full_name: "Uche Akujobi",
    phone_number: "08012345678",
    email: null,
    occupation: null,
    rent_amount: 100_000,
    current_balance: 0,
    move_in_date: "2026-07-14",
    next_rent_due_date: "2026-08-14",
    move_out_date: null,
    status: "active",
    notes: null,
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

const landlordClient: ManagerLandlordClientRow = {
  id: "landlord-1",
  organization_id: "organization-1",
  landlord_profile_id: null,
  landlord_name: "Mr Idowu",
  landlord_phone: null,
  landlord_email: null,
  landlord_address: null,
  notes: null,
  status: "active",
  created_at: "2026-07-14T00:00:00.000Z",
  updated_at: "2026-07-14T00:00:00.000Z",
};

const units = [
  unit({ id: "unit-1", status: "vacant" }),
  unit({ id: "unit-2", unit_label: "Flat 2", status: "reserved" }),
  unit({ id: "unit-3", unit_label: "Flat 3", status: "occupied" }),
];

const occupancy = buildManagerOccupancySnapshot({
  units,
  tenants: [tenant({ id: "tenant-3", unit_id: "unit-3" })],
});

assert.equal(occupancy.vacantUnitIds.has("unit-1"), true);
assert.equal(occupancy.vacantUnitIds.has("unit-2"), false);
assert.equal(occupancy.vacantUnitIds.has("unit-3"), false);
assert.equal(occupancy.occupiedUnitIds.has("unit-3"), true);
assert.equal(occupancy.occupiedUnitIds.has("unit-1"), false);

const reservedUnitWithCurrentTenant = buildManagerOccupancySnapshot({
  units: [unit({ id: "reserved-current", status: "reserved" })],
  tenants: [tenant({ id: "tenant-reserved", unit_id: "reserved-current" })],
});

assert.equal(
  reservedUnitWithCurrentTenant.occupiedUnitIds.has("reserved-current"),
  true,
);
assert.equal(
  reservedUnitWithCurrentTenant.reservedUnitIds.has("reserved-current"),
  false,
);
assert.equal(
  reservedUnitWithCurrentTenant.vacantUnitIds.has("reserved-current"),
  false,
);

const attentionItems = buildManagerOverviewAttentionItems({
  landlordClients: [landlordClient],
  properties: [
    property({
      existing_tenant_setup_required: true,
    }),
  ],
  units: [unit({ id: "unit-1", status: "vacant" })],
  tenants: [],
  payments: [],
  remittances: [],
  maintenanceRequests: [],
  onboardingRequests: [
    {
      id: "prospective-pending",
      organization_id: "organization-1",
      landlord_client_id: "landlord-1",
      property_id: "property-1",
      unit_id: "unit-1",
      onboarding_type: "new_incoming_tenant",
      status: "pending",
      invited_tenant_full_name: "Prospect Tenant",
      tenant_full_name: null,
      manager_units: { id: "unit-1", unit_label: "Flat 1", unit_type: null, rent_amount: 100_000, status: "reserved" },
      manager_properties: null,
      manager_landlord_clients: null,
      manager_organizations: null,
    },
    {
      id: "existing-pending",
      organization_id: "organization-1",
      landlord_client_id: "landlord-1",
      property_id: "property-1",
      unit_id: "unit-1",
      onboarding_type: "current_occupant",
      status: "pending",
      invited_tenant_full_name: "Existing Tenant",
      tenant_full_name: null,
      manager_units: { id: "unit-1", unit_label: "Flat 1", unit_type: null, rent_amount: 100_000, status: "reserved" },
      manager_properties: null,
      manager_landlord_clients: null,
      manager_organizations: null,
    },
    {
      id: "submitted-kyc",
      organization_id: "organization-1",
      landlord_client_id: "landlord-1",
      property_id: "property-1",
      unit_id: "unit-1",
      onboarding_type: "new_incoming_tenant",
      status: "submitted",
      invited_tenant_full_name: "Ready Tenant",
      tenant_full_name: "Ready Tenant",
      manager_units: { id: "unit-1", unit_label: "Flat 1", unit_type: null, rent_amount: 100_000, status: "reserved" },
      manager_properties: null,
      manager_landlord_clients: null,
      manager_organizations: null,
    },
  ].map((request) => ({
    token_hash: "token-hash",
    token_expires_at: "2026-07-21T00:00:00.000Z",
    token_used_at: null,
    invited_tenant_phone_number: "08012345678",
    invited_tenant_email: null,
    tenant_phone_number: null,
    tenant_email: null,
    tenant_occupation: null,
    tenant_id_type: null,
    tenant_id_number: null,
    tenant_move_in_date: null,
    tenant_claimed_next_rent_due_date: null,
    tenant_claimed_rent_amount: null,
    tenant_payment_frequency: "annual",
    tenant_notes: null,
    manager_confirmed_rent_amount: null,
    manager_confirmed_move_in_date: null,
    manager_confirmed_next_rent_due_date: null,
    opening_balance: 0,
    manager_review_notes: null,
    approved_tenant_id: null,
    approved_by_profile_id: null,
    rejection_reason: null,
    submitted_at: null,
    reviewed_at: null,
    cancelled_at: null,
    expired_at: null,
    metadata: {},
    created_at: "2026-07-14T00:00:00.000Z",
    updated_at: "2026-07-14T00:00:00.000Z",
    ...request,
  })) as ManagerTenantOnboardingRequestRow[],
});

assert.equal(
  attentionItems.some((item) => item.id === "tenant-onboarding-prospective-pending"),
  false,
);
assert.equal(
  attentionItems.some((item) => item.title === "Existing tenant details incomplete"),
  true,
);
assert.equal(
  attentionItems.some((item) => item.title === "Tenant details ready for review"),
  true,
);
assert.equal(
  attentionItems.some(
    (item) => item.title === "Existing tenants not yet captured",
  ),
  false,
);
