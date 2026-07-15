import assert from "node:assert/strict";
import {
  createManagerPropertySchema,
  createManagerTenantSchema,
  createManagerUnitSchema,
} from "./manager.schema";

const parsedTenantInput = createManagerTenantSchema.parse({
  landlordClientId: "11111111-1111-4111-8111-111111111111",
  propertyId: "22222222-2222-4222-8222-222222222222",
  unitId: "33333333-3333-4333-8333-333333333333",
  fullName: "Uche Akujobi",
  phoneNumber: "08012345678",
  email: "",
  occupation: "",
  rentAmount: "100000",
  currentBalance: "0",
  moveInDate: "2026-07-14",
  nextRentDueDate: "2026-07-21",
  status: "inactive",
  notes: "",
});

assert.equal("status" in parsedTenantInput, false);
assert.equal(parsedTenantInput.fullName, "Uche Akujobi");
assert.equal(parsedTenantInput.rentAmount, 100_000);
assert.equal(parsedTenantInput.nextRentDueDate, "2026-07-21");

const parsedUnitInput = createManagerUnitSchema.parse({
  landlordClientId: "11111111-1111-4111-8111-111111111111",
  propertyId: "22222222-2222-4222-8222-222222222222",
  unitLabel: "Flat 2",
  unitType: "2-bedroom flat",
  rentAmount: "150000",
  status: "occupied",
  notes: "",
});

assert.equal("status" in parsedUnitInput, false);
assert.equal(parsedUnitInput.unitLabel, "Flat 2");
assert.equal(parsedUnitInput.rentAmount, 150_000);

const propertyWithoutExistingTenants = createManagerPropertySchema.parse({
  landlordClientId: "11111111-1111-4111-8111-111111111111",
  propertyName: "Idowu House",
  propertyAddress: "12 Idowu Street",
  city: "",
  state: "Lagos",
  lga: "Ikeja",
  collectionMode: "manager_collects",
  managementFeeType: "percentage",
  managementFeeValue: "10",
  paystackChargeBearer: "tenant",
  paymentReceiver: "manager",
  hasExistingTenants: "false",
  notes: "",
});

assert.equal(propertyWithoutExistingTenants.hasExistingTenants, false);

const propertyWithExistingTenants = createManagerPropertySchema.parse({
  ...propertyWithoutExistingTenants,
  hasExistingTenants: "true",
});

assert.equal(propertyWithExistingTenants.hasExistingTenants, true);
