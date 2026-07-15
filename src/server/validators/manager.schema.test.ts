import assert from "node:assert/strict";
import { createManagerTenantSchema } from "./manager.schema";

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
