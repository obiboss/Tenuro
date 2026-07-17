import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import {
  createDeveloperBuyerPurchaseLink,
  getDeveloperBuyerPurchaseLinkByHash,
  markDeveloperBuyerPurchaseLinkPaid,
  prepareBuyerPurchaseSaleFromLink,
  updateDeveloperBuyerPurchaseLinkBuyerDetails,
  type DeveloperBuyerPurchaseLinkRow,
} from "@/server/repositories/developer-buyer-purchase-links.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
import { getDeveloperPaymentScheduleItemById } from "@/server/repositories/developer-payment-plans.repository";
import { createBuyerSalePortalLink } from "@/server/services/developer-buyer-portal.service";
import { createDeveloperPaymentRequest } from "@/server/services/developer-payment.service";
import type { DeveloperPaymentPlanMode } from "@/server/validators/developer-payment-plan.schema";
import type { SubmitBuyerPurchaseDetailsInput } from "@/server/validators/developer-buyer-purchase.schema";
import { normalisePhoneNumber } from "@/server/utils/phone";

const ACTIVE_PURCHASE_LINK_STATUSES = new Set([
  "pending",
  "details_submitted",
  "payment_started",
]);

const PURCHASE_LINK_TTL_DAYS = 30;

function getAppUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!appUrl) {
    throw new AppError(
      "APP_URL_MISSING",
      "Application URL is not configured.",
      500,
    );
  }

  return appUrl.replace(/\/$/, "");
}

function createRawPurchaseToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashBuyerPurchaseToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getPurchaseLinkExpiryDate() {
  return new Date(
    Date.now() + PURCHASE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function getPaymentPlanModeLabel(mode: DeveloperPaymentPlanMode) {
  if (mode === "outright") {
    return "Full payment";
  }

  if (mode === "fixed_installment") {
    return "Fixed installment";
  }

  return "Flexible payment";
}

function assertPurchaseLinkIsUsable(link: {
  status: string;
  expires_at: string | null;
}) {
  if (
    !ACTIVE_PURCHASE_LINK_STATUSES.has(link.status) &&
    link.status !== "paid"
  ) {
    throw new AppError(
      "BUYER_PURCHASE_LINK_INACTIVE",
      "This purchase link is no longer active.",
      400,
    );
  }

  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
    throw new AppError(
      "BUYER_PURCHASE_LINK_EXPIRED",
      "This purchase link has expired.",
      410,
    );
  }
}

function buildBuyerPurchasePaymentCallbackUrl(reference: string) {
  return `${getAppUrl()}/dev/buyer/payment/callback?reference=${encodeURIComponent(
    reference,
  )}`;
}

function calculateEstateFirstPayment(params: {
  totalPrice: number;
  initialPaymentPercentage: number;
}) {
  if (params.initialPaymentPercentage >= 100) {
    return Number(params.totalPrice.toFixed(2));
  }

  return Number(
    ((params.totalPrice * params.initialPaymentPercentage) / 100).toFixed(2),
  );
}

function getTrustedScheduleOutstandingAmount(params: {
  expectedAmount: number | string;
  amountPaid: number | string;
}) {
  return Number(
    Math.max(
      0,
      Number(params.expectedAmount) - Number(params.amountPaid),
    ).toFixed(2),
  );
}

export async function startDeveloperBuyerPurchase(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  developerProfileId: string;
  estateId: string;
  plotId: string;
  buyerPhone: string;
  buyerName: string | null;
  buyerEmail: string | null;
  note: string | null;
}) {
  const estate = await getDeveloperEstateById(params.supabase, {
    developerAccountId: params.developerAccountId,
    estateId: params.estateId,
  });

  if (!estate) {
    throw new AppError(
      "DEVELOPER_ESTATE_NOT_FOUND",
      "Estate was not found.",
      404,
    );
  }

  const { data: plot, error: plotError } = await params.supabase
    .from("developer_plots")
    .select("id, price, status")
    .eq("developer_account_id", params.developerAccountId)
    .eq("estate_id", params.estateId)
    .eq("id", params.plotId)
    .maybeSingle<{ id: string; price: number; status: string }>();

  if (plotError) {
    throw plotError;
  }

  if (!plot) {
    throw new AppError("DEVELOPER_PLOT_NOT_FOUND", "Plot was not found.", 404);
  }

  if (plot.status !== "available") {
    throw new AppError(
      "DEVELOPER_PLOT_NOT_AVAILABLE",
      "This plot is not available to reserve.",
      400,
    );
  }

  const totalPrice = Number(plot.price);
  const firstPaymentAmount = calculateEstateFirstPayment({
    totalPrice,
    initialPaymentPercentage: Number(estate.initial_payment_percentage),
  });

  if (firstPaymentAmount <= 0 || firstPaymentAmount > totalPrice) {
    throw new AppError(
      "DEVELOPER_ESTATE_PAYMENT_RULE_INVALID",
      "Estate payment rule is not valid for this plot price.",
      400,
    );
  }

  const paymentPlanMode: DeveloperPaymentPlanMode =
    firstPaymentAmount >= totalPrice ? "outright" : "fixed_installment";

  const buyerPhone = normalisePhoneNumber(params.buyerPhone);
  const rawToken = createRawPurchaseToken();
  const tokenHash = hashBuyerPurchaseToken(rawToken);

  await createDeveloperBuyerPurchaseLink(params.supabase, {
    developerAccountId: params.developerAccountId,
    estateId: params.estateId,
    plotId: params.plotId,
    tokenHash,
    buyerPhone: buyerPhone.e164,
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    paymentPlanMode,
    firstPaymentAmount,
    totalPrice,
    note: params.note,
    createdByProfileId: params.developerProfileId,
    expiresAt: getPurchaseLinkExpiryDate(),
  });

  return {
    token: rawToken,
    purchaseUrl: `${getAppUrl()}/dev/buyer/purchase/${rawToken}`,
  };
}

