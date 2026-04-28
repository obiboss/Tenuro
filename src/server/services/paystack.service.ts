import "server-only";

import crypto from "node:crypto";
import { z } from "zod";
import { AppError } from "@/server/errors/app-error";
import type {
  PaystackBank,
  PaystackInitializeTransactionPayload,
  PaystackInitializedTransaction,
  PaystackResolvedAccount,
  PaystackSubaccount,
  PaystackTransactionSplit,
} from "@/server/types/paystack.types";

const PAYSTACK_API_BASE_URL = "https://api.paystack.co";

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

const paystackWebhookSchema = z.object({
  event: z.string().min(1),
  data: z
    .object({
      reference: z.string().min(1),
    })
    .passthrough(),
});

const paystackTransactionResponseSchema = z.object({
  status: z.boolean(),
  message: z.string(),
  data: z.object({
    status: z.string(),
    reference: z.string(),
    amount: z.number().int().nonnegative(),
    currency: z.string().length(3),
    paid_at: z.string().nullable().optional(),
    metadata: z.unknown(),
  }),
});

export const paystackMetadataSchema = z.object({
  tenancy_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  landlord_id: z.string().uuid(),
  expected_amount_naira: z.coerce.number().positive(),
  currency_code: z.string().length(3).default("NGN"),
  period_start: z.string().date().optional(),
  period_end: z.string().date().optional(),
});

export type PaystackWebhookEvent = z.infer<typeof paystackWebhookSchema>;
export type PaystackVerifiedTransaction = z.infer<
  typeof paystackTransactionResponseSchema
>["data"];
export type PaystackPaymentMetadata = z.infer<typeof paystackMetadataSchema>;

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new AppError(
      "PAYSTACK_SECRET_MISSING",
      "Paystack is not configured.",
      500,
    );
  }

  return secretKey;
}

async function paystackRequest<T>(params: {
  path: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}) {
  const response = await fetch(`${PAYSTACK_API_BASE_URL}${params.path}`, {
    method: params.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json()) as PaystackResponse<T>;

  if (!response.ok || !payload.status) {
    throw new AppError(
      "PAYSTACK_REQUEST_FAILED",
      payload.message || "Paystack request failed.",
      response.status,
    );
  }

  return payload.data;
}

export async function getSupportedBanks() {
  return paystackRequest<PaystackBank[]>({
    path: "/bank?country=nigeria&perPage=100",
  });
}

export async function verifyBankAccount(params: {
  accountNumber: string;
  bankCode: string;
}) {
  const searchParams = new URLSearchParams({
    account_number: params.accountNumber,
    bank_code: params.bankCode,
  });

  return paystackRequest<PaystackResolvedAccount>({
    path: `/bank/resolve?${searchParams.toString()}`,
  });
}

export async function createLandlordSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  landlordName: string;
  landlordPhoneNumber: string;
  landlordEmail: string | null;
}) {
  return paystackRequest<PaystackSubaccount>({
    path: "/subaccount",
    method: "POST",
    body: {
      business_name: params.businessName,
      bank_code: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: 0,
      description: "Tenuro landlord rent collection subaccount",
      primary_contact_name: params.landlordName,
      primary_contact_phone: params.landlordPhoneNumber,
      primary_contact_email: params.landlordEmail || undefined,
    },
  });
}

export async function createTransactionSplit(params: {
  name: string;
  landlordSubaccountCode: string;
  landlordShareKobo: number;
  currencyCode?: string;
}) {
  return paystackRequest<PaystackTransactionSplit>({
    path: "/split",
    method: "POST",
    body: {
      name: params.name,
      type: "flat",
      currency: params.currencyCode ?? "NGN",
      bearer_type: "account",
      subaccounts: [
        {
          subaccount: params.landlordSubaccountCode,
          share: params.landlordShareKobo,
        },
      ],
    },
  });
}

