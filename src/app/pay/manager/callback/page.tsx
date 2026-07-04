import Link from "next/link";
import { getManagerPaystackCallbackState } from "@/server/services/manager-paystack.service";

type ManagerPaystackCallbackPageProps = {
  searchParams: Promise<{
    reference?: string;
  }>;
};

export default async function ManagerPaystackCallbackPage({
  searchParams,
}: ManagerPaystackCallbackPageProps) {
  const resolvedSearchParams = await searchParams;
  const reference = resolvedSearchParams.reference?.trim() ?? null;

  const state = reference
    ? await getManagerPaystackCallbackState(reference)
    : {
        ok: false,
        status: "missing_reference" as const,
        message: "Payment reference is missing.",
      };

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <section className="mx-auto max-w-xl rounded-card border border-border-soft bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white">
          B
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-strong">
          {state.ok ? "Payment confirmed" : "Payment not confirmed yet"}
        </h1>

        <p className="mt-3 text-sm font-semibold leading-6 text-text-muted">
          {state.message}
        </p>

        <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
          Once payment is confirmed, BOPA updates the rent record automatically.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-button bg-primary px-5 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary/90"
        >
          Back to BOPA
        </Link>
      </section>
    </main>
  );
}
