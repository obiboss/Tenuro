import "server-only";

import {
  AUDIT_EVENT_TYPES,
  type AuditEventType,
} from "@/server/constants/audit-events";
import {
  buildRentReminderWhatsappMessage,
  getPropertyUnitLabel,
} from "@/lib/rent-reminder-message";
import {
  DUE_SOON_DAYS,
  formatRentStatusLabel,
  getDaysUntilDueDate,
  isDueWithinDays,
} from "@/lib/rent-status-labels";
import { getActiveRentAlertTenanciesForLandlord } from "@/server/repositories/renewals.repository";
import type { LandlordRentAlertTenancyRow } from "@/server/repositories/renewals.repository";
import {
  getRentPaymentsForLandlord,
  type RentPaymentRow,
} from "@/server/repositories/payments.repository";
import { listAuditLogsForLandlord } from "@/server/repositories/audit-log.repository";
import type { LandlordAuditLogRecord } from "@/server/repositories/audit-log.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getCanonicalTenancyBalance } from "@/server/services/tenancy-financial-integrity.service";
import { getPayableOutstandingBalance } from "@/server/utils/tenancy-balance";
import { requireLandlord } from "./auth.service";

export type OverviewPrimaryAction =
  | "send_reminder"
  | "send_receipt"
  | "add_tenant"
  | "record_payment"
  | null;

export type NeedsAttentionReason =
  | "overdue"
  | "owing"
  | "due_soon"
  | "receipt_pending";

export type OverviewPropertyOption = {
  id: string;
  name: string;
};

export type OverviewNeedsAttentionItem = {
  tenancyId: string;
  tenantId: string;
  tenantName: string;
  phoneNumber: string | null;
  propertyId: string | null;
  propertyUnitLabel: string;
  rentAmount: number;
  outstandingBalance: number;
  amountOwed: number | null;
  dueDate: string | null;
  daysUntilDue: number | null;
  statusLabel: string;
  attentionReason: NeedsAttentionReason;
  badgeTone: "danger" | "warning" | "primary";
  whatsappMessage: string;
  paymentId?: string;
};

export type RentControlOverview = {
  landlordName: string;
  properties: OverviewPropertyOption[];
  selectedPropertyId: string | null;
  propertyFilterLabel: string;
  summary: {
    paidCount: number;
    owingCount: number;
    dueSoonCount: number;
    totalOutstanding: number;
  };
  needsAttention: OverviewNeedsAttentionItem[];
  recentActivity: LandlordAuditLogRecord[];
  showRecentActivity: boolean;
  primaryAction: OverviewPrimaryAction;
  hasTenants: boolean;
  totalActiveTenancies: number;
  pendingPaymentConfirmations: number;
  receiptsPendingCount: number;
};

const OVERVIEW_ACTIVITY_EVENT_TYPES = new Set<AuditEventType>([
  AUDIT_EVENT_TYPES.receiptWhatsappPrepared,
  AUDIT_EVENT_TYPES.receiptGenerated,
  AUDIT_EVENT_TYPES.manualPaymentRecorded,
  AUDIT_EVENT_TYPES.gatewayPaymentVerified,
  AUDIT_EVENT_TYPES.renewalReminderPrepared,
  AUDIT_EVENT_TYPES.tenantCreated,
  AUDIT_EVENT_TYPES.paymentLinkSent,
]);

type TenancyRentSnapshot = {
  tenancy: LandlordRentAlertTenancyRow;
  propertyId: string | null;
  outstandingBalance: number;
  isOwing: boolean;
  isDueSoon: boolean;
  isPaid: boolean;
  dueDate: string | null;
  daysUntilDue: number | null;
  amountDue: number;
  statusLabel: string;
  whatsappMessage: string;
};

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function getTenancyPropertyId(tenancy: LandlordRentAlertTenancyRow) {
  return tenancy.units?.properties?.id ?? null;
}

function matchesPropertyFilter(
  propertyId: string | null,
  selectedPropertyId: string | null,
) {
  if (!selectedPropertyId) {
    return true;
  }

  return propertyId === selectedPropertyId;
}

function getNeedsAttentionSortRank(item: OverviewNeedsAttentionItem) {
  if (item.attentionReason === "overdue") {
    return 0;
  }

  if (item.attentionReason === "owing") {
    return 1;
  }

  if (item.attentionReason === "due_soon") {
    return 2;
  }

  return 3;
}

