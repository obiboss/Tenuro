import Link from "next/link";
import {
  getManagerPaystackCallbackState,
  type ManagerPaystackCallbackState,
} from "@/server/services/manager-paystack.service";

type ManagerPaystackCallbackPageProps = {
  searchParams: Promise<{
    reference?: string | string[];
    trxref?: string | string[];
  }>;
};

type CallbackQueryValue = string | string[] | undefined;
type LocalCallbackState = {
  ok: false;
  kind: "invalid";
  status: "missing_reference" | "invalid_reference";
  message: string;
};
type CallbackPageState = ManagerPaystackCallbackState | LocalCallbackState;
type ResolvedCallbackReference =
  | {
      reference: string;
      status: "valid_reference";
      message: string;
    }
  | {
      reference: null;
      status: "missing_reference" | "invalid_reference";
      message: string;
    };

function normaliseSingleQueryValue(value: CallbackQueryValue) {
  const values = (Array.isArray(value) ? value : [value])
    .map((entry) => entry?.trim() ?? "")
    .filter((entry) => entry.length > 0);

  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length === 0) {
    return {
      isValid: true,
      value: null,
    };
  }

  if (uniqueValues.length === 1) {
    return {
      isValid: true,
      value: uniqueValues[0],
    };
  }

  return {
    isValid: false,
    value: null,
  };
}

function resolveCallbackReference(params: {
  reference: CallbackQueryValue;
  trxref: CallbackQueryValue;
}): ResolvedCallbackReference {
  const reference = normaliseSingleQueryValue(params.reference);
  const trxref = normaliseSingleQueryValue(params.trxref);

  if (!reference.isValid || !trxref.isValid) {
    return {
      reference: null,
      status: "invalid_reference" as const,
      message:
        "We could not confirm this payment reference. Please return to your manager workspace or contact support.",
    };
  }

  if (reference.value && trxref.value && reference.value !== trxref.value) {
    return {
      reference: null,
      status: "invalid_reference" as const,
      message:
        "We could not confirm this payment reference. Please return to your manager workspace or contact support.",
    };
  }

  if (!reference.value && !trxref.value) {
    return {
      reference: null,
      status: "missing_reference" as const,
      message: "Payment reference is missing.",
    };
  }

  const resolvedReference = reference.value ?? trxref.value;

  if (!resolvedReference) {
    return {
      reference: null,
      status: "missing_reference" as const,
      message: "Payment reference is missing.",
    };
  }

  return {
    reference: resolvedReference,
    status: "valid_reference" as const,
    message: "Payment reference is missing.",
  };
}

function getCallbackPageCopy(state: CallbackPageState) {
  switch (state.kind) {
    case "success":
      return {
        heading: "Payment confirmed",
        message: state.message,
      };

    case "pending":
      return {
        heading: "Payment not confirmed yet",
        message: state.message,
      };

    case "failed":
      return {
        heading: "Payment was not successful",
        message: state.message,
      };

    case "invalid":
      return {
        heading: "Payment issue found",
        message: state.message,
      };
  }
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not stated";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-surface p-3 text-left">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-text-strong">
        {value}
      </p>
    </div>
  );
}

export default async function ManagerPaystackCallbackPage({
  searchParams,
}: ManagerPaystackCallbackPageProps) {
  const resolvedSearchParams = await searchParams;
  const callbackReference = resolveCallbackReference({
    reference: resolvedSearchParams.reference,
    trxref: resolvedSearchParams.trxref,
  });

  let state: CallbackPageState;

  if (callbackReference.reference !== null) {
    state = await getManagerPaystackCallbackState(
      callbackReference.reference,
    );
  } else {
    state = {
      ok: false,
      kind: "invalid",
      status: callbackReference.status,
      message: callbackReference.message,
    };
  }
  const pageCopy = getCallbackPageCopy(state);

  const successState = state.kind === "success" ? state : null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-card border border-border-soft bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white">
          B
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-strong">
          {pageCopy.heading}
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
          {pageCopy.message}
        </p>

        {successState?.summary ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <SummaryItem label="Tenant" value={successState.summary.tenantName} />
            <SummaryItem
              label="Property and unit"
              value={`${successState.summary.propertyName} - ${successState.summary.unitLabel}`}
            />
            <SummaryItem
              label="Total paid"
              value={formatNaira(successState.summary.totalPaid)}
            />
            <SummaryItem
              label="Payment date"
              value={formatDate(successState.summary.paymentDate)}
            />
            <SummaryItem
              label="Payment reference"
              value={successState.summary.paymentReference ?? "Not stated"}
            />
            <SummaryItem
              label="Next rent due"
              value={formatDate(successState.summary.nextRentDueDate)}
            />
          </div>
        ) : null}

        {successState ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {successState.receiptAvailable && successState.receiptDownloadUrl ? (
              <Link
                href={successState.receiptDownloadUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
              >
                Download rent receipt
              </Link>
            ) : (
              <>
                <p className="inline-flex min-h-12 items-center justify-center rounded-button bg-warning-soft px-5 text-sm font-extrabold text-warning">
                  {successState.documentMessage ??
                    "Your payment is confirmed, but the receipt is not ready yet."}
                </p>

                {successState.receiptDownloadUrl ? (
                  <Link
                    href={successState.receiptDownloadUrl}
                    className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
                  >
                    Try receipt again
                  </Link>
                ) : null}
              </>
            )}

            {successState.agreementAvailable && successState.agreementDownloadUrl ? (
              <Link
                href={successState.agreementDownloadUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
              >
                Download agreement
              </Link>
            ) : null}

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
            >
              Back to BOPA
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {callbackReference.reference ? (
              <Link
                href={`/pay/manager/callback?reference=${encodeURIComponent(
                  callbackReference.reference,
                )}`}
                className="inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
              >
                Check again
              </Link>
            ) : null}

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-surface"
            >
              Back to BOPA
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
