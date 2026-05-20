import { PageHeader } from "@/components/ui/page-header";
import { PaymentOperationsQueue } from "@/components/platform-admin/payment-operations-queue";
import { getPlatformAdminPaymentOperationsList } from "@/server/services/platform-admin-payments.service";
import type { GatewayPaymentIntent } from "@/server/types/paystack.types";

type AdminPaymentsPageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
};

const allowedStatuses = new Set([
  "all",
  "attention",
  "initialized",
  "paid",
  "failed",
  "abandoned",
  "cancelled",
]);

function parseStatus(
  value: string | undefined,
): GatewayPaymentIntent["status"] | "attention" | "all" {
  if (!value || value === "all") {
    return "all";
  }

  if (allowedStatuses.has(value)) {
    return value as GatewayPaymentIntent["status"] | "attention" | "all";
  }

  return "all";
}

export default async function PlatformAdminPaymentsPage({
  searchParams,
}: AdminPaymentsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page ?? "1");
  const operations = await getPlatformAdminPaymentOperationsList({
    status: parseStatus(resolvedSearchParams.status),
    query: resolvedSearchParams.q,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  });

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title="Payment operations"
        description="Monitor gateway payments, verification issues, allocation state, and payout verification workload."
      />

      <PaymentOperationsQueue operations={operations} />
    </div>
  );
}
