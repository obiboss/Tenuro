import "server-only";

import crypto from "node:crypto";
import {
  BUSINESS_SUBSCRIPTION_PRICES,
  BUSINESS_SUBSCRIPTION_TRIAL_MONTHS,
  type BusinessBillingInterval,
  type BusinessWorkspaceType,
} from "@/constants/business-subscription";
import { AppError } from "@/server/errors/app-error";
import {
  createBusinessSubscription,
  createBusinessSubscriptionPayment,
  getBusinessSubscriptionById,
  getBusinessSubscriptionByWorkspace,
  getBusinessSubscriptionPaymentByReference,
  getLatestBusinessSubscriptionPayment,
  updateBusinessSubscription,
  updateBusinessSubscriptionPayment,
  upsertPaidBusinessSubscriptionPayment,
  type BusinessSubscriptionPaymentRow,
  type BusinessSubscriptionRow,
  type BusinessSubscriptionStatus,
} from "@/server/repositories/business-subscription.repository";
import {
  getDeveloperAccountByOwnerProfileId,
  getDeveloperAccountByProfileId,
} from "@/server/repositories/developer.repository";
import { getManagerOrganizationAccessForCurrentUser } from "@/server/repositories/manager.repository";
import {
  disablePaystackSubscription,
  getPaystackSubscriptionManageLink,
  initializePaystackSubscriptionTransaction,
  verifyPaystackTransaction,
  type PaystackVerifiedTransaction,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type BusinessWorkspaceContext = {
  workspaceType: BusinessWorkspaceType;
  workspaceId: string;
  ownerProfileId: string;
  businessName: string;
  businessEmail: string | null;
  isOwner: boolean;
};

type BusinessSubscriptionPlan = {
  workspaceType: BusinessWorkspaceType;
  billingInterval: BusinessBillingInterval;
  amountKobo: number;
  planCode: string;
};

const PLAN_CODE_ENV: Record<
  BusinessWorkspaceType,
  Record<BusinessBillingInterval, string>
> = {
  manager: {
    monthly: "PAYSTACK_MANAGER_MONTHLY_PLAN_CODE",
    annual: "PAYSTACK_MANAGER_ANNUAL_PLAN_CODE",
  },
  developer: {
    monthly: "PAYSTACK_DEVELOPER_MONTHLY_PLAN_CODE",
    annual: "PAYSTACK_DEVELOPER_ANNUAL_PLAN_CODE",
  },
};

function cleanEmail(value: string | null | undefined) {
  const cleaned = value?.trim().toLowerCase();
  return cleaned ? cleaned : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BOPA_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const cleanedUrl = configuredUrl.trim().replace(/\/$/, "");

  if (!cleanedUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "The application address is not configured.",
      500,
    );
  }

  try {
    return new URL(cleanedUrl).toString().replace(/\/$/, "");
  } catch {
    throw new AppError(
      "APP_URL_INVALID",
      "The application address is not configured correctly.",
      500,
    );
  }
}

