import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getAcceptedTenantAgreement,
  getActiveTenantTenancy,
  getTenantDashboardTenantByProfile,
  getTenantPayments,
} from "@/server/repositories/tenant-dashboard.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  createSignedRentReceiptPdfUrl,
  createSignedTenancyAgreementPdfUrl,
} from "@/server/services/storage.service";
import { requireTenant } from "./auth.service";

function calculateOutstandingBalance(params: {
  tenancyOpeningBalance: number;
  tenancyRentAmount: number;
  payments: {
    status: string;
    balance_after: number;
  }[];
}) {
  const latestPostedPayment = params.payments.find(
    (payment) => payment.status === "posted",
  );

  if (latestPostedPayment) {
    return Number(latestPostedPayment.balance_after);
  }

  return Number(params.tenancyOpeningBalance || params.tenancyRentAmount || 0);
}

export async function getCurrentTenantDashboard() {
  const user = await requireTenant();
  const supabase = createSupabaseAdminClient();

  const tenant = await getTenantDashboardTenantByProfile(supabase, {
    profileId: user.id,
    phoneNumber: user.phoneNumber,
  });

  if (!tenant) {
    throw new AppError(
      "TENANT_RECORD_NOT_FOUND",
      "We could not find your tenant record.",
      404,
    );
  }

  const tenancy = await getActiveTenantTenancy(supabase, tenant.id);
  const payments = await getTenantPayments(supabase, tenant.id);

  const agreement = tenancy
    ? await getAcceptedTenantAgreement(supabase, {
        tenantId: tenant.id,
        tenancyId: tenancy.id,
      })
    : null;

  const agreementDownloadUrl = agreement?.pdf_path
    ? await createSignedTenancyAgreementPdfUrl(agreement.pdf_path)
    : null;

  const paymentHistory = await Promise.all(
    payments.map(async (payment) => ({
      ...payment,
      receiptDownloadUrl:
        payment.receipt_path && payment.receipt_status === "generated"
          ? await createSignedRentReceiptPdfUrl(payment.receipt_path)
          : null,
    })),
  );

  const outstandingBalance = tenancy
    ? calculateOutstandingBalance({
        tenancyOpeningBalance: tenancy.opening_balance,
        tenancyRentAmount: tenancy.rent_amount,
        payments,
      })
    : 0;

  return {
    user,
    tenant,
    tenancy,
    agreement,
    agreementDownloadUrl,
    outstandingBalance,
    payments: paymentHistory,
  };
}
