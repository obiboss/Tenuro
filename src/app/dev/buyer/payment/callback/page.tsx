import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { TrustNotice } from "@/components/ui/trust-notice";
import { errorResult } from "@/server/errors/result";
import { getDeveloperPaymentIntentByReference } from "@/server/repositories/developer-payment-intents.repository";
import { markDeveloperBuyerPurchaseLinkPaid } from "@/server/repositories/developer-buyer-purchase-links.repository";
import { createBuyerSalePortalLink } from "@/server/services/developer-buyer-portal.service";
import { verifyAndPostDeveloperPaymentReference } from "@/server/services/developer-payment.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type BuyerPaymentCallbackPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
    portalToken?: string | string[];
  }>;
};

type BuyerPaymentCallbackState =
  | {
      status: "missing_reference";
      title: string;
      message: string;
      buyerPortalUrl: string | null;
    }
  | {
      status: "failed";
      title: string;
      message: string;
      buyerPortalUrl: string | null;
    }
  | {
      status: "verified";
      title: string;
      message: string;
      buyerPortalUrl: string | null;
    };

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined;
  }

  return value?.trim() || undefined;
}

function resolvePaymentReference(params: {
  reference?: string;
  trxref?: string;
}) {
  const candidates = [params.trxref, params.reference]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const bopaReference = candidates.find((value) =>
    /^BPD-[A-Z0-9]+$/i.test(value),
  );

  return bopaReference ?? candidates[0];
}

function buildBuyerPortalUrl(portalToken: string | undefined) {
  if (!portalToken) {
    return null;
  }

  return `/dev/buyer/sale/${encodeURIComponent(portalToken)}`;
}

function BuyerPaymentLogo() {
  return (
    <Link href="/" className="mb-8 flex w-fit items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold tracking-tight text-white shadow-soft">
        B
      </div>

      <div>
        <p className="text-lg font-extrabold tracking-tight text-text-strong">
          Boldverse Property
        </p>
        <p className="text-xs font-semibold text-text-muted">Buyer payment</p>
      </div>
    </Link>
  );
}

async function recoverBuyerPortalUrlFromPaidIntent(params: {
  supabase: SupabaseClient;
  reference: string;
}) {
  const intent = await getDeveloperPaymentIntentByReference(
    params.supabase,
    params.reference,
  );

  if (!intent || intent.status !== "paid") {
    return null;
  }

  const purchaseLinkId =
    typeof intent.metadata.purchase_link_id === "string"
      ? intent.metadata.purchase_link_id
      : null;

  if (!purchaseLinkId) {
    return null;
  }

  const { data: purchaseLink, error } = await params.supabase
    .from("developer_buyer_purchase_links")
    .select("id, status, created_by_profile_id, sale_id, developer_account_id")
    .eq("id", purchaseLinkId)
    .maybeSingle<{
      id: string;
      status: string;
      created_by_profile_id: string | null;
      sale_id: string | null;
      developer_account_id: string;
    }>();

  if (error) {
    throw error;
  }

  if (!purchaseLink?.created_by_profile_id) {
    return null;
  }

  if (purchaseLink.status !== "paid") {
    await markDeveloperBuyerPurchaseLinkPaid(params.supabase, purchaseLink.id);
  }

  const portal = await createBuyerSalePortalLink({
    supabase: params.supabase,
    developerAccountId: intent.developer_account_id,
    developerProfileId: purchaseLink.created_by_profile_id,
    saleId: intent.sale_id,
  });

  return portal.portalUrl;
}

async function resolveBuyerPaymentCallbackState(params: {
  reference: string | undefined;
  portalToken: string | undefined;
}): Promise<BuyerPaymentCallbackState> {
  const buyerPortalUrlFromToken = buildBuyerPortalUrl(params.portalToken);

  if (!params.reference) {
    return {
      status: "missing_reference",
      title: "Payment reference missing",
      message:
        "Your payment may have gone through, but BOPA could not find the payment reference on this page. Use your buyer portal link to check your payment status.",
      buyerPortalUrl: buyerPortalUrlFromToken,
    };
  }

  const supabase = createSupabaseAdminClient();

  try {
    const result = await verifyAndPostDeveloperPaymentReference({
      supabase,
      reference: params.reference,
    });

    const recoveredBuyerPortalUrl =
      result.buyerPortalUrl ||
      buyerPortalUrlFromToken ||
      (await recoverBuyerPortalUrlFromPaidIntent({
        supabase,
        reference: params.reference,
      }));

    return {
      status: "verified",
      title: "Payment successful",
      message:
        "Your payment has been received and posted. Use your buyer portal to view your payment history, download receipts and documents, check your balance, and make your next payment.",
      buyerPortalUrl: recoveredBuyerPortalUrl,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      status: "failed",
      title: "Check your payment status",
      message:
        result.message ||
        "We could not complete automatic verification. Use your buyer portal to check whether this payment has been posted.",
      buyerPortalUrl: buyerPortalUrlFromToken,
    };
  }
}

export default async function BuyerPaymentCallbackPage({
  searchParams,
}: BuyerPaymentCallbackPageProps) {
  const resolvedSearchParams = await searchParams;

  const reference = resolvePaymentReference({
    reference: getSearchParamValue(resolvedSearchParams.reference),
    trxref: getSearchParamValue(resolvedSearchParams.trxref),
  });

  const portalToken = getSearchParamValue(resolvedSearchParams.portalToken);

  const pageState = await resolveBuyerPaymentCallbackState({
    reference,
    portalToken,
  });

  const isSuccessful = pageState.status === "verified";

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <BuyerPaymentLogo />

        <PageHeader
          title={pageState.title}
          description={
            isSuccessful
              ? "Continue to your buyer portal for your full purchase record."
              : "Use your buyer portal to confirm your payment status."
          }
        />

        <SectionCard title={pageState.title} description={pageState.message}>
          <TrustNotice
            title={
              isSuccessful
                ? "Payment posted successfully"
                : "Buyer portal needed"
            }
            description={pageState.message}
            icon={
              isSuccessful ? (
                <CheckCircle2 aria-hidden="true" size={22} />
              ) : (
                <AlertTriangle aria-hidden="true" size={22} />
              )
            }
          />

          {pageState.buyerPortalUrl ? (
            <Link
              href={pageState.buyerPortalUrl}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-button bg-primary px-5 py-3 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Open buyer portal
            </Link>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-800">
              Your payment was received, but BOPA could not open your buyer
              portal automatically. Ask the developer to resend your buyer
              portal link so you can view your payment history, receipts,
              documents, balance, and next payment.
            </div>
          )}
        </SectionCard>
      </section>
    </main>
  );
}