function addCalendarMonths(value: string | Date, months: number) {
  const result = new Date(value);

  if (Number.isNaN(result.getTime())) {
    throw new AppError(
      "SUBSCRIPTION_DATE_INVALID",
      "Subscription date could not be calculated.",
      500,
    );
  }

  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();

  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

function addBillingPeriod(
  value: string | Date,
  billingInterval: BusinessBillingInterval,
) {
  return addCalendarMonths(value, billingInterval === "monthly" ? 1 : 12);
}

function createPaymentReference() {
  return `BPS-${crypto.randomBytes(12).toString("hex").toUpperCase()}`;
}

export function getBusinessSubscriptionPlan(params: {
  workspaceType: BusinessWorkspaceType;
  billingInterval: BusinessBillingInterval;
}): BusinessSubscriptionPlan {
  const envName = PLAN_CODE_ENV[params.workspaceType][params.billingInterval];
  const planCode = process.env[envName]?.trim();

  if (!planCode) {
    throw new AppError(
      "PAYSTACK_PLAN_MISSING",
      "This subscription plan is not configured yet.",
      500,
    );
  }

  const configuredMatches = Object.values(PLAN_CODE_ENV).flatMap((intervals) =>
    Object.values(intervals).filter(
      (name) => process.env[name]?.trim() === planCode,
    ),
  );

  if (configuredMatches.length !== 1) {
    throw new AppError(
      "PAYSTACK_PLAN_NOT_UNIQUE",
      "Each manager and developer subscription plan must use a different Paystack plan code.",
      500,
    );
  }

  return {
    workspaceType: params.workspaceType,
    billingInterval: params.billingInterval,
    amountKobo: BUSINESS_SUBSCRIPTION_PRICES[params.billingInterval].amountKobo,
    planCode,
  };
}

export function findBusinessSubscriptionPlanByCode(
  planCode: string | null,
): BusinessSubscriptionPlan | null {
  if (!planCode) {
    return null;
  }

  const matches: BusinessSubscriptionPlan[] = [];

  for (const workspaceType of ["manager", "developer"] as const) {
    for (const billingInterval of ["monthly", "annual"] as const) {
      const configuredCode =
        process.env[PLAN_CODE_ENV[workspaceType][billingInterval]]?.trim();

      if (configuredCode && configuredCode === planCode) {
        matches.push({
          workspaceType,
          billingInterval,
          amountKobo: BUSINESS_SUBSCRIPTION_PRICES[billingInterval].amountKobo,
          planCode: configuredCode,
        });
      }
    }
  }

  if (matches.length > 1) {
    throw new AppError(
      "PAYSTACK_PLAN_NOT_UNIQUE",
      "Each manager and developer subscription plan must use a different Paystack plan code.",
      500,
    );
  }

  return matches[0] ?? null;
}

export async function getBusinessWorkspaceContextForProfile(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
}): Promise<BusinessWorkspaceContext> {
  const supabase = createSupabaseAdminClient();

  if (params.workspaceType === "manager") {
    const access = await getManagerOrganizationAccessForCurrentUser(
      supabase,
      params.profileId,
    );

    if (!access || access.organization.status !== "active") {
      throw new AppError(
        "MANAGER_ORGANIZATION_REQUIRED",
        "Create or join a manager company before continuing.",
        403,
      );
    }

    return {
      workspaceType: "manager",
      workspaceId: access.organization.id,
      ownerProfileId: access.organization.owner_profile_id,
      businessName: access.organization.organization_name,
      businessEmail: cleanEmail(access.organization.organization_email),
      isOwner: access.isOwner,
    };
  }

  const ownedAccount = await getDeveloperAccountByOwnerProfileId(
    supabase,
    params.profileId,
  );
  const membership = ownedAccount
    ? null
    : await getDeveloperAccountByProfileId(supabase, params.profileId);
  const account = ownedAccount ?? membership?.account ?? null;

  if (!account || account.status !== "active") {
    throw new AppError(
      "DEVELOPER_ACCOUNT_REQUIRED",
      "Create or join a developer company before continuing.",
      403,
    );
  }

  return {
    workspaceType: "developer",
    workspaceId: account.id,
    ownerProfileId: account.owner_profile_id,
    businessName: account.company_name,
    businessEmail: cleanEmail(account.company_email),
    isOwner: account.owner_profile_id === params.profileId,
  };
}

async function ensureBusinessSubscription(context: BusinessWorkspaceContext) {
  const supabase = createSupabaseAdminClient();
  const existing = await getBusinessSubscriptionByWorkspace(supabase, {
    workspaceType: context.workspaceType,
    workspaceId: context.workspaceId,
  });

  if (existing) {
    return refreshElapsedBusinessSubscription(existing);
  }

  const trialStartedAt = new Date();
  const trialExpiresAt = addCalendarMonths(
    trialStartedAt,
    BUSINESS_SUBSCRIPTION_TRIAL_MONTHS,
  );

  try {
    return await createBusinessSubscription(supabase, {
      workspaceType: context.workspaceType,
      workspaceId: context.workspaceId,
      ownerProfileId: context.ownerProfileId,
      billingEmail: context.businessEmail,
      trialStartedAt: trialStartedAt.toISOString(),
      trialExpiresAt: trialExpiresAt.toISOString(),
      trialSource: "application_repair",
    });
  } catch (error) {
    if ((error as { code?: string } | null)?.code !== "23505") {
      throw error;
    }

    const concurrent = await getBusinessSubscriptionByWorkspace(supabase, {
      workspaceType: context.workspaceType,
      workspaceId: context.workspaceId,
    });

    if (!concurrent) {
      throw error;
    }

    return refreshElapsedBusinessSubscription(concurrent);
  }
}

