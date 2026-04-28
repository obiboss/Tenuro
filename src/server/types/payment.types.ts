export type PaymentMethod =
  | "paystack_gateway"
  | "bank_transfer"
  | "cash"
  | "other";

export type PaymentFrequency = "monthly" | "quarterly" | "biannual" | "annual";

export type ReceiptStatus = "pending" | "generated" | "failed" | "voided";

export type WebhookProcessingStatus =
  | "pending"
  | "processed"
  | "failed"
  | "ignored";

export type PaystackTransactionStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "reversed"
  | "ongoing"
  | "pending";

export type PaystackWebhookEventName =
  | "charge.success"
  | "charge.failed"
  | "transfer.failed"
  | "refund.processed";

export type PaystackSplitBearerType =
  | "account"
  | "subaccount"
  | "all"
  | "all-proportional";

export type PaystackTransactionMetadata = {
  tenancy_id: string;
  tenant_id: string;
  landlord_id: string;
  expected_amount_naira: number;
  currency_code: string;
  period_start?: string;
  period_end?: string;
};

export type InitializeRentPaymentResult = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export type ManualPaymentResult = {
  paymentId: string;
  message: string;
};

export type PaymentActionState = {
  ok: boolean;
  message: string;
  paymentId?: string;
  authorizationUrl?: string;
  reference?: string;
  fieldErrors?: Record<string, string[]>;
};
