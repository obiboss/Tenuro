import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  getRentPaymentsForLandlord,
  recordManualRentPaymentViaRpc,
  type RentPaymentFilter,
} from "@/server/repositories/payments.repository";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { RecordManualPaymentInput } from "@/server/validators/payment.schema";
import { requireLandlord } from "./auth.service";

export function getThisYearPaymentFilter(): Required<RentPaymentFilter> {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), 0, 1);
  const dateTo = new Date(now.getFullYear() + 1, 0, 1);

  return {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  };
}

export async function getCurrentLandlordRentPayments(
  filter: RentPaymentFilter = {},
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return getRentPaymentsForLandlord(supabase, landlord.id, filter);
}

export async function recordManualPaymentForCurrentLandlord(
  input: RecordManualPaymentInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyPaymentContext(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to record payment for this rental agreement.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Payment can only be recorded for an active rental agreement.",
      400,
    );
  }

  const paymentId = await recordManualRentPaymentViaRpc(supabase, {
    tenancyId: input.tenancyId,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference || null,
    paymentDate: input.paymentDate.toISOString(),
    periodStart: input.paymentForPeriodStart
      ? input.paymentForPeriodStart.toISOString().slice(0, 10)
      : null,
    periodEnd: input.paymentForPeriodEnd
      ? input.paymentForPeriodEnd.toISOString().slice(0, 10)
      : null,
    notes: input.notes || null,
    idempotencyKey: input.idempotencyKey,
  });

  return {
    paymentId,
  };
}
