import "server-only";

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
import { getActiveCaretakerAssignments } from "@/server/repositories/caretaker-assignments.repository";
import {
  getVisibleRentPaymentsForCaretaker,
  type RentPaymentRow,
} from "@/server/repositories/payments.repository";
import {
  getActiveRentAlertTenanciesForCaretaker,
  type LandlordRentAlertTenancyRow,
} from "@/server/repositories/renewals.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { getCanonicalTenancyBalance } from "@/server/services/tenancy-financial-integrity.service";
import { getPayableOutstandingBalance } from "@/server/utils/tenancy-balance";
import { requireCaretaker } from "./auth.service";

export type CaretakerPrimaryAction =
  | "send_reminder"
  | "request_proof"
  | "report_payment"
  | null;

export type CaretakerPropertyOption = {
  id: string;
  name: string;
};

export type CaretakerTenantRow = {
  tenancyId: string;
  tenantId: string;
  tenantName: string;
  phoneNumber: string | null;
  propertyId: string | null;
  propertyName: string;
  unitIdentifier: string;
  propertyUnitLabel: string;
  rentAmount: number;
  outstandingBalance: number;
  amountOwed: number | null;
  dueDate: string | null;
  daysUntilDue: number | null;
  statusLabel: string;
  whatsappMessage: string;
  landlordId: string;
  landlordName: string;
  landlordPhone: string | null;
};

export type CaretakerPaidLabel =
  | "paid_through_bopa"
  | "confirmed_by_landlord"
  | "recorded_manually";

export type CaretakerPaidTenantRow = CaretakerTenantRow & {
  paidLabel: CaretakerPaidLabel;
  paidLabelText: string;
};

export type CaretakerPendingConfirmationRow = {
  id: string;
  tenancyId: string;
  tenantId: string;
  tenantName: string;
  phoneNumber: string | null;
  propertyUnitLabel: string;
  amountClaimed: number;
  paymentDate: string | null;
  statusLabel: string;
  source: "gateway_pending" | "unverified_payment";
  proofPath: string | null;
  landlordId: string;
  landlordName: string;
  landlordPhone: string | null;
};

export type CaretakerOverview = {
  caretakerName: string;
  properties: CaretakerPropertyOption[];
  assignedPropertyCount: number;
  assignedUnitCount: number;
  selectedPropertyId: string | null;
  propertyFilterLabel: string;
  hasAssignments: boolean;
  hasTenants: boolean;
  summary: {
    dueSoonCount: number;
    owingCount: number;
    pendingConfirmationCount: number;
    paidCount: number;
    totalOutstanding: number;
  };
  dueSoonTenants: CaretakerTenantRow[];
  owingTenants: CaretakerTenantRow[];
  pendingConfirmation: CaretakerPendingConfirmationRow[];
  paidTenants: CaretakerPaidTenantRow[];
  primaryAction: CaretakerPrimaryAction;
};

type TenancyRentSnapshot = {
  tenancy: LandlordRentAlertTenancyRow;
  propertyId: string | null;
  propertyName: string;
  unitIdentifier: string;
  outstandingBalance: number;
  isOwing: boolean;
  isDueSoon: boolean;
  isPaid: boolean;
  dueDate: string | null;
  daysUntilDue: number | null;
  amountDue: number;
  statusLabel: string;
  whatsappMessage: string;
  landlordId: string;
  landlordName: string;
  landlordPhone: string | null;
};

type GatewayPendingIntentRow = {
  id: string;
  landlord_id: string;
  tenancy_id: string | null;
  tenant_id: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  tenancies: {
    id: string;
    tenants: {
      id: string;
      full_name: string;
      phone_number: string;
    } | null;
    units: {
      unit_identifier: string;
      properties: {
        id: string;
        property_name: string;
      } | null;
    } | null;
  } | null;
  landlord: {
    id: string;
    full_name: string;
    phone_number: string | null;
  } | null;
};

const CARETAKER_CONTACT_PHRASE =
  "Please make payment or contact your caretaker/landlord.";

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

function sortByDueDate(a: CaretakerTenantRow, b: CaretakerTenantRow) {
  const aDays = a.daysUntilDue ?? Number.MAX_SAFE_INTEGER;
  const bDays = b.daysUntilDue ?? Number.MAX_SAFE_INTEGER;

  if (aDays !== bDays) {
    return aDays - bDays;
  }

  return a.tenantName.localeCompare(b.tenantName);
}

