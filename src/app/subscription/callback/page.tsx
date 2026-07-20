import Link from "next/link";
import { CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import type { BusinessWorkspaceType } from "@/constants/business-subscription";
import { errorResult } from "@/server/errors/result";
import { getSessionUser } from "@/server/services/auth.service";
import { verifyBusinessSubscriptionPayment } from "@/server/services/business-subscription.service";

type BusinessSubscriptionCallbackPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  const values = (Array.isArray(value) ? value : [value])
    .map((entry) => entry?.trim() ?? "")
    .filter(Boolean);
  const uniqueValues = Array.from(new Set(values));

  return uniqueValues.length === 1 ? uniqueValues[0] : null;
}

function formatNairaFromKobo(amountKobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountKobo / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "long",
  }).format(new Date(value));
}

export default async function BusinessSubscriptionCallbackPage({
  searchParams,
}: BusinessSubscriptionCallbackPageProps) {
  const query = await searchParams;
  const reference =
    getSingleValue(query.reference) ?? getSingleValue(query.trxref);
  const user = await getSessionUser();
  const workspaceType: BusinessWorkspaceType | null =
    user?.role === "manager"
      ? "manager"
      : user?.role === "developer"
        ? "developer"
        : null;
  const subscriptionPath = workspaceType
    ? `/${workspaceType}/subscription`
    : "/";

  let errorMessage: string | null = null;
  let verified: Awaited<
    ReturnType<typeof verifyBusinessSubscriptionPayment>
  > | null = null;

  if (!reference) {
    errorMessage = "Subscription payment reference is missing.";
  } else if (!user || !workspaceType) {
    errorMessage =
      "Sign in to your manager or developer account to confirm this payment.";
  } else {
    try {
      verified = await verifyBusinessSubscriptionPayment({
        profileId: user.id,
        workspaceType,
        paymentReference: reference,
      });
    } catch (error) {
      errorMessage = errorResult(error).message;
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-card border border-border-soft bg-white p-6 text-center shadow-sm md:p-8">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            verified
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {verified ? (
            <CheckCircle2 aria-hidden="true" size={28} strokeWidth={2.7} />
          ) : (
            <TriangleAlert aria-hidden="true" size={28} strokeWidth={2.7} />
          )}
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-strong">
          {verified
            ? "Subscription payment confirmed"
            : "Payment not confirmed"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
          {verified
            ? "Your company workspace is active and automatic renewal is enabled."
            : errorMessage}
        </p>

        {verified ? (
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-card bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Amount paid
              </p>
              <p className="mt-2 font-black text-text-strong">
                {formatNairaFromKobo(verified.payment.expected_amount_kobo)}
              </p>
            </div>
            <div className="rounded-card bg-background p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Access until
              </p>
              <p className="mt-2 font-black text-text-strong">
                {formatDate(verified.subscription.current_period_end)}
              </p>
            </div>
          </div>
        ) : null}

        <Link
          href={subscriptionPath}
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-button bg-primary px-5 py-3 text-sm font-black text-white transition hover:bg-primary-hover"
        >
          <CreditCard aria-hidden="true" size={18} strokeWidth={2.6} />
          {workspaceType ? "Return to subscription" : "Return to BOPA"}
        </Link>
      </section>
    </main>
  );
}
