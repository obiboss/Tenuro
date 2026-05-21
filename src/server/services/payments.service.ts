import "server-only";

import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import { getTenancyPaymentContext } from "@/server/repositories/payment-context.repository";
import {
  getRentPaymentsForLandlord,
  recordManualRentPaymentViaRpc,
  type RentPaymentFilter,
} from "@/server/repositories/payments.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import {
  assertManualRentPaymentAmount,
  buildPaymentBalanceAuditMetadata,
  getCanonicalTenancyBalance,
} from "@/server/services/tenancy-financial-integrity.service";
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

  if (
    tenancy.tenancy_status !== "active" ||
    tenancy.agreement_live_at === null
  ) {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Payment can only be recorded for an active rental agreement.",
      400,
    );
  }

  const periodStart = input.paymentForPeriodStart
    ? input.paymentForPeriodStart.toISOString().slice(0, 10)
    : null;

  const periodEnd = input.paymentForPeriodEnd
    ? input.paymentForPeriodEnd.toISOString().slice(0, 10)
    : null;

  const balance = await getCanonicalTenancyBalance(supabase, tenancy.id);
  const paymentClassification = assertManualRentPaymentAmount({
    amountPaid: input.amountPaid,
    outstandingBefore: balance.outstanding_balance,
  });

  const paymentId = await recordManualRentPaymentViaRpc(supabase, {
    tenancyId: input.tenancyId,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference || null,
    paymentDate: input.paymentDate.toISOString(),
    periodStart,
    periodEnd,
    notes: input.notes || null,
    idempotencyKey: input.idempotencyKey,
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.manualPaymentRecorded,
    entityType: AUDIT_ENTITY_TYPES.payment,
    entityId: paymentId,
    description: "Manual rent payment recorded.",
    metadata: {
      payment_id: paymentId,
      amount_paid: input.amountPaid,
      payment_method: input.paymentMethod,
      payment_reference: input.paymentReference || null,
      payment_date: input.paymentDate.toISOString(),
      period_start: periodStart,
      period_end: periodEnd,
      ...buildPaymentBalanceAuditMetadata(paymentClassification),
    },
  });

  return {
    paymentId,
    tenantId: tenancy.tenant_id,
  };
}