function sortOwingTenants(a: CaretakerTenantRow, b: CaretakerTenantRow) {
  const aDays = a.daysUntilDue ?? 0;
  const bDays = b.daysUntilDue ?? 0;

  if (aDays !== bDays) {
    return aDays - bDays;
  }

  return a.tenantName.localeCompare(b.tenantName);
}

function resolvePrimaryAction(params: {
  dueSoonCount: number;
  owingCount: number;
  pendingConfirmationCount: number;
}): CaretakerPrimaryAction {
  if (params.dueSoonCount > 0 || params.owingCount > 0) {
    return "send_reminder";
  }

  if (params.pendingConfirmationCount > 0) {
    return "request_proof";
  }

  return null;
}

function snapshotToTenantRow(snapshot: TenancyRentSnapshot): CaretakerTenantRow {
  return {
    tenancyId: snapshot.tenancy.id,
    tenantId: snapshot.tenancy.tenant_id,
    tenantName: snapshot.tenancy.tenants?.full_name ?? "Tenant",
    phoneNumber: snapshot.tenancy.tenants?.phone_number ?? null,
    propertyId: snapshot.propertyId,
    propertyName: snapshot.propertyName,
    unitIdentifier: snapshot.unitIdentifier,
    propertyUnitLabel: getPropertyUnitLabel({
      propertyName: snapshot.propertyName,
      unitIdentifier: snapshot.unitIdentifier,
    }),
    rentAmount: Number(snapshot.tenancy.rent_amount),
    outstandingBalance: snapshot.outstandingBalance,
    amountOwed: snapshot.isOwing ? snapshot.outstandingBalance : null,
    dueDate: snapshot.dueDate,
    daysUntilDue: snapshot.daysUntilDue,
    statusLabel: snapshot.statusLabel,
    whatsappMessage: snapshot.whatsappMessage,
    landlordId: snapshot.landlordId,
    landlordName: snapshot.landlordName,
    landlordPhone: snapshot.landlordPhone,
  };
}

function resolvePaidLabel(
  payments: RentPaymentRow[],
  tenantId: string,
): { label: CaretakerPaidLabel; text: string } {
  const tenantPayments = payments.filter(
    (payment) =>
      payment.tenant_id === tenantId &&
      payment.status === "posted" &&
      payment.receipt_status !== "voided",
  );

  const latest = tenantPayments[0];

  if (!latest) {
    return {
      label: "recorded_manually",
      text: "Recorded manually",
    };
  }

  if (latest.payment_method === "paystack_gateway") {
    return {
      label: "paid_through_bopa",
      text: "Paid through BOPA",
    };
  }

  if (latest.verified_by_landlord) {
    return {
      label: "confirmed_by_landlord",
      text: "Confirmed by landlord",
    };
  }

  return {
    label: "recorded_manually",
    text: "Recorded manually",
  };
}

async function buildTenancySnapshots(params: {
  tenancies: LandlordRentAlertTenancyRow[];
  selectedPropertyId: string | null;
  landlordContacts: Map<
    string,
    { name: string; phone: string | null }
  >;
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
      const propertyName =
        tenancy.units?.properties?.property_name ?? "Property";
      const unitIdentifier =
        tenancy.units?.unit_identifier ?? "Unit";
      const amountDue = isOwing
        ? outstandingBalance
        : Number(tenancy.rent_amount);
      const landlordContact = params.landlordContacts.get(tenancy.landlord_id);

      return {
        tenancy,
        propertyId,
        propertyName,
        unitIdentifier,
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
          propertyUnitLabel: getPropertyUnitLabel({
            propertyName,
            unitIdentifier,
          }),
          amount: amountDue,
          outstandingBalance,
          dueDate,
          daysUntilDue,
          landlordName: landlordContact?.name ?? "your landlord",
          contactPhrase: CARETAKER_CONTACT_PHRASE,
        }),
        landlordId: tenancy.landlord_id,
        landlordName: landlordContact?.name ?? "Landlord",
        landlordPhone: landlordContact?.phone ?? null,
      };
    }),
  );

  return snapshots.filter(
    (snapshot): snapshot is TenancyRentSnapshot => snapshot !== null,
  );
}