async function refreshElapsedBusinessSubscription(
  subscription: BusinessSubscriptionRow,
) {
  const now = Date.now();
  let nextStatus: BusinessSubscriptionStatus | null = null;

  if (
    subscription.status === "trialing" &&
    new Date(subscription.trial_expires_at).getTime() <= now
  ) {
    nextStatus = "expired";
  }

  if (
    subscription.status === "active" &&
    (!subscription.current_period_end ||
      new Date(subscription.current_period_end).getTime() <= now)
  ) {
    nextStatus = "expired";
  }

  if (!nextStatus) {
    return subscription;
  }

  return updateBusinessSubscription(
    createSupabaseAdminClient(),
    subscription.id,
    { status: nextStatus },
  );
}

export function businessSubscriptionHasAccess(
  subscription: BusinessSubscriptionRow,
  at = new Date(),
) {
  const currentTime = at.getTime();

  if (subscription.status === "trialing") {
    return new Date(subscription.trial_expires_at).getTime() > currentTime;
  }

  if (subscription.status === "active" || subscription.status === "cancelled") {
    return Boolean(
      subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() > currentTime,
    );
  }

  return false;
}

export async function assertBusinessSubscriptionAccessForProfile(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
}) {
  const context = await getBusinessWorkspaceContextForProfile(params);
  const subscription = await ensureBusinessSubscription(context);

  if (!businessSubscriptionHasAccess(subscription)) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_REQUIRED",
      "Renew your company subscription to continue.",
      402,
    );
  }

  return { context, subscription };
}

export async function assertBusinessSubscriptionAccessForWorkspace(params: {
  workspaceType: BusinessWorkspaceType;
  workspaceId: string;
}) {
  const subscription = await getBusinessSubscriptionByWorkspace(
    createSupabaseAdminClient(),
    params,
  );

  if (!subscription) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_NOT_FOUND",
      "Company subscription could not be found.",
      403,
    );
  }

  const refreshed = await refreshElapsedBusinessSubscription(subscription);

  if (!businessSubscriptionHasAccess(refreshed)) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_REQUIRED",
      "Renew the company subscription to continue.",
      402,
    );
  }

  return refreshed;
}

export async function getBusinessSubscriptionPageData(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
  profileEmail: string | null;
}) {
  const context = await getBusinessWorkspaceContextForProfile(params);
  const subscription = await ensureBusinessSubscription(context);
  const latestPayment = await getLatestBusinessSubscriptionPayment(
    createSupabaseAdminClient(),
    { businessSubscriptionId: subscription.id },
  );
  const now = Date.now();
  const trialMilliseconds = Math.max(
    0,
    new Date(subscription.trial_expires_at).getTime() - now,
  );

  return {
    subscription,
    businessName: context.businessName,
    isOwner: context.isOwner,
    hasAccess: businessSubscriptionHasAccess(subscription),
    defaultBillingEmail:
      subscription.billing_email ??
      context.businessEmail ??
      cleanEmail(params.profileEmail) ??
      "",
    trialDaysRemaining: Math.ceil(trialMilliseconds / (24 * 60 * 60 * 1000)),
    latestPayment,
  };
}

function assertOwner(context: BusinessWorkspaceContext) {
  if (!context.isOwner) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_OWNER_REQUIRED",
      "Ask your company owner to manage the subscription.",
      403,
    );
  }
}

async function disablePreviousPaystackSubscription(
  subscription: BusinessSubscriptionRow,
) {
  if (
    !subscription.paystack_subscription_code ||
    !subscription.paystack_email_token
  ) {
    return;
  }

  await disablePaystackSubscription({
    subscriptionCode: subscription.paystack_subscription_code,
    emailToken: subscription.paystack_email_token,
  });
}