export async function getBuyerPurchaseByToken(params: {
  supabase: SupabaseClient;
  token: string;
}) {
  const token = params.token.trim();

  if (!token) {
    return null;
  }

  const link = await getDeveloperBuyerPurchaseLinkByHash(
    params.supabase,
    hashBuyerPurchaseToken(token),
  );

  if (!link) {
    return null;
  }

  if (
    link.expires_at &&
    new Date(link.expires_at).getTime() < Date.now() &&
    link.status !== "paid"
  ) {
    return null;
  }

  if (link.status === "cancelled" || link.status === "expired") {
    return null;
  }

  const balanceAfterFirstPayment = Math.max(
    0,
    Number(link.total_price) - Number(link.first_payment_amount),
  );

  return {
    link,
    summary: {
      estateName: link.developer_estates?.estate_name ?? "Estate",
      estateLocation: [
        link.developer_estates?.location,
        link.developer_estates?.city,
        link.developer_estates?.state,
      ]
        .filter(Boolean)
        .join(", "),
      plotNumber: link.developer_plots?.plot_number ?? "Plot",
      plotSize: link.developer_plots?.size_label ?? "—",
      totalPrice: Number(link.total_price),
      firstPaymentAmount: Number(link.first_payment_amount),
      balanceAfterFirstPayment,
      paymentPlanLabel: getPaymentPlanModeLabel(link.payment_plan_mode),
    },
    prefilled: {
      fullName: link.buyer_full_name ?? link.buyer_name ?? "",
      phoneNumber: link.buyer_phone,
      email: link.buyer_email ?? "",
    },
  };
}

async function ensureSaleReadyForPayment(params: {
  supabase: SupabaseClient;
  link: DeveloperBuyerPurchaseLinkRow;
  details: SubmitBuyerPurchaseDetailsInput;
}) {
  const phone = normalisePhoneNumber(params.details.phoneNumber);
  const nextOfKinPhone = normalisePhoneNumber(params.details.nextOfKinPhone);
  const email =
    params.details.email.trim().length > 0 ? params.details.email.trim() : null;

  return prepareBuyerPurchaseSaleFromLink(params.supabase, {
    purchaseLinkId: params.link.id,
    buyerFullName: params.details.fullName,
    buyerPhone: phone.e164,
    buyerEmail: email,
    buyerNin: params.details.nin,
    buyerAddress: params.details.residentialAddress,
    buyerNextOfKinName: params.details.nextOfKinName,
    buyerNextOfKinPhone: nextOfKinPhone.e164,
  });
}