function sortNeedsAttentionItems(
  a: OverviewNeedsAttentionItem,
  b: OverviewNeedsAttentionItem,
) {
  const rankDifference = getNeedsAttentionSortRank(a) - getNeedsAttentionSortRank(b);

  if (rankDifference !== 0) {
    return rankDifference;
  }

  if (a.attentionReason === "overdue" && b.attentionReason === "overdue") {
    const aDays = a.daysUntilDue ?? 0;
    const bDays = b.daysUntilDue ?? 0;

    return aDays - bDays;
  }

  if (a.attentionReason === "due_soon" && b.attentionReason === "due_soon") {
    const aDays = a.daysUntilDue ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysUntilDue ?? Number.MAX_SAFE_INTEGER;

    return aDays - bDays;
  }

  return a.tenantName.localeCompare(b.tenantName);
}

function resolvePrimaryAction(params: {
  owingCount: number;
  receiptsPendingCount: number;
  totalActiveTenancies: number;
  pendingPaymentConfirmations: number;
}): OverviewPrimaryAction {
  if (params.owingCount > 0) {
    return "send_reminder";
  }

  if (params.receiptsPendingCount > 0) {
    return "send_receipt";
  }

  if (params.totalActiveTenancies === 0) {
    return "add_tenant";
  }

  if (params.pendingPaymentConfirmations > 0) {
    return "record_payment";
  }

  return null;
}

function getAttentionReason(params: {
  isOwing: boolean;
  daysUntilDue: number | null;
}): NeedsAttentionReason | null {
  if (params.isOwing) {
    if (params.daysUntilDue !== null && params.daysUntilDue < 0) {
      return "overdue";
    }

    return "owing";
  }

  return "due_soon";
}

function getBadgeTone(
  reason: NeedsAttentionReason,
): OverviewNeedsAttentionItem["badgeTone"] {
  if (reason === "overdue" || reason === "owing") {
    return "danger";
  }

  if (reason === "due_soon") {
    return "warning";
  }

  return "primary";
}

