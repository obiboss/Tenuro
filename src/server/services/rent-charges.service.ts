import "server-only";

import {
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { postDueRentCharges } from "@/server/repositories/ledger.repository";
import { writeSystemAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type PostDueRentChargesResult = {
  postedCount: number;
  postedCharges: {
    tenancyId: string;
    landlordId: string;
    tenantId: string;
    unitId: string;
    ledgerEntryId: string;
    rentAmount: number;
    currencyCode: string;
    periodStart: string;
    periodEnd: string;
    nextRentChargeDate: string;
  }[];
};

export async function postDueRentChargesSystem(
  runDate?: string,
): Promise<PostDueRentChargesResult> {
  const supabase = createSupabaseAdminClient();
  const postedCharges = await postDueRentCharges(supabase, runDate);

  await Promise.all(
    postedCharges.map((charge) =>
      writeSystemAuditLog({
        landlordId: charge.landlord_id,
        tenantId: charge.tenant_id,
        tenancyId: charge.tenancy_id,
        unitId: charge.unit_id,
        eventType: AUDIT_EVENT_TYPES.rentChargePosted,
        entityType: AUDIT_ENTITY_TYPES.tenancy,
        entityId: charge.tenancy_id,
        description: "Automatic rent charge posted for renewal period.",
        metadata: {
          tenancy_id: charge.tenancy_id,
          ledger_entry_id: charge.ledger_entry_id,
          rent_amount: charge.rent_amount,
          currency_code: charge.currency_code,
          period_start: charge.period_start,
          period_end: charge.period_end,
          next_rent_charge_date: charge.next_rent_charge_date,
          source: "automatic_renewal_charge",
        },
      }),
    ),
  );

  return {
    postedCount: postedCharges.length,
    postedCharges: postedCharges.map((charge) => ({
      tenancyId: charge.tenancy_id,
      landlordId: charge.landlord_id,
      tenantId: charge.tenant_id,
      unitId: charge.unit_id,
      ledgerEntryId: charge.ledger_entry_id,
      rentAmount: Number(charge.rent_amount),
      currencyCode: charge.currency_code,
      periodStart: charge.period_start,
      periodEnd: charge.period_end,
      nextRentChargeDate: charge.next_rent_charge_date,
    })),
  };
}
