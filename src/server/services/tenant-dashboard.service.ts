import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getAcceptedTenantAgreement,
  getActiveTenantMoveOutNotice,
  getActiveTenantTenancy,
  getTenantDashboardTenantByProfile,
  getTenantPayments,
} from "@/server/repositories/tenant-dashboard.repository";
import { getActiveLandlordPaystackAccount } from "@/server/repositories/landlord-paystack.repository";
import { getCanonicalTenancyBalance } from "@/server/services/tenancy-financial-integrity.service";
import { getPaystackPayoutVerificationUiState } from "@/server/services/paystack-verification.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import {
  createSignedRentReceiptPdfUrl,
  createSignedTenancyAgreementPdfUrl,
} from "@/server/services/storage.service";
import { requireTenant } from "./auth.service";

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
  const landlordPayoutAccount = tenancy
    ? await getActiveLandlordPaystackAccount(supabase, tenancy.landlord_id)
    : null;
  const onlinePaymentAvailability = getPaystackPayoutVerificationUiState(
    landlordPayoutAccount,
    "tenant",
  );

  const agreement = tenancy
    ? await getAcceptedTenantAgreement(supabase, {
        tenantId: tenant.id,
        tenancyId: tenancy.id,
      })
    : null;

  const moveOutNotice = tenancy
    ? await getActiveTenantMoveOutNotice(supabase, tenancy.id)
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

  const tenancyBalance = tenancy
    ? await getCanonicalTenancyBalance(supabase, tenancy.id)
    : null;

  const outstandingBalance = tenancyBalance
    ? Number(tenancyBalance.outstanding_balance)
    : 0;

  return {
    user,
    tenant,
    tenancy,
    agreement,
    agreementDownloadUrl,
    moveOutNotice,
    outstandingBalance,
    payments: paymentHistory,
    onlinePaymentAvailability,
  };
}