async function buildTenancySnapshots(params: {
  tenancies: LandlordRentAlertTenancyRow[];
  landlordName: string;
  selectedPropertyId: string | null;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const snapshots = await Promise.all(
    params.tenancies.map(async (tenancy): Promise<TenancyRentSnapshot | null> => {
      const propertyId = getTenancyPropertyId(tenancy);

      if (!matchesPropertyFilter(propertyId, params.selectedPropertyId)) {
        return null;
      }

      const balance = await getCanonicalTenancyBalance(
        params.supabase,
        tenancy.id,
      );
      const outstandingBalance = getPayableOutstandingBalance(
        balance.outstanding_balance,
      );
      const isOwing = outstandingBalance > 0;
      const dueDate = tenancy.next_rent_charge_date;
      const daysUntilDue = getDaysUntilDueDate(dueDate);
      const isDueSoon = !isOwing && isDueWithinDays(dueDate, DUE_SOON_DAYS);
      const isPaid = !isOwing && !isDueSoon;
      const propertyUnitLabel = getPropertyUnitLabel({
        propertyName: tenancy.units?.properties?.property_name,
        unitIdentifier: tenancy.units?.unit_identifier,
      });
      const amountDue = isOwing ? outstandingBalance : Number(tenancy.rent_amount);

      return {
        tenancy,
        propertyId,
        outstandingBalance,
        isOwing,
        isDueSoon,
        isPaid,
        dueDate,
        daysUntilDue,
        amountDue,
        statusLabel: formatRentStatusLabel({
          outstandingBalance,
          dueDate,
          daysUntilDue,
        }),
        whatsappMessage: buildRentReminderWhatsappMessage({
          tenantName: tenancy.tenants?.full_name ?? "Tenant",
          propertyUnitLabel,
          amount: amountDue,
          outstandingBalance,
          dueDate,
          daysUntilDue,
          landlordName: params.landlordName,
        }),
      };
    }),
  );

  return snapshots.filter(
    (snapshot): snapshot is TenancyRentSnapshot => snapshot !== null,
  );
}

function buildNeedsAttentionFromSnapshots(
  snapshots: TenancyRentSnapshot[],
): OverviewNeedsAttentionItem[] {
  const items: OverviewNeedsAttentionItem[] = [];

  for (const snapshot of snapshots) {
    if (!snapshot.isOwing && !snapshot.isDueSoon) {
      continue;
    }

    const attentionReason = getAttentionReason({
      isOwing: snapshot.isOwing,
      daysUntilDue: snapshot.daysUntilDue,
    });

    if (!attentionReason) {
      continue;
    }

    items.push({
      tenancyId: snapshot.tenancy.id,
      tenantId: snapshot.tenancy.tenant_id,
      tenantName: snapshot.tenancy.tenants?.full_name ?? "Tenant",
      phoneNumber: snapshot.tenancy.tenants?.phone_number ?? null,
      propertyId: snapshot.propertyId,
      propertyUnitLabel: getPropertyUnitLabel({
        propertyName: snapshot.tenancy.units?.properties?.property_name,
        unitIdentifier: snapshot.tenancy.units?.unit_identifier,
      }),
      rentAmount: Number(snapshot.tenancy.rent_amount),
      outstandingBalance: snapshot.outstandingBalance,
      amountOwed: snapshot.isOwing ? snapshot.outstandingBalance : null,
      dueDate: snapshot.dueDate,
      daysUntilDue: snapshot.daysUntilDue,
      statusLabel: snapshot.statusLabel,
      attentionReason,
      badgeTone: getBadgeTone(attentionReason),
      whatsappMessage: snapshot.whatsappMessage,
    });
  }

  return items.sort(sortNeedsAttentionItems);
}

function paymentMatchesProperty(
  payment: RentPaymentRow,
  selectedPropertyId: string | null,
) {
  if (!selectedPropertyId) {
    return true;
  }

  return payment.tenancies?.units?.properties?.id === selectedPropertyId;
}

function buildReceiptNeedsAttentionItems(params: {
  payments: RentPaymentRow[];
  snapshots: TenancyRentSnapshot[];
  sentReceiptPaymentIds: Set<string>;
  selectedPropertyId: string | null;
}) {
  const paidTenantIds = new Set(
    params.snapshots
      .filter((snapshot) => snapshot.isPaid)
      .map((snapshot) => snapshot.tenancy.tenant_id),
  );

  const items: OverviewNeedsAttentionItem[] = [];
  const seenTenantIds = new Set<string>();

  for (const payment of params.payments) {
    if (!paymentMatchesProperty(payment, params.selectedPropertyId)) {
      continue;
    }

    if (payment.status !== "posted") {
      continue;
    }

    if (payment.receipt_status === "voided") {
      continue;
    }

    if (params.sentReceiptPaymentIds.has(payment.id)) {
      continue;
    }

    if (!paidTenantIds.has(payment.tenant_id)) {
      continue;
    }

    if (seenTenantIds.has(payment.tenant_id)) {
      continue;
    }

    seenTenantIds.add(payment.tenant_id);

    const propertyUnitLabel = getPropertyUnitLabel({
      propertyName: payment.tenancies?.units?.properties?.property_name,
      unitIdentifier: payment.tenancies?.units?.unit_identifier,
    });

    items.push({
      tenancyId: payment.tenancy_id,
      tenantId: payment.tenant_id,
      tenantName: payment.tenants?.full_name ?? "Tenant",
      phoneNumber: payment.tenants?.phone_number ?? null,
      propertyId: payment.tenancies?.units?.properties?.id ?? null,
      propertyUnitLabel,
      rentAmount: Number(payment.amount_paid),
      outstandingBalance: 0,
      amountOwed: null,
      dueDate: null,
      daysUntilDue: null,
      statusLabel: "Receipt not sent",
      attentionReason: "receipt_pending",
      badgeTone: "primary",
      whatsappMessage: "",
      paymentId: payment.id,
    });
  }

  return items;
}

function countReceiptsPending(params: {
  payments: RentPaymentRow[];
  snapshots: TenancyRentSnapshot[];
  sentReceiptPaymentIds: Set<string>;
  selectedPropertyId: string | null;
}) {
  const paidTenantIds = new Set(
    params.snapshots
      .filter((snapshot) => snapshot.isPaid)
      .map((snapshot) => snapshot.tenancy.tenant_id),
  );

  const pendingTenantIds = new Set<string>();

  for (const payment of params.payments) {
    if (!paymentMatchesProperty(payment, params.selectedPropertyId)) {
      continue;
    }

    if (payment.status !== "posted" || payment.receipt_status === "voided") {
      continue;
    }

    if (params.sentReceiptPaymentIds.has(payment.id)) {
      continue;
    }

    if (!paidTenantIds.has(payment.tenant_id)) {
      continue;
    }

    pendingTenantIds.add(payment.tenant_id);
  }

  return pendingTenantIds.size;
}

export async function getCurrentLandlordRentControlOverview(
  selectedPropertyId: string | null = null,
): Promise<RentControlOverview> {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();
  const landlordName = getFirstName(landlord.fullName);

  const { data: propertyRows, error: propertyError } = await supabase
    .from("properties")
    .select("id, property_name")
    .eq("landlord_id", landlord.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("property_name", { ascending: true });

  if (propertyError) {
    throw propertyError;
  }

  const properties: OverviewPropertyOption[] = (propertyRows ?? []).map(
    (property) => ({
      id: property.id,
      name: property.property_name,
    }),
  );

  const validSelectedPropertyId =
    selectedPropertyId &&
    properties.some((property) => property.id === selectedPropertyId)
      ? selectedPropertyId
      : null;

  const propertyFilterLabel =
    properties.length <= 1
      ? (properties[0]?.name ?? "Your property")
      : validSelectedPropertyId
        ? (properties.find((property) => property.id === validSelectedPropertyId)
            ?.name ?? "All properties")
        : "All properties";

  const [tenancies, payments, auditLogs, pendingGatewayResult] =
    await Promise.all([
      getActiveRentAlertTenanciesForLandlord(supabase, landlord.id),
      getRentPaymentsForLandlord(supabase, landlord.id, {}),
      listAuditLogsForLandlord(supabase, landlord.id, 50),
      supabase
        .from("gateway_payment_intents")
        .select("id", { count: "exact", head: true })
        .eq("landlord_id", landlord.id)
        .eq("status", "paid")
        .is("processed_payment_id", null),
    ]);

  if (pendingGatewayResult.error) {
    throw pendingGatewayResult.error;
  }

  const pendingGatewayCount = pendingGatewayResult.count ?? 0;

  const snapshots = await buildTenancySnapshots({
    tenancies,
    landlordName: landlord.fullName,
    selectedPropertyId: validSelectedPropertyId,
    supabase,
  });

  const sentReceiptPaymentIds = new Set(
    auditLogs
      .filter(
        (log) => log.eventType === AUDIT_EVENT_TYPES.receiptWhatsappPrepared,
      )
      .map((log) => log.entityId)
      .filter((value): value is string => Boolean(value)),
  );

  const summary = {
    paidCount: snapshots.filter((snapshot) => snapshot.isPaid).length,
    owingCount: snapshots.filter((snapshot) => snapshot.isOwing).length,
    dueSoonCount: snapshots.filter((snapshot) => snapshot.isDueSoon).length,
    totalOutstanding: snapshots.reduce(
      (total, snapshot) => total + snapshot.outstandingBalance,
      0,
    ),
  };

  const rentNeedsAttention = buildNeedsAttentionFromSnapshots(snapshots);
  const receiptNeedsAttention = buildReceiptNeedsAttentionItems({
    payments,
    snapshots,
    sentReceiptPaymentIds,
    selectedPropertyId: validSelectedPropertyId,
  });

  const needsAttention = [...rentNeedsAttention, ...receiptNeedsAttention].sort(
    sortNeedsAttentionItems,
  );

  const receiptsPendingCount = countReceiptsPending({
    payments,
    snapshots,
    sentReceiptPaymentIds,
    selectedPropertyId: validSelectedPropertyId,
  });

  const recentActivity = auditLogs.filter((log) =>
    OVERVIEW_ACTIVITY_EVENT_TYPES.has(log.eventType),
  );

  const primaryAction = resolvePrimaryAction({
    owingCount: summary.owingCount,
    receiptsPendingCount,
    totalActiveTenancies: snapshots.length,
    pendingPaymentConfirmations: pendingGatewayCount,
  });

  return {
    landlordName,
    properties,
    selectedPropertyId: validSelectedPropertyId,
    propertyFilterLabel,
    summary,
    needsAttention,
    recentActivity: recentActivity.slice(0, 8),
    showRecentActivity: recentActivity.length >= 3,
    primaryAction,
    hasTenants: snapshots.length > 0,
    totalActiveTenancies: snapshots.length,
    pendingPaymentConfirmations: pendingGatewayCount,
    receiptsPendingCount,
  };
}