export async function initializeBusinessSubscriptionCheckout(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
  billingInterval: BusinessBillingInterval;
  billingEmail: string;
}) {
  const context = await getBusinessWorkspaceContextForProfile(params);
  assertOwner(context);

  const subscription = await ensureBusinessSubscription(context);

  if (
    subscription.status === "active" &&
    businessSubscriptionHasAccess(subscription)
  ) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_ALREADY_ACTIVE",
      "Your company subscription is already active.",
      400,
    );
  }

  if (
    subscription.status === "cancelled" &&
    businessSubscriptionHasAccess(subscription)
  ) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_PERIOD_ACTIVE",
      "Your company can continue until the current paid period ends.",
      400,
    );
  }

  if (
    subscription.status !== "trialing" &&
    subscription.paystack_subscription_code
  ) {
    await disablePreviousPaystackSubscription(subscription);
  }

  const plan = getBusinessSubscriptionPlan({
    workspaceType: context.workspaceType,
    billingInterval: params.billingInterval,
  });
  const billingEmail = cleanEmail(params.billingEmail);

  if (!billingEmail) {
    throw new AppError(
      "SUBSCRIPTION_BILLING_EMAIL_REQUIRED",
      "Enter a billing email address.",
      400,
    );
  }

  const recentInitializedPayment = await getLatestBusinessSubscriptionPayment(
    createSupabaseAdminClient(),
    {
      businessSubscriptionId: subscription.id,
      status: "initialized",
    },
  );
  const recentPaymentAge = recentInitializedPayment
    ? Date.now() - new Date(recentInitializedPayment.created_at).getTime()
    : Number.POSITIVE_INFINITY;

  if (
    recentInitializedPayment?.billing_interval === params.billingInterval &&
    recentInitializedPayment.authorization_url &&
    recentPaymentAge < 20 * 60 * 1000
  ) {
    return {
      authorizationUrl: recentInitializedPayment.authorization_url,
      reference: recentInitializedPayment.payment_reference,
    };
  }

  const supabase = createSupabaseAdminClient();
  const paymentReference = createPaymentReference();
  const metadata = {
    product: "bopa_business_subscription",
    business_subscription_id: subscription.id,
    workspace_type: context.workspaceType,
    workspace_id: context.workspaceId,
    owner_profile_id: context.ownerProfileId,
    billing_interval: params.billingInterval,
    expected_amount_kobo: plan.amountKobo,
    paystack_plan_code: plan.planCode,
  };
  const payment = await createBusinessSubscriptionPayment(supabase, {
    businessSubscriptionId: subscription.id,
    ownerProfileId: context.ownerProfileId,
    paymentReference,
    billingInterval: params.billingInterval,
    expectedAmountKobo: plan.amountKobo,
    paystackPlanCode: plan.planCode,
    metadata,
  });

  await updateBusinessSubscription(supabase, subscription.id, {
    billing_interval: params.billingInterval,
    amount_kobo: plan.amountKobo,
    billing_email: billingEmail,
    paystack_plan_code: plan.planCode,
  });

  try {
    const initialized = await initializePaystackSubscriptionTransaction({
      email: billingEmail,
      amountKobo: plan.amountKobo,
      reference: paymentReference,
      callbackUrl: `${getAppBaseUrl()}/subscription/callback?reference=${encodeURIComponent(paymentReference)}`,
      planCode: plan.planCode,
      metadata,
    });

    await updateBusinessSubscriptionPayment(supabase, payment.id, {
      paystack_access_code: initialized.access_code,
      authorization_url: initialized.authorization_url,
    });

    return {
      authorizationUrl: initialized.authorization_url,
      reference: initialized.reference,
    };
  } catch (error) {
    await updateBusinessSubscriptionPayment(supabase, payment.id, {
      status: "failed",
      failure_reason:
        error instanceof Error
          ? error.message
          : "Subscription checkout could not be created.",
    });
    throw error;
  }
}

