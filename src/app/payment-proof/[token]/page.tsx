import { TenantPaymentProofForm } from "@/components/caretaker/tenant-payment-proof-form";
import { getTenantPaymentProofContext } from "@/server/services/caretaker-payment-claims.service";

type PaymentProofPageProps = {
  params: Promise<{
    token: string;
  }>;
};

type PageState =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof getTenantPaymentProofContext>>;
    }
  | {
      ok: false;
      message: string;
    };

export default async function PaymentProofPage({
  params,
}: PaymentProofPageProps) {
  const { token } = await params;

  let state: PageState;

  try {
    const data = await getTenantPaymentProofContext(token);
    state = { ok: true, data };
  } catch (error) {
    state = {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "This payment proof link cannot be opened.",
    };
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <div>
          <p className="text-sm font-black text-primary">BOPA</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-text-strong">
            Payment proof
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Submit your payment details for landlord confirmation.
          </p>
        </div>

        {state.ok ? (
          <>
            <div className="rounded-card border border-border-soft bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Tenant
              </p>
              <h2 className="mt-1 text-xl font-black text-text-strong">
                {state.data.tenantName}
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                {state.data.propertyUnitLabel}
              </p>
              <p className="mt-3 text-sm font-semibold text-text-muted">
                Landlord: {state.data.landlordName}
              </p>
            </div>

            <TenantPaymentProofForm token={state.data.token} />
          </>
        ) : (
          <div className="rounded-card border border-danger/20 bg-danger/10 p-4">
            <h2 className="text-lg font-black text-danger">
              Link not available
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
              {state.message}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