function buildPendingFromPayments(params: {
  payments: RentPaymentRow[];
  selectedPropertyId: string | null;
  landlordContacts: Map<string, { name: string; phone: string | null }>;
  assignedPropertyIds: Set<string>;
}) {
  const rows: CaretakerPendingConfirmationRow[] = [];
  const seenPaymentIds = new Set<string>();

  for (const payment of params.payments) {
    const propertyId = payment.tenancies?.units?.properties?.id ?? null;

    if (
      !propertyId ||
      !params.assignedPropertyIds.has(propertyId) ||
      !matchesPropertyFilter(propertyId, params.selectedPropertyId)
    ) {
      continue;
    }

    if (payment.status !== "posted" || payment.verified_by_landlord) {
      continue;
    }

    if (payment.recorded_by_role !== "caretaker") {
      continue;
    }

    if (seenPaymentIds.has(payment.id)) {
      continue;
    }

    seenPaymentIds.add(payment.id);

    const landlordContact = params.landlordContacts.get(payment.landlord_id);

    rows.push({
      id: payment.id,
      tenancyId: payment.tenancy_id,
      tenantId: payment.tenant_id,
      tenantName: payment.tenants?.full_name ?? "Tenant",
      phoneNumber: payment.tenants?.phone_number ?? null,
      propertyUnitLabel: getPropertyUnitLabel({
        propertyName: payment.tenancies?.units?.properties?.property_name,
        unitIdentifier: payment.tenancies?.units?.unit_identifier,
      }),
      amountClaimed: Number(payment.amount_paid),
      paymentDate: payment.payment_date,
      statusLabel: "Waiting for landlord confirmation",
      source: "unverified_payment",
      proofPath: payment.receipt_path,
      landlordId: payment.landlord_id,
      landlordName: landlordContact?.name ?? "Landlord",
      landlordPhone: landlordContact?.phone ?? null,
    });
  }

  return rows;
}

