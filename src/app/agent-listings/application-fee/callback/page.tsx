import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { verifyTenantApplicationProcessingFeeReference } from "@/server/services/tenant-application-processing-fees.service";

type CallbackResult =
  | {
      ok: true;
      title: string;
      description: string;
    }
  | {
      ok: false;
      title: string;
      description: string;
    };

function ResultCard({ result }: { result: CallbackResult }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-card bg-surface p-6 text-center shadow-card">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            result.ok
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 aria-hidden="true" size={28} strokeWidth={2.6} />
          ) : (
            <ShieldAlert aria-hidden="true" size={28} strokeWidth={2.6} />
          )}
        </div>

        <h1 className="mt-5 text-2xl font-black text-text-strong">
          {result.title}
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
          {result.description}
        </p>

        <div className="mt-6 rounded-button bg-gold-soft px-4 py-3 text-sm font-semibold leading-6 text-gold-deep">
          Payment of a processing and verification fee does not guarantee that
          the apartment will be given to you. Final approval depends on landlord
          review, property availability, and verification outcome.
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-button bg-primary px-5 py-3 text-sm font-black text-white shadow-card transition hover:opacity-95"
        >
          Back to BOPA
        </Link>
      </section>
    </main>
  );
}

async function resolveCallbackResult(
  reference: string | undefined,
): Promise<CallbackResult> {
  if (!reference) {
    return {
      ok: false,
      title: "Payment reference missing",
      description:
        "We could not find the Paystack payment reference for this application. Please return to the application link and try again.",
    };
  }

  try {
    await verifyTenantApplicationProcessingFeeReference(reference);

    return {
      ok: true,
      title: "Processing fee confirmed",
      description:
        "Your tenant application has been submitted for landlord review. You do not need to pay another processing fee within the valid 60-day window for this same agent and landlord context.",
    };
  } catch {
    return {
      ok: false,
      title: "Payment could not be confirmed",
      description:
        "We could not confirm this processing fee payment. If money was deducted, please wait a few minutes and refresh this page or contact support.",
    };
  }
}

export default async function TenantApplicationFeeCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  const result = await resolveCallbackResult(reference);

  return <ResultCard result={result} />;
}
