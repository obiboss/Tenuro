import "server-only";

import crypto from "node:crypto";
import { isAppError } from "@/server/errors/app-error";
import {
  getBusinessSubscriptionById,
  getBusinessSubscriptionByPaystackCode,
  getBusinessSubscriptionPaymentByReference,
  getLatestBusinessSubscriptionPaymentForPaystackMatch,
  registerBusinessSubscriptionWebhookEvent,
  updateBusinessSubscription,
  updateBusinessSubscriptionWebhookEvent,
} from "@/server/repositories/business-subscription.repository";
import {
  activateBusinessSubscriptionPayment,
  findBusinessSubscriptionPlanByCode,
  getPaystackPlanCodeFromValue,
  recordRecurringBusinessSubscriptionPayment,
} from "@/server/services/business-subscription.service";
import { verifyPaystackTransaction } from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type BusinessSubscriptionWebhookResult = {
  status: "processed" | "duplicate" | "ignored" | "failed";
  message: string;
  businessSubscriptionId?: string;
};

const BUSINESS_SUBSCRIPTION_EVENTS = new Set([
  "charge.success",
  "subscription.create",
  "invoice.create",
  "invoice.update",
  "invoice.payment_failed",
  "subscription.not_renew",
  "subscription.disable",
  "subscription.expiring_cards",
]);

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readDate(value: unknown) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getNestedRecords(data: Record<string, unknown>) {
  const subscription = toRecord(data.subscription);
  const invoice = toRecord(data.invoice);
  const invoiceSubscription = toRecord(invoice.subscription);

  return { subscription, invoice, invoiceSubscription };
}

function getSubscriptionCode(data: Record<string, unknown>) {
  const { subscription, invoiceSubscription } = getNestedRecords(data);

  return (
    readString(data.subscription_code) ??
    readString(subscription.subscription_code) ??
    readString(invoiceSubscription.subscription_code)
  );
}

function getPlanCode(data: Record<string, unknown>) {
  const { subscription, invoiceSubscription } = getNestedRecords(data);

  return (
    getPaystackPlanCodeFromValue(data.plan) ??
    getPaystackPlanCodeFromValue(subscription.plan) ??
    getPaystackPlanCodeFromValue(invoiceSubscription.plan)
  );
}

function getBillingEmail(data: Record<string, unknown>) {
  const customer = toRecord(data.customer);
  const { subscription, invoiceSubscription } = getNestedRecords(data);
  const subscriptionCustomer = toRecord(subscription.customer);
  const invoiceCustomer = toRecord(invoiceSubscription.customer);

  return (
    readString(customer.email)?.toLowerCase() ??
    readString(subscriptionCustomer.email)?.toLowerCase() ??
    readString(invoiceCustomer.email)?.toLowerCase() ??
    null
  );
}

function getCustomerCode(data: Record<string, unknown>) {
  const customer = toRecord(data.customer);
  const { subscription, invoiceSubscription } = getNestedRecords(data);

  return (
    readString(customer.customer_code) ??
    readString(toRecord(subscription.customer).customer_code) ??
    readString(toRecord(invoiceSubscription.customer).customer_code)
  );
}

function getEmailToken(data: Record<string, unknown>) {
  const { subscription, invoiceSubscription } = getNestedRecords(data);

  return (
    readString(data.email_token) ??
    readString(subscription.email_token) ??
    readString(invoiceSubscription.email_token)
  );
}

function getNextPaymentAt(data: Record<string, unknown>) {
  const { subscription, invoice, invoiceSubscription } = getNestedRecords(data);

  return (
    readDate(data.next_payment_date) ??
    readDate(subscription.next_payment_date) ??
    readDate(invoice.next_payment_date) ??
    readDate(invoiceSubscription.next_payment_date)
  );
}

function getProviderReference(data: Record<string, unknown>) {
  return (
    getTransactionReference(data) ??
    readString(data.invoice_code) ??
    getSubscriptionCode(data)
  );
}

function getTransactionReference(data: Record<string, unknown>) {
  const transaction = toRecord(data.transaction);
  const invoiceTransaction = toRecord(toRecord(data.invoice).transaction);

  return (
    readString(data.reference) ??
    readString(transaction.reference) ??
    readString(invoiceTransaction.reference)
  );
}

function getErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Subscription notification could not be processed.";
}

function getBusinessSubscriptionIdFromMetadata(data: Record<string, unknown>) {
  const metadata = toRecord(data.metadata);
  return readString(metadata.business_subscription_id);
}