async function getGatewayPendingIntents(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  assignedPropertyIds: string[],
) {
  if (assignedPropertyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("gateway_payment_intents")
    .select(
      `
      id,
      landlord_id,
      tenancy_id,
      tenant_id,
      amount,
      status,
      paid_at,
      tenancies (
        id,
        tenants (
          id,
          full_name,
          phone_number
        ),
        units (
          unit_identifier,
          properties (
            id,
            property_name
          )
        )
      ),
      landlord:profiles!gateway_payment_intents_landlord_id_fkey (
        id,
        full_name,
        phone_number
      )
    `,
    )
    .eq("status", "paid")
    .is("processed_payment_id", null)
    .returns<GatewayPendingIntentRow[]>();

  if (error) {
    throw error;
  }

  return (data ?? []).filter((intent) => {
    const propertyId = intent.tenancies?.units?.properties?.id;

    return propertyId ? assignedPropertyIds.includes(propertyId) : false;
  });
}

function buildPendingFromGatewayIntents(params: {
  intents: GatewayPendingIntentRow[];
  selectedPropertyId: string | null;
  existingPaymentIds: Set<string>;
}) {
  const rows: CaretakerPendingConfirmationRow[] = [];

  for (const intent of params.intents) {
    const propertyId = intent.tenancies?.units?.properties?.id ?? null;

    if (!matchesPropertyFilter(propertyId, params.selectedPropertyId)) {
      continue;
    }

    if (params.existingPaymentIds.has(intent.id)) {
      continue;
    }

    rows.push({
      id: intent.id,
      tenancyId: intent.tenancy_id ?? intent.tenancies?.id ?? "",
      tenantId: intent.tenant_id ?? intent.tenancies?.tenants?.id ?? "",
      tenantName: intent.tenancies?.tenants?.full_name ?? "Tenant",
      phoneNumber: intent.tenancies?.tenants?.phone_number ?? null,
      propertyUnitLabel: getPropertyUnitLabel({
        propertyName: intent.tenancies?.units?.properties?.property_name,
        unitIdentifier: intent.tenancies?.units?.unit_identifier,
      }),
      amountClaimed: Number(intent.amount),
      paymentDate: intent.paid_at
        ? intent.paid_at.slice(0, 10)
        : null,
      statusLabel: "Waiting for landlord confirmation",
      source: "gateway_pending",
      proofPath: null,
      landlordId: intent.landlord_id,
      landlordName: intent.landlord?.full_name ?? "Landlord",
      landlordPhone: intent.landlord?.phone_number ?? null,
    });
  }

  return rows;
}

export async function getCurrentCaretakerOverview(
  selectedPropertyId: string | null = null,
): Promise<CaretakerOverview> {
  const caretaker = await requireCaretaker();
  const supabase = await createSupabaseServerClient();
  const caretakerName = getFirstName(caretaker.fullName);

  const assignments = await getActiveCaretakerAssignments(
    supabase,
    caretaker.id,
  );

  const properties: CaretakerPropertyOption[] = assignments
    .map((assignment) => ({
      id: assignment.property_id,
      name: assignment.properties?.property_name ?? "Property",
    }))
    .filter(
      (property, index, list) =>
        list.findIndex((item) => item.id === property.id) === index,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const assignedPropertyIds = new Set(properties.map((property) => property.id));

  const landlordContacts = new Map<
    string,
    { name: string; phone: string | null }
  >();

  for (const assignment of assignments) {
    if (!landlordContacts.has(assignment.landlord_id)) {
      landlordContacts.set(assignment.landlord_id, {
        name: assignment.landlord?.full_name ?? "Landlord",
        phone: assignment.landlord?.phone_number ?? null,
      });
    }
  }

  const validSelectedPropertyId =
    selectedPropertyId &&
    properties.some((property) => property.id === selectedPropertyId)
      ? selectedPropertyId
      : null;

  const propertyFilterLabel =
    properties.length <= 1
      ? (properties[0]?.name ?? "All assigned properties")
      : validSelectedPropertyId
        ? (properties.find((property) => property.id === validSelectedPropertyId)
            ?.name ?? "All assigned properties")
        : "All assigned properties";

  if (properties.length === 0) {
    return {
      caretakerName,
      properties: [],
      assignedPropertyCount: 0,
      assignedUnitCount: 0,
      selectedPropertyId: null,
      propertyFilterLabel: "All assigned properties",
      hasAssignments: false,
      hasTenants: false,
      summary: {
        dueSoonCount: 0,
        owingCount: 0,
        pendingConfirmationCount: 0,
        paidCount: 0,
        totalOutstanding: 0,
      },
      dueSoonTenants: [],
      owingTenants: [],
      pendingConfirmation: [],
      paidTenants: [],
      primaryAction: null,
    };
  }

  const [tenancies, payments, gatewayIntents] = await Promise.all([
    getActiveRentAlertTenanciesForCaretaker(supabase),
    getVisibleRentPaymentsForCaretaker(supabase),
    getGatewayPendingIntents(supabase, [...assignedPropertyIds]),
  ]);

  const assignedUnitCount = new Set(
    tenancies
      .filter((tenancy) => {
        const propertyId = getTenancyPropertyId(tenancy);

        return propertyId ? assignedPropertyIds.has(propertyId) : false;
      })
      .map((tenancy) => tenancy.unit_id),
  ).size;

  const snapshots = await buildTenancySnapshots({
    tenancies,
    selectedPropertyId: validSelectedPropertyId,
    landlordContacts,
    supabase,
  });

  const pendingFromPayments = buildPendingFromPayments({
    payments,
    selectedPropertyId: validSelectedPropertyId,
    landlordContacts,
    assignedPropertyIds,
  });

  const pendingFromGateway = buildPendingFromGatewayIntents({
    intents: gatewayIntents,
    selectedPropertyId: validSelectedPropertyId,
    existingPaymentIds: new Set(pendingFromPayments.map((row) => row.id)),
  });

  const pendingConfirmation = [...pendingFromPayments, ...pendingFromGateway];

  const dueSoonTenants = snapshots
    .filter((snapshot) => snapshot.isDueSoon)
    .map(snapshotToTenantRow)
    .sort(sortByDueDate);

  const owingTenants = snapshots
    .filter((snapshot) => snapshot.isOwing)
    .map(snapshotToTenantRow)
    .sort(sortOwingTenants);

  const paidTenants = snapshots
    .filter((snapshot) => snapshot.isPaid)
    .map((snapshot) => {
      const row = snapshotToTenantRow(snapshot);
      const paidInfo = resolvePaidLabel(payments, row.tenantId);

      return {
        ...row,
        paidLabel: paidInfo.label,
        paidLabelText: paidInfo.text,
      };
    })
    .sort((a, b) => a.tenantName.localeCompare(b.tenantName));

  const summary = {
    dueSoonCount: dueSoonTenants.length,
    owingCount: owingTenants.length,
    pendingConfirmationCount: pendingConfirmation.length,
    paidCount: paidTenants.length,
    totalOutstanding: owingTenants.reduce(
      (total, tenant) => total + (tenant.amountOwed ?? 0),
      0,
    ),
  };

  return {
    caretakerName,
    properties,
    assignedPropertyCount: properties.length,
    assignedUnitCount,
    selectedPropertyId: validSelectedPropertyId,
    propertyFilterLabel,
    hasAssignments: true,
    hasTenants: snapshots.length > 0,
    summary,
    dueSoonTenants,
    owingTenants,
    pendingConfirmation,
    paidTenants,
    primaryAction: resolvePrimaryAction(summary),
  };
}
