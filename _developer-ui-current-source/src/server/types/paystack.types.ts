export type PaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string | null;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
};

export type PaystackResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id?: number;
};

export type PaystackSubaccount = {
  id: number;
  subaccount_code: string;
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
};

export type PaystackTransactionSplit = {
  id: number;
  name: string;
  type: "flat" | "percentage";
  currency: string;
  split_code: string;
  active: boolean;
};

export type PaystackInitializedTransaction = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export const PAYSTACK_VERIFICATION_STATUSES = [
  "unverified",
  "verified",
  "failed",
] as const;

export type PaystackVerificationStatus =
  (typeof PAYSTACK_VERIFICATION_STATUSES)[number];

export type PaystackChargeBearer =
  | "account"
  | "subaccount"
  | "all"
  | "all-proportional";

export type PaystackSingleSubaccountTransactionPayload = {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  currency: string;
  subaccount: string;
  transaction_charge: number;
  bearer: Extract<PaystackChargeBearer, "account" | "subaccount">;
  metadata: Record<string, unknown>;
};

export type PaystackMultiSplitTransactionPayload = {
  email: string;
  amount: number;
  reference: string;
  callback_url: string;
  currency: string;
  split_code: string;
  metadata: Record<string, unknown>;
};

export type PaystackInitializeTransactionPayload =
  | PaystackSingleSubaccountTransactionPayload
  | PaystackMultiSplitTransactionPayload;

export type LandlordPaystackAccount = {
  id: string;
  landlord_id: string;
  business_name: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  paystack_split_code: string | null;
  paystack_split_id: number | null;
  currency_code: string;
  is_active: boolean;
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentPaystackAccount = {
  id: string;
  agent_id: string;
  business_name: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  currency_code: string;
  is_active: boolean;
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperPaystackAccount = {
  id: string;
  developer_account_id: string;
  business_name: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_subaccount_code: string;
  paystack_subaccount_id: number | null;
  currency_code: string;
  is_active: boolean;
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GatewayPaymentIntent = {
  id: string;
  landlord_id: string;
  tenant_id: string;
  tenancy_id: string;
  paystack_reference: string;
  paystack_access_code: string;
  authorization_url: string;
  rent_amount: number;
  tenuro_fee_amount: number;
  total_amount: number;
  currency_code: string;
  period_start: string | null;
  period_end: string | null;
  idempotency_key: string;
  status: "initialized" | "paid" | "failed" | "abandoned" | "cancelled";
  metadata: Record<string, unknown>;
  expires_at: string | null;
  paid_at?: string | null;
  processed_payment_id?: string | null;
  failure_reason?: string | null;
  verified_payload?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
