import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentOperationDetail } from "@/components/platform-admin/payment-operation-detail";
import { isAppError } from "@/server/errors/app-error";
import { getPlatformAdminPaymentOperationDetail } from "@/server/services/platform-admin-payments.service";

type AdminPaymentDetailPageProps = {
  params: Promise<{
    reference: string;
  }>;
};

async function loadPaymentOperationDetail(reference: string) {
  try {
    return await getPlatformAdminPaymentOperationDetail(reference);
  } catch (error) {
    if (isAppError(error) && error.code === "ADMIN_PAYMENT_NOT_FOUND") {
      return null;
    }

    throw error;
  }
}

export default async function PlatformAdminPaymentDetailPage({
  params,
}: AdminPaymentDetailPageProps) {
  const { reference } = await params;
  const detail = await loadPaymentOperationDetail(decodeURIComponent(reference));

  if (!detail) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Platform Operations"
        title={detail.intent.paystack_reference}
        description="Read-only payment troubleshooting view with allocations, webhook history, and receipt linkage."
      />

      <PaymentOperationDetail detail={detail} />
    </div>
  );
}
