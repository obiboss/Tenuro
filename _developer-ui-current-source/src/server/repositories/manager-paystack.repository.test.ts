import assert from "node:assert/strict";
import { expireManagerNewTenantPaymentRequests } from "./manager-paystack.repository";

const rpcCalls: string[] = [];

const expiredCount = await expireManagerNewTenantPaymentRequests({
  rpc: async (functionName: string) => {
    rpcCalls.push(functionName);

    return {
      data: 3,
      error: null,
    };
  },
} as never);

assert.equal(
  rpcCalls[0],
  "expire_manager_new_tenant_payment_requests",
);
assert.equal(expiredCount, 3);

const missingCount = await expireManagerNewTenantPaymentRequests({
  rpc: async () => ({
    data: null,
    error: null,
  }),
} as never);

assert.equal(missingCount, 0);