async function resolveSubscriptionFromEvent(data: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const subscriptionCode = getSubscriptionCode(data);

  if (subscriptionCode) {
    const byCode = await getBusinessSubscriptionByPaystackCode(
      supabase,
      subscriptionCode,
    );

    if (byCode) {
      return byCode;
    }
  }

  const metadataId = getBusinessSubscriptionIdFromMetadata(data);

  if (metadataId) {
    const byMetadata = await getBusinessSubscriptionById(supabase, metadataId);

    if (byMetadata) {
      return byMetadata;
    }
  }

  const reference = getTransactionReference(data);

  if (reference) {
    const payment = await getBusinessSubscriptionPaymentByReference(
      supabase,
      reference,
    );

    if (payment) {
      return getBusinessSubscriptionById(
        supabase,
        payment.business_subscription_id,
      );
    }
  }

  const planCode = getPlanCode(data);
  const billingEmail = getBillingEmail(data);

  if (!planCode || !billingEmail) {
    return null;
  }

  const pendingPayment =
    await getLatestBusinessSubscriptionPaymentForPaystackMatch(supabase, {
      paystackPlanCode: planCode,
      billingEmail,
    });

  return pendingPayment
    ? getBusinessSubscriptionById(
        supabase,
        pendingPayment.business_subscription_id,
      )
    : null;
}

async function isBusinessSubscriptionCharge(data: Record<string, unknown>) {
  const reference = getTransactionReference(data);

  if (reference?.toUpperCase().startsWith("BPS-")) {
    return true;
  }

  if (
    readString(toRecord(data.metadata).product) === "bopa_business_subscription"
  ) {
    return true;
  }

  const subscriptionCode = getSubscriptionCode(data);

  if (!subscriptionCode) {
    return false;
  }

  return Boolean(
    await getBusinessSubscriptionByPaystackCode(
      createSupabaseAdminClient(),
      subscriptionCode,
    ),
  );
}

async function processChargeSuccess(data: Record<string, unknown>) {
  const reference = getTransactionReference(data);

  if (!reference) {
    throw new Error("Paystack charge reference is missing.");
  }

  const supabase = createSupabaseAdminClient();
  const existingPayment = await getBusinessSubscriptionPaymentByReference(
    supabase,
    reference,
  );
  const transaction = await verifyPaystackTransaction(reference);

  if (existingPayment) {
    if (existingPayment.status === "paid") {
      const existingSubscription = await getBusinessSubscriptionById(
        supabase,
        existingPayment.business_subscription_id,
      );

      if (!existingSubscription) {
        throw new Error("Company subscription could not be matched.");
      }

      return existingSubscription;
    }

    return activateBusinessSubscriptionPayment({
      payment: existingPayment,
      transaction,
    });
  }

  const subscription = await resolveSubscriptionFromEvent(data);

  if (!subscription) {
    throw new Error("Company subscription could not be matched.");
  }

  const planCode =
    getPlanCode(data) ??
    getPaystackPlanCodeFromValue(transaction.plan) ??
    subscription.paystack_plan_code;
  const plan = findBusinessSubscriptionPlanByCode(planCode);

  if (!plan) {
    throw new Error("Paystack subscription plan is not configured.");
  }

  return recordRecurringBusinessSubscriptionPayment({
    subscription,
    transaction,
    plan,
  });
}

async function processSubscriptionCreate(data: Record<string, unknown>) {
  const subscription = await resolveSubscriptionFromEvent(data);
  const planCode = getPlanCode(data);
  const plan = findBusinessSubscriptionPlanByCode(planCode);
  const subscriptionCode = getSubscriptionCode(data);

  if (!subscription || !plan || !subscriptionCode) {
    return null;
  }

  if (subscription.workspace_type !== plan.workspaceType) {
    throw new Error("Paystack plan does not match the company workspace.");
  }

  return updateBusinessSubscription(
    createSupabaseAdminClient(),
    subscription.id,
    {
      billing_interval: plan.billingInterval,
      amount_kobo: plan.amountKobo,
      billing_email: getBillingEmail(data) ?? subscription.billing_email,
      paystack_plan_code: plan.planCode,
      paystack_customer_code:
        getCustomerCode(data) ?? subscription.paystack_customer_code,
      paystack_subscription_code: subscriptionCode,
      paystack_email_token:
        getEmailToken(data) ?? subscription.paystack_email_token,
      next_payment_at: getNextPaymentAt(data),
    },
  );
}

