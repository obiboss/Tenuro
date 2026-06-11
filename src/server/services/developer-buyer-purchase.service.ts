import "server-only";

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import {
  createDeveloperBuyer,
  findDeveloperBuyerByPhone,
  updateDeveloperBuyer,
} from "@/server/repositories/developer-buyers.repository";
import {
  createDeveloperBuyerPurchaseLink,
  getDeveloperBuyerPurchaseLinkByHash,
  markDeveloperBuyerPurchaseLinkPaid,
  markDeveloperBuyerPurchaseLinkPaymentStarted,
  updateDeveloperBuyerPurchaseLinkBuyerDetails,
  type DeveloperBuyerPurchaseLinkRow,
} from "@/server/repositories/developer-buyer-purchase-links.repository";
import { createDeveloperPaymentPlan } from "@/server/repositories/developer-payment-plans.repository";
import { assignDeveloperBuyerToPlot } from "@/server/repositories/developer-plot-assignments.repository";
import { createDeveloperSaleFromAssignment } from "@/server/repositories/developer-sales.repository";
import { getDeveloperEstateById } from "@/server/repositories/developer-estates.repository";
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
  if (!ACTIVE_PURCHASE_LINK_STATUSES.has(link.status) && link.status !== "paid") {
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

function buildPaymentScheduleItems(params: {
  paymentPlanMode: DeveloperPaymentPlanMode;
  firstPaymentAmount: number;
  totalPrice: number;
  scheduleStartDate: string;
}) {
  const firstPayment = Number(params.firstPaymentAmount.toFixed(2));
  const totalPrice = Number(params.totalPrice.toFixed(2));
  const balance = Number((totalPrice - firstPayment).toFixed(2));

  const items = [
    {
      label: "First payment",
      due_date: params.scheduleStartDate,
      expected_amount: firstPayment,
      sort_order: 0,
    },
  ];

  if (balance > 0) {
    const balanceDueDate = new Date(params.scheduleStartDate);
    balanceDueDate.setDate(balanceDueDate.getDate() + 30);

    items.push({
      label:
        params.paymentPlanMode === "flexible"
          ? "Remaining balance"
          : "Next installment",
      due_date: balanceDueDate.toISOString().slice(0, 10),
      expected_amount: balance,
      sort_order: 1,
    });
  }

  return items;
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
  paymentPlanMode: DeveloperPaymentPlanMode;
  firstPaymentAmount: number;
  note: string | null;
}) {
  const estate = await getDeveloperEstateById(params.supabase, {
    developerAccountId: params.developerAccountId,
    estateId: params.estateId,
  });

  if (!estate) {
    throw new AppError("DEVELOPER_ESTATE_NOT_FOUND", "Estate was not found.", 404);
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
  const firstPaymentAmount = Number(params.firstPaymentAmount.toFixed(2));

  if (firstPaymentAmount > totalPrice) {
    throw new AppError(
      "DEVELOPER_FIRST_PAYMENT_TOO_HIGH",
      "First payment cannot exceed the plot price.",
      400,
    );
  }

  if (
    params.paymentPlanMode === "outright" &&
    firstPaymentAmount !== Number(totalPrice.toFixed(2))
  ) {
    throw new AppError(
      "DEVELOPER_OUTRIGHT_PAYMENT_MISMATCH",
      "Full payment requires the first payment to equal the total price.",
      400,
    );
  }

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
    paymentPlanMode: params.paymentPlanMode,
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

async function upsertBuyerFromPurchaseDetails(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  details: SubmitBuyerPurchaseDetailsInput;
}) {
  const phone = normalisePhoneNumber(params.details.phoneNumber);
  const nextOfKinPhone = normalisePhoneNumber(params.details.nextOfKinPhone);
  const email =
    params.details.email.trim().length > 0 ? params.details.email.trim() : null;

  const existingBuyer = await findDeveloperBuyerByPhone(params.supabase, {
    developerAccountId: params.developerAccountId,
    phoneNumber: phone.e164,
  });

  if (existingBuyer) {
    const updatedBuyer = await updateDeveloperBuyer(params.supabase, {
      developerAccountId: params.developerAccountId,
      buyerId: existingBuyer.id,
      fullName: params.details.fullName,
      phoneNumber: phone.e164,
      email,
      nin: params.details.nin,
      nextOfKinName: params.details.nextOfKinName,
      nextOfKinPhone: nextOfKinPhone.e164,
      residentialAddress: params.details.residentialAddress,
      status: "assigned",
    });

    if (!updatedBuyer) {
      throw new AppError(
        "DEVELOPER_BUYER_UPDATE_FAILED",
        "Buyer details could not be saved.",
        500,
      );
    }

    return updatedBuyer;
  }

  return createDeveloperBuyer(params.supabase, {
    developerAccountId: params.developerAccountId,
    fullName: params.details.fullName,
    phoneNumber: phone.e164,
    email,
    nin: params.details.nin,
    nextOfKinName: params.details.nextOfKinName,
    nextOfKinPhone: nextOfKinPhone.e164,
    residentialAddress: params.details.residentialAddress,
  });
}

async function ensureSaleReadyForPayment(params: {
  supabase: SupabaseClient;
  link: DeveloperBuyerPurchaseLinkRow;
  buyerId: string;
}) {
  if (params.link.sale_id && params.link.buyer_id) {
    const { data: sale, error } = await params.supabase
      .from("developer_sales")
      .select("id, status")
      .eq("id", params.link.sale_id)
      .eq("developer_account_id", params.link.developer_account_id)
      .maybeSingle<{ id: string; status: string }>();

    if (error) {
      throw error;
    }

    if (sale?.status === "active") {
      const { data: scheduleItem, error: scheduleError } = await params.supabase
        .from("developer_payment_schedule_items")
        .select("id")
        .eq("developer_account_id", params.link.developer_account_id)
        .eq("sale_id", sale.id)
        .eq("sort_order", 0)
        .maybeSingle<{ id: string }>();

      if (scheduleError) {
        throw scheduleError;
      }

      if (scheduleItem) {
        return {
          saleId: sale.id,
          scheduleItemId: scheduleItem.id,
        };
      }
    }
  }

  const assignment = await assignDeveloperBuyerToPlot(params.supabase, {
    developerAccountId: params.link.developer_account_id,
    estateId: params.link.estate_id,
    plotId: params.link.plot_id,
    buyerId: params.buyerId,
    assignmentNote: params.link.note,
  });

  const saleDate = new Date().toISOString().slice(0, 10);
  const sale = await createDeveloperSaleFromAssignment(params.supabase, {
    developerAccountId: params.link.developer_account_id,
    plotAssignmentId: assignment.id,
    paymentPlanMode: params.link.payment_plan_mode,
    totalPriceLocked: Number(params.link.total_price),
    initialDepositAmount: Number(params.link.first_payment_amount),
    saleDate,
    expectedCompletionDate: null,
    notes: params.link.note,
  });

  const scheduleItems = buildPaymentScheduleItems({
    paymentPlanMode: params.link.payment_plan_mode,
    firstPaymentAmount: Number(params.link.first_payment_amount),
    totalPrice: Number(params.link.total_price),
    scheduleStartDate: saleDate,
  });

  await createDeveloperPaymentPlan(params.supabase, {
    developerAccountId: params.link.developer_account_id,
    saleId: sale.id,
    paymentPlanMode: params.link.payment_plan_mode,
    scheduleStartDate: saleDate,
    notes: params.link.note,
    items: scheduleItems,
  });

  const { data: firstScheduleItem, error: scheduleError } = await params.supabase
    .from("developer_payment_schedule_items")
    .select("id")
    .eq("developer_account_id", params.link.developer_account_id)
    .eq("sale_id", sale.id)
    .eq("sort_order", 0)
    .maybeSingle<{ id: string }>();

  if (scheduleError) {
    throw scheduleError;
  }

  if (!firstScheduleItem) {
    throw new AppError(
      "DEVELOPER_PAYMENT_SCHEDULE_MISSING",
      "Payment schedule could not be prepared.",
      500,
    );
  }

  await markDeveloperBuyerPurchaseLinkPaymentStarted(params.supabase, {
    linkId: params.link.id,
    buyerId: params.buyerId,
    saleId: sale.id,
  });

  return {
    saleId: sale.id,
    scheduleItemId: firstScheduleItem.id,
  };
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

  const updatedLink = await updateDeveloperBuyerPurchaseLinkBuyerDetails(
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

  if (!updatedLink) {
    throw new AppError(
      "BUYER_PURCHASE_DETAILS_NOT_SAVED",
      "Your details could not be saved.",
      400,
    );
  }

  const buyer = await upsertBuyerFromPurchaseDetails({
    supabase: params.supabase,
    developerAccountId: link.developer_account_id,
    details: params.details,
  });

  const { saleId, scheduleItemId } = await ensureSaleReadyForPayment({
    supabase: params.supabase,
    link: updatedLink,
    buyerId: buyer.id,
  });

  const trustedAmount = Number(link.first_payment_amount.toFixed(2));

  const intent = await createDeveloperPaymentRequest({
    supabase: params.supabase,
    developerAccountId: link.developer_account_id,
    saleId,
    scheduleItemId,
    amount: trustedAmount,
    buyerEmail:
      params.details.email.trim().length > 0
        ? params.details.email.trim()
        : link.buyer_email,
    purchaseLinkId: link.id,
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
    purchaseLinkId: link.id,
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

  if (!purchaseLink || purchaseLink.status === "paid") {
    const { data: existingToken } = await params.supabase
      .from("developer_buyer_sale_access_tokens")
      .select("id")
      .eq("developer_account_id", params.developerAccountId)
      .eq("sale_id", params.saleId)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingToken) {
      return null;
    }
  } else {
    await markDeveloperBuyerPurchaseLinkPaid(
      params.supabase,
      params.purchaseLinkId,
    );
  }

  if (!purchaseLink?.created_by_profile_id) {
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
