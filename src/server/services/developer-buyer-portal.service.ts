import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createBuyerSaleAccessToken,
  getActiveBuyerSaleAccessTokenByHash,
  markBuyerSaleAccessTokenUsed,
  revokeActiveBuyerSaleAccessTokens,
} from "@/server/repositories/developer-buyer-sale-access-tokens.repository";
import {
  getActiveDeveloperPaymentPlanForSale,
  listDeveloperPaymentScheduleItemsForSale,
} from "@/server/repositories/developer-payment-plans.repository";
import { listDeveloperSalePaymentsForSale } from "@/server/repositories/developer-sale-payments.repository";
import { getDeveloperSaleById } from "@/server/repositories/developer-sales.repository";
import { createSignedDeveloperPaymentReceiptPdfUrl } from "@/server/services/storage.service";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperBuyerPortalSaleDetails = {
  id: string;
  developer_account_id: string;
  sale_reference: string;
  payment_plan_mode: string;
  total_price_locked: number;
  initial_deposit_amount: number;
  sale_date: string;
  expected_completion_date: string | null;
  status: string;
  developer_estates: {
    id: string;
    estate_name: string;
    location: string;
    city: string | null;
    state: string | null;
    lga: string | null;
  } | null;
  developer_plots: {
    id: string;
    plot_number: string;
    size_label: string;
    price: number;
    status: string;
  } | null;
  developer_buyers: {
    id: string;
    full_name: string;
    phone_number: string;
    email: string | null;
  } | null;
};

const BUYER_PORTAL_SALE_SELECT = `
  id,
  developer_account_id,
  sale_reference,
  payment_plan_mode,
  total_price_locked,
  initial_deposit_amount,
  sale_date,
  expected_completion_date,
  status,
  developer_estates (
    id,
    estate_name,
    location,
    city,
    state,
    lga
  ),
  developer_plots (
    id,
    plot_number,
    size_label,
    price,
    status
  ),
  developer_buyers (
    id,
    full_name,
    phone_number,
    email
  )
`;

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

function createRawBuyerPortalToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashBuyerPortalToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createBuyerSalePortalLink(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  developerProfileId: string;
  saleId: string;
}) {
  const sale = await getDeveloperSaleById(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: params.saleId,
  });

  if (!sale) {
    throw new AppError("DEVELOPER_SALE_NOT_FOUND", "Sale was not found.", 404);
  }

  if (sale.status !== "active") {
    throw new AppError(
      "DEVELOPER_SALE_NOT_ACTIVE",
      "Only active sales can have buyer payment portal links.",
      400,
    );
  }

  await revokeActiveBuyerSaleAccessTokens(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: sale.id,
  });

  const rawToken = createRawBuyerPortalToken();
  const tokenHash = hashBuyerPortalToken(rawToken);

  await createBuyerSaleAccessToken(params.supabase, {
    developerAccountId: params.developerAccountId,
    saleId: sale.id,
    buyerId: sale.buyer_id,
    tokenHash,
    createdByProfileId: params.developerProfileId,
    expiresAt: null,
  });

  return {
    token: rawToken,
    portalUrl: `${getAppUrl()}/dev/buyer/sale/${rawToken}`,
  };
}

export async function getBuyerSalePortalByToken(params: {
  supabase: SupabaseClient;
  token: string;
}) {
  const tokenHash = hashBuyerPortalToken(params.token);
  const accessToken = await getActiveBuyerSaleAccessTokenByHash(
    params.supabase,
    tokenHash,
  );

  if (!accessToken) {
    return null;
  }

  if (
    accessToken.expires_at &&
    new Date(accessToken.expires_at).getTime() < Date.now()
  ) {
    return null;
  }

  const { data: sale, error } = await params.supabase
    .from("developer_sales")
    .select(BUYER_PORTAL_SALE_SELECT)
    .eq("id", accessToken.sale_id)
    .eq("developer_account_id", accessToken.developer_account_id)
    .eq("buyer_id", accessToken.buyer_id)
    .maybeSingle<DeveloperBuyerPortalSaleDetails>();

  if (error) {
    throw error;
  }

  if (!sale) {
    return null;
  }

  await markBuyerSaleAccessTokenUsed(params.supabase, accessToken.id);

  const [paymentPlan, scheduleItems, payments] = await Promise.all([
    getActiveDeveloperPaymentPlanForSale(params.supabase, {
      developerAccountId: accessToken.developer_account_id,
      saleId: sale.id,
    }),
    listDeveloperPaymentScheduleItemsForSale(params.supabase, {
      developerAccountId: accessToken.developer_account_id,
      saleId: sale.id,
    }),
    listDeveloperSalePaymentsForSale(params.supabase, {
      developerAccountId: accessToken.developer_account_id,
      saleId: sale.id,
    }),
  ]);

  const paymentsWithReceiptLinks = await Promise.all(
    payments.map(async (payment) => {
      const receiptDownloadUrl =
        payment.receipt_generated && payment.receipt_path
          ? await createSignedDeveloperPaymentReceiptPdfUrl(
              payment.receipt_path,
            )
          : null;

      return {
        ...payment,
        receiptDownloadUrl,
      };
    }),
  );

  const totalPaid = payments
    .filter((payment) => payment.status === "posted")
    .reduce((total, payment) => total + Number(payment.amount_paid), 0);

  const outstandingBalance = Math.max(
    0,
    Number(sale.total_price_locked) - totalPaid,
  );

  const nextScheduleItem =
    scheduleItems.find(
      (item) =>
        item.status === "pending" ||
        item.status === "part_paid" ||
        item.status === "overdue",
    ) ?? null;

  return {
    sale,
    paymentPlan,
    scheduleItems,
    payments: paymentsWithReceiptLinks,
    summary: {
      totalPrice: Number(sale.total_price_locked),
      totalPaid,
      outstandingBalance,
      nextDueAmount: nextScheduleItem
        ? Math.max(
            0,
            Number(nextScheduleItem.expected_amount) -
              Number(nextScheduleItem.amount_paid),
          )
        : 0,
      nextDueDate: nextScheduleItem?.due_date ?? null,
    },
  };
}