function assertVerifiedPaymentDetails(params: {
  payment: BusinessSubscriptionPaymentRow;
  transaction: PaystackVerifiedTransaction;
}) {
  if (params.transaction.reference !== params.payment.payment_reference) {
    throw new AppError(
      "SUBSCRIPTION_REFERENCE_MISMATCH",
      "Subscription payment reference does not match.",
      400,
    );
  }

  if (params.transaction.amount !== params.payment.expected_amount_kobo) {
    throw new AppError(
      "SUBSCRIPTION_AMOUNT_MISMATCH",
      "Subscription payment amount does not match.",
      400,
    );
  }

  if (params.transaction.currency.toUpperCase() !== "NGN") {
    throw new AppError(
      "SUBSCRIPTION_CURRENCY_MISMATCH",
      "Subscription payment currency does not match.",
      400,
    );
  }

  const metadata = toRecord(params.transaction.metadata);

  if (
    readString(metadata.product) !== "bopa_business_subscription" ||
    readString(metadata.business_subscription_id) !==
      params.payment.business_subscription_id ||
    readString(metadata.billing_interval) !== params.payment.billing_interval ||
    readString(metadata.paystack_plan_code) !==
      params.payment.paystack_plan_code
  ) {
    throw new AppError(
      "SUBSCRIPTION_METADATA_MISMATCH",
      "Subscription payment details do not match this company.",
      400,
    );
  }
}

export async function activateBusinessSubscriptionPayment(params: {
  payment: BusinessSubscriptionPaymentRow;
  transaction: PaystackVerifiedTransaction;
}) {
  assertVerifiedPaymentDetails(params);

  if (params.transaction.status !== "success") {
    throw new AppError(
      "SUBSCRIPTION_PAYMENT_NOT_SUCCESSFUL",
      "Subscription payment has not been completed.",
      400,
    );
  }

  const supabase = createSupabaseAdminClient();
  const subscription = await getBusinessSubscriptionById(
    supabase,
    params.payment.business_subscription_id,
  );

  if (!subscription) {
    throw new AppError(
      "BUSINESS_SUBSCRIPTION_NOT_FOUND",
      "Company subscription could not be found.",
      404,
    );
  }

  if (params.payment.status === "paid") {
    return subscription;
  }

  const paidAt = new Date(params.transaction.paid_at ?? new Date());
  const periodEnd = addBillingPeriod(paidAt, params.payment.billing_interval);
  const verifiedPayload = toRecord(params.transaction);

  await upsertPaidBusinessSubscriptionPayment(supabase, {
    businessSubscriptionId: subscription.id,
    ownerProfileId: subscription.owner_profile_id,
    paymentReference: params.payment.payment_reference,
    billingInterval: params.payment.billing_interval,
    expectedAmountKobo: params.payment.expected_amount_kobo,
    paystackPlanCode: params.payment.paystack_plan_code,
    paystackTransactionId: params.transaction.id ?? null,
    paidAt: paidAt.toISOString(),
    verifiedPayload,
    metadata: params.payment.metadata,
  });

  return updateBusinessSubscription(supabase, subscription.id, {
    status: "active",
    billing_interval: params.payment.billing_interval,
    amount_kobo: params.payment.expected_amount_kobo,
    paystack_plan_code: params.payment.paystack_plan_code,
    current_period_start: paidAt.toISOString(),
    current_period_end: periodEnd.toISOString(),
    last_payment_at: paidAt.toISOString(),
    cancel_at_period_end: false,
    cancelled_at: null,
  });
}