async function processSubscriptionStateEvent(params: {
  eventType: string;
  data: Record<string, unknown>;
}) {
  const subscription = await resolveSubscriptionFromEvent(params.data);

  if (!subscription) {
    return null;
  }

  const commonValues: Record<string, unknown> = {};
  const nextPaymentAt = getNextPaymentAt(params.data);

  if (nextPaymentAt) {
    commonValues.next_payment_at = nextPaymentAt;
  }

  if (params.eventType === "invoice.payment_failed") {
    commonValues.status = "past_due";
  }

  if (
    params.eventType === "subscription.not_renew" ||
    params.eventType === "subscription.disable"
  ) {
    commonValues.status = "cancelled";
    commonValues.cancel_at_period_end = true;
    commonValues.cancelled_at = new Date().toISOString();
    commonValues.next_payment_at = null;
  }

  if (Object.keys(commonValues).length === 0) {
    return subscription;
  }

  return updateBusinessSubscription(
    createSupabaseAdminClient(),
    subscription.id,
    commonValues,
  );
}

async function processSupportedEvent(params: {
  eventType: string;
  data: Record<string, unknown>;
}) {
  if (params.eventType === "charge.success") {
    return processChargeSuccess(params.data);
  }

  if (params.eventType === "subscription.create") {
    return processSubscriptionCreate(params.data);
  }

  if (
    params.eventType === "invoice.update" &&
    (params.data.paid === true ||
      ["paid", "success"].includes(
        readString(params.data.status)?.toLowerCase() ?? "",
      )) &&
    getTransactionReference(params.data)
  ) {
    return processChargeSuccess(params.data);
  }

  return processSubscriptionStateEvent(params);
}

export async function processBusinessSubscriptionPaystackWebhook(
  rawBody: string,
): Promise<BusinessSubscriptionWebhookResult | null> {
  let rawPayload: Record<string, unknown>;

  try {
    rawPayload = toRecord(JSON.parse(rawBody) as unknown);
  } catch {
    return null;
  }

  const eventType = readString(rawPayload.event);
  const data = toRecord(rawPayload.data);

  if (!eventType || !BUSINESS_SUBSCRIPTION_EVENTS.has(eventType)) {
    return null;
  }

  if (
    eventType === "charge.success" &&
    !(await isBusinessSubscriptionCharge(data))
  ) {
    return null;
  }

  const rawBodySha256 = crypto
    .createHash("sha256")
    .update(rawBody)
    .digest("hex");
  const supabase = createSupabaseAdminClient();
  const registration = await registerBusinessSubscriptionWebhookEvent(
    supabase,
    {
      rawBodySha256,
      eventType,
      providerReference: getProviderReference(data),
      rawPayload,
    },
  );

  if (registration.duplicate) {
    const isFailed = registration.event.status === "failed";
    const isStaleProcessing =
      registration.event.status === "processing" &&
      Date.now() - new Date(registration.event.updated_at).getTime() >
        5 * 60 * 1000;

    if (!isFailed && !isStaleProcessing) {
      return {
        status: "duplicate",
        message: "Subscription notification was already received.",
        businessSubscriptionId:
          registration.event.business_subscription_id ?? undefined,
      };
    }

    await updateBusinessSubscriptionWebhookEvent(
      supabase,
      registration.event.id,
      {
        status: "processing",
        failure_reason: null,
        processed_at: null,
      },
    );
  }

  try {
    const subscription = await processSupportedEvent({ eventType, data });

    if (!subscription) {
      await updateBusinessSubscriptionWebhookEvent(
        supabase,
        registration.event.id,
        {
          status: "ignored",
          failure_reason: "Subscription or Paystack plan could not be matched.",
          processed_at: new Date().toISOString(),
        },
      );

      return {
        status: "ignored",
        message: "Subscription notification was not for a configured plan.",
      };
    }

    await updateBusinessSubscriptionWebhookEvent(
      supabase,
      registration.event.id,
      {
        status: "processed",
        business_subscription_id: subscription.id,
        failure_reason: null,
        processed_at: new Date().toISOString(),
      },
    );

    return {
      status: "processed",
      message: "Subscription notification processed.",
      businessSubscriptionId: subscription.id,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    const subscription = await resolveSubscriptionFromEvent(data);

    await updateBusinessSubscriptionWebhookEvent(
      supabase,
      registration.event.id,
      {
        status: "failed",
        business_subscription_id: subscription?.id ?? null,
        failure_reason: message,
        processed_at: new Date().toISOString(),
      },
    );

    return {
      status: "failed",
      message,
      businessSubscriptionId: subscription?.id,
    };
  }
}