export function buildPaystackSplitTransactionPayload(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  subaccountCode: string;
  transactionChargeKobo: number;
  currencyCode: string;
  metadata: Record<string, unknown>;
}): PaystackInitializeTransactionPayload {
  if (!params.subaccountCode.trim()) {
    throw new AppError(
      "PAYSTACK_SUBACCOUNT_REQUIRED",
      "Landlord payout account is not ready for gateway payments.",
      400,
    );
  }

  if (params.amountKobo <= 0) {
    throw new AppError(
      "PAYSTACK_AMOUNT_INVALID",
      "Payment amount is not valid.",
      400,
    );
  }

  if (params.transactionChargeKobo < 0) {
    throw new AppError(
      "PAYSTACK_TRANSACTION_CHARGE_INVALID",
      "Gateway fee is not valid.",
      400,
    );
  }

  if (params.transactionChargeKobo >= params.amountKobo) {
    throw new AppError(
      "PAYSTACK_TRANSACTION_CHARGE_TOO_HIGH",
      "Gateway fee cannot be equal to or higher than the payment amount.",
      400,
    );
  }

  return {
    email: params.email,
    amount: params.amountKobo,
    reference: params.reference,
    callback_url: params.callbackUrl,
    currency: params.currencyCode,
    subaccount: params.subaccountCode,
    transaction_charge: params.transactionChargeKobo,
    bearer: "subaccount",
    metadata: params.metadata,
  };
}

export async function initializePaystackTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  subaccountCode: string;
  transactionChargeKobo: number;
  currencyCode: string;
  metadata: Record<string, unknown>;
}) {
  const payload = buildPaystackSplitTransactionPayload(params);

  return paystackRequest<PaystackInitializedTransaction>({
    path: "/transaction/initialize",
    method: "POST",
    body: payload,
  });
}

export function verifyPaystackWebhookSignature(params: {
  rawBody: string;
  signature: string | null;
}) {
  if (!params.signature) {
    throw new AppError(
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid payment notification.",
      401,
    );
  }

  const expectedSignature = crypto
    .createHmac("sha512", getPaystackSecretKey())
    .update(params.rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(params.signature, "hex");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new AppError(
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid payment notification.",
      401,
    );
  }
}

export function parsePaystackWebhook(rawBody: string): PaystackWebhookEvent {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return paystackWebhookSchema.parse(parsed);
  } catch {
    throw new AppError(
      "INVALID_WEBHOOK_PAYLOAD",
      "Invalid payment notification.",
      400,
    );
  }
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(
    `${PAYSTACK_API_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new AppError(
      "PAYSTACK_VERIFY_FAILED",
      "Payment could not be verified.",
      502,
    );
  }

  const parsed = paystackTransactionResponseSchema.parse(payload);

  if (!parsed.status) {
    throw new AppError(
      "PAYSTACK_VERIFY_FAILED",
      parsed.message || "Payment could not be verified.",
      502,
    );
  }

  return parsed.data;
}

export function parsePaystackMetadata(
  metadata: unknown,
): PaystackPaymentMetadata {
  const parsed = paystackMetadataSchema.safeParse(metadata);

  if (!parsed.success) {
    throw new AppError(
      "PAYSTACK_METADATA_INVALID",
      "Payment details could not be matched to a rental agreement.",
      400,
    );
  }

  return parsed.data;
}

export function convertKoboToNaira(amountInKobo: number) {
  return Number((amountInKobo / 100).toFixed(2));
}

export function convertNairaToKobo(amountInNaira: number) {
  return Math.round(amountInNaira * 100);
}

export function assertPaystackAmountMatchesExpected(params: {
  paystackAmountInKobo: number;
  expectedAmountInNaira: number;
}) {
  const expectedKobo = convertNairaToKobo(params.expectedAmountInNaira);
  const differenceInKobo = Math.abs(params.paystackAmountInKobo - expectedKobo);

  if (differenceInKobo >= 1) {
    throw new AppError(
      "PAYSTACK_AMOUNT_MISMATCH",
      "Payment amount does not match the expected amount.",
      400,
    );
  }
}