export async function initiateBuyerPurchasePayment(params: {
  supabase: SupabaseClient;
  token: string;
  details: SubmitBuyerPurchaseDetailsInput;
}) {
  const link = await getDeveloperBuyerPurchaseLinkByHash(
    params.supabase,
    hashBuyerPurchaseToken(params.token.trim()),
  );

  if (!link) {
    throw new AppError(
      "BUYER_PURCHASE_LINK_INVALID",
      "This purchase link is invalid.",
      404,
    );
  }

  assertPurchaseLinkIsUsable(link);

  let updatedLink: DeveloperBuyerPurchaseLinkRow = link;

  if (link.status !== "payment_started") {
    const savedLink = await updateDeveloperBuyerPurchaseLinkBuyerDetails(
      params.supabase,
      {
        linkId: link.id,
        buyerFullName: params.details.fullName,
        buyerPhone: normalisePhoneNumber(params.details.phoneNumber).e164,
        buyerEmail:
          params.details.email.trim().length > 0
            ? params.details.email.trim()
            : null,
        buyerNin: params.details.nin,
        buyerAddress: params.details.residentialAddress,
        buyerNextOfKinName: params.details.nextOfKinName,
        buyerNextOfKinPhone: normalisePhoneNumber(params.details.nextOfKinPhone)
          .e164,
      },
    );

    if (!savedLink) {
      throw new AppError(
        "BUYER_PURCHASE_DETAILS_NOT_SAVED",
        "Your details could not be saved.",
        400,
      );
    }

    updatedLink = savedLink;
  }

  const { saleId, scheduleItemId } = await ensureSaleReadyForPayment({
    supabase: params.supabase,
    link: updatedLink,
    details: params.details,
  });

  const scheduleItem = await getDeveloperPaymentScheduleItemById(
    params.supabase,
    {
      developerAccountId: updatedLink.developer_account_id,
      saleId,
      scheduleItemId,
    },
  );

  if (!scheduleItem) {
    throw new AppError(
      "BUYER_PURCHASE_SCHEDULE_ITEM_NOT_FOUND",
      "Payment schedule could not be prepared.",
      400,
    );
  }

  const trustedAmount = getTrustedScheduleOutstandingAmount({
    expectedAmount: scheduleItem.expected_amount,
    amountPaid: scheduleItem.amount_paid,
  });

  if (trustedAmount <= 0) {
    throw new AppError(
      "BUYER_PURCHASE_SCHEDULE_ITEM_ALREADY_PAID",
      "This payment has already been completed.",
      400,
    );
  }

  const intent = await createDeveloperPaymentRequest({
    supabase: params.supabase,
    developerAccountId: updatedLink.developer_account_id,
    saleId,
    scheduleItemId,
    amount: trustedAmount,
    buyerEmail:
      params.details.email.trim().length > 0
        ? params.details.email.trim()
        : updatedLink.buyer_email,
    purchaseLinkId: updatedLink.id,
    callbackUrlBuilder: buildBuyerPurchasePaymentCallbackUrl,
    idempotencyScope: `buyer-purchase:${updatedLink.id}`,
  });

  if (!intent.authorization_url) {
    throw new AppError(
      "DEVELOPER_PAYMENT_AUTHORIZATION_URL_MISSING",
      "Payment could not be initialized.",
      500,
    );
  }

  return {
    authorizationUrl: intent.authorization_url,
    reference: intent.paystack_reference,
    purchaseLinkId: updatedLink.id,
  };
}

export async function completeBuyerPurchaseAfterPayment(params: {
  supabase: SupabaseClient;
  purchaseLinkId: string;
  developerAccountId: string;
  saleId: string;
}) {
  const { data: purchaseLink, error: purchaseLinkError } = await params.supabase
    .from("developer_buyer_purchase_links")
    .select("id, status, created_by_profile_id")
    .eq("id", params.purchaseLinkId)
    .maybeSingle<{
      id: string;
      status: string;
      created_by_profile_id: string | null;
    }>();

  if (purchaseLinkError) {
    throw purchaseLinkError;
  }

  if (!purchaseLink) {
    return null;
  }

  if (purchaseLink.status !== "paid") {
    await markDeveloperBuyerPurchaseLinkPaid(
      params.supabase,
      params.purchaseLinkId,
    );
  }

  if (!purchaseLink.created_by_profile_id) {
    return null;
  }

  const portal = await createBuyerSalePortalLink({
    supabase: params.supabase,
    developerAccountId: params.developerAccountId,
    developerProfileId: purchaseLink.created_by_profile_id,
    saleId: params.saleId,
  });

  return portal;
}

export async function tryCompletePurchaseFromPaymentIntent(params: {
  supabase: SupabaseClient;
  intent: {
    status: string;
    sale_id: string;
    developer_account_id: string;
    metadata: Record<string, unknown>;
  };
}) {
  if (params.intent.status !== "paid") {
    return null;
  }

  const purchaseLinkId =
    typeof params.intent.metadata.purchase_link_id === "string"
      ? params.intent.metadata.purchase_link_id
      : null;

  if (!purchaseLinkId) {
    return null;
  }

  return completeBuyerPurchaseAfterPayment({
    supabase: params.supabase,
    purchaseLinkId,
    developerAccountId: params.intent.developer_account_id,
    saleId: params.intent.sale_id,
  });
}