export async function recordRecurringBusinessSubscriptionPayment(params: {
  subscription: BusinessSubscriptionRow;
  transaction: PaystackVerifiedTransaction;
  plan: BusinessSubscriptionPlan;
}) {
  if (params.transaction.status !== "success") {
    throw new AppError(
      "SUBSCRIPTION_PAYMENT_NOT_SUCCESSFUL",
      "Subscription renewal payment was not successful.",
      400,
    );
  }

  if (
    params.transaction.amount !== params.plan.amountKobo ||
    params.transaction.currency.toUpperCase() !== "NGN"
  ) {
    throw new AppError(
      "SUBSCRIPTION_RENEWAL_MISMATCH",
      "Subscription renewal amount does not match.",
      400,
    );
  }

  if (
    params.subscription.workspace_type !== params.plan.workspaceType ||
    (params.subscription.paystack_plan_code &&
      params.subscription.paystack_plan_code !== params.plan.planCode)
  ) {
    throw new AppError(
      "SUBSCRIPTION_PLAN_MISMATCH",
      "Subscription renewal plan does not match this company.",
      400,
    );
  }

  const paidAt = new Date(params.transaction.paid_at ?? new Date());
  const periodEnd = addBillingPeriod(paidAt, params.plan.billingInterval);
  const supabase = createSupabaseAdminClient();

  await upsertPaidBusinessSubscriptionPayment(supabase, {
    businessSubscriptionId: params.subscription.id,
    ownerProfileId: params.subscription.owner_profile_id,
    paymentReference: params.transaction.reference,
    billingInterval: params.plan.billingInterval,
    expectedAmountKobo: params.plan.amountKobo,
    paystackPlanCode: params.plan.planCode,
    paystackTransactionId: params.transaction.id ?? null,
    paidAt: paidAt.toISOString(),
    verifiedPayload: toRecord(params.transaction),
    metadata: {
      product: "bopa_business_subscription",
      payment_type: "automatic_renewal",
      business_subscription_id: params.subscription.id,
    },
  });

  return updateBusinessSubscription(supabase, params.subscription.id, {
    status: "active",
    billing_interval: params.plan.billingInterval,
    amount_kobo: params.plan.amountKobo,
    paystack_plan_code: params.plan.planCode,
    current_period_start: paidAt.toISOString(),
    current_period_end: periodEnd.toISOString(),
    last_payment_at: paidAt.toISOString(),
    cancel_at_period_end: false,
    cancelled_at: null,
  });
}

export async function verifyBusinessSubscriptionPayment(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
  paymentReference: string;
}) {
  const context = await getBusinessWorkspaceContextForProfile(params);
  assertOwner(context);

  const supabase = createSupabaseAdminClient();
  const payment = await getBusinessSubscriptionPaymentByReference(
    supabase,
    params.paymentReference,
  );

  if (!payment || payment.owner_profile_id !== context.ownerProfileId) {
    throw new AppError(
      "SUBSCRIPTION_PAYMENT_NOT_FOUND",
      "Subscription payment could not be found.",
      404,
    );
  }

  if (payment.status === "paid") {
    const subscription = await getBusinessSubscriptionById(
      supabase,
      payment.business_subscription_id,
    );

    if (!subscription) {
      throw new AppError(
        "BUSINESS_SUBSCRIPTION_NOT_FOUND",
        "Company subscription could not be found.",
        404,
      );
    }

    return { payment, subscription };
  }

  const transaction = await verifyPaystackTransaction(params.paymentReference);

  if (transaction.status !== "success") {
    const failureStatus =
      transaction.status === "abandoned" ? "abandoned" : "failed";

    await updateBusinessSubscriptionPayment(supabase, payment.id, {
      status: failureStatus,
      failure_reason: `Paystack transaction status: ${transaction.status}`,
      verified_payload: transaction,
    });

    throw new AppError(
      "SUBSCRIPTION_PAYMENT_NOT_SUCCESSFUL",
      "Subscription payment has not been completed.",
      400,
    );
  }

  const subscription = await activateBusinessSubscriptionPayment({
    payment,
    transaction,
  });

  const paidPayment = await getBusinessSubscriptionPaymentByReference(
    supabase,
    params.paymentReference,
  );

  if (!paidPayment) {
    throw new AppError(
      "SUBSCRIPTION_PAYMENT_NOT_FOUND",
      "Subscription payment could not be found.",
      404,
    );
  }

  return { payment: paidPayment, subscription };
}

export async function getBusinessSubscriptionManageUrl(params: {
  profileId: string;
  workspaceType: BusinessWorkspaceType;
}) {
  const context = await getBusinessWorkspaceContextForProfile(params);
  assertOwner(context);
  const subscription = await ensureBusinessSubscription(context);

  if (!subscription.paystack_subscription_code) {
    throw new AppError(
      "PAYSTACK_SUBSCRIPTION_MISSING",
      "Subscription billing is not ready yet. Please refresh shortly.",
      400,
    );
  }

  const result = await getPaystackSubscriptionManageLink(
    subscription.paystack_subscription_code,
  );

  return result.link;
}

export function getPaystackPlanCodeFromValue(value: unknown) {
  if (typeof value === "string") {
    return readString(value);
  }

  const record = toRecord(value);
  return readString(record.plan_code) ?? readString(record.planCode);
}
