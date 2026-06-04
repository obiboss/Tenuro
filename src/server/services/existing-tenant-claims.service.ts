import "server-only";

import crypto from "node:crypto";
import {
  AUDIT_ACTOR_ROLES,
  AUDIT_ENTITY_TYPES,
  AUDIT_EVENT_TYPES,
} from "@/server/constants/audit-events";
import { AppError } from "@/server/errors/app-error";
import {
  approveExistingTenantClaim,
  createExistingTenantClaim,
  getExistingTenantClaimById,
  getExistingTenantClaimByTokenHash,
  listExistingTenantClaimsForLandlord,
  markExistingTenantClaimExpired,
  rejectExistingTenantClaim,
  submitExistingTenantClaim,
  updateExistingTenantClaimArrears,
  type ExistingTenantClaimPaymentFrequency,
} from "@/server/repositories/existing-tenant-claims.repository";
import { postExistingTenantOpeningBalanceEntry } from "@/server/repositories/ledger.repository";
import {
  createLiveExistingTenantTenancy,
  getActiveTenancyForUnit,
  getPendingAgreementTenancyForUnit,
} from "@/server/repositories/tenancies.repository";
import { createTenantFromExistingClaim } from "@/server/repositories/tenants.repository";
import {
  getUnitById,
  getUnitWithPropertyById,
  markUnitOccupied,
  type UnitStatus,
  type UnitType,
} from "@/server/repositories/units.repository";
import { writeAuditLog } from "@/server/services/audit-log.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  ApproveExistingTenantClaimInput,
  CreateExistingTenantClaimInput,
  ExistingTenantPaymentHistoryItem,
  RejectExistingTenantClaimInput,
  SubmitExistingTenantClaimInput,
  UpdateExistingTenantClaimArrearsInput,
} from "@/server/validators/existing-tenant-claim.schema";
import { requireLandlordPlatformOperator } from "./auth.service";

type ExistingTenantClaimAuditEventType = Parameters<
  typeof writeAuditLog
>[0]["eventType"];

type ExistingTenantClaimUnitProperty = {
  id: string;
  property_name: string;
  landlord_id: string;
};

type RentChargeScheduleItem = {
  dueDate: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
};

type NormalizedPaymentHistoryItem = ExistingTenantPaymentHistoryItem & {
  note: string;
};

export type ExistingTenantClaimUnitOption = {
  label: string;
  value: string;
  propertyName: string;
  unitIdentifier: string;
  buildingName: string | null;
  unitType: UnitType;
  annualRent: number | null;
  monthlyRent: number | null;
  currencyCode: string;
  status: UnitStatus;
};

const EXISTING_TENANT_CLAIM_TOKEN_BYTES = 32;
const EXISTING_TENANT_CLAIM_TOKEN_DAYS = 7;

function createSecureToken() {
  return crypto
    .randomBytes(EXISTING_TENANT_CLAIM_TOKEN_BYTES)
    .toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function buildExistingTenantClaimUrl(token: string) {
  return `${getAppBaseUrl()}/existing-tenant-claims/${encodeURIComponent(
    token,
  )}`;
}

function getTokenExpiry() {
  return new Date(
    Date.now() + EXISTING_TENANT_CLAIM_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

function resolveUnitProperty(
  unitWithProperty: Awaited<ReturnType<typeof getUnitWithPropertyById>>,
): ExistingTenantClaimUnitProperty | null {
  const propertyRelation = unitWithProperty.properties as
    | ExistingTenantClaimUnitProperty
    | ExistingTenantClaimUnitProperty[]
    | null;

  if (Array.isArray(propertyRelation)) {
    return propertyRelation[0] ?? null;
  }

  return propertyRelation;
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);

  return nextDate;
}

function getFrequencyMonths(frequency: ExistingTenantClaimPaymentFrequency) {
  if (frequency === "monthly") {
    return 1;
  }

  if (frequency === "quarterly") {
    return 3;
  }

  if (frequency === "biannual") {
    return 6;
  }

  return 12;
}

function calculateCurrentPeriodEnd(params: {
  currentPeriodStart: string;
  paymentFrequency: ExistingTenantClaimPaymentFrequency;
}) {
  return toDateOnly(
    addMonths(
      parseDateOnly(params.currentPeriodStart),
      getFrequencyMonths(params.paymentFrequency),
    ),
  );
}

function normalizePaymentHistory(
  paymentHistory: ExistingTenantPaymentHistoryItem[],
): NormalizedPaymentHistoryItem[] {
  return paymentHistory
    .map((payment) => ({
      amount: Number(payment.amount),
      paidAt: payment.paidAt,
      note: payment.note?.trim() ?? "",
    }))
    .filter((payment) => payment.amount > 0)
    .sort((firstPayment, secondPayment) =>
      firstPayment.paidAt.localeCompare(secondPayment.paidAt),
    );
}

function buildRentChargeSchedule(params: {
  moveInDate: string;
  rentAmount: number;
  paymentFrequency: ExistingTenantClaimPaymentFrequency;
  today: Date;
}) {
  const frequencyMonths = getFrequencyMonths(params.paymentFrequency);
  const schedule: RentChargeScheduleItem[] = [];
  let dueDate = parseDateOnly(params.moveInDate);

  while (dueDate.getTime() <= params.today.getTime()) {
    const periodStart = new Date(dueDate);
    const periodEnd = addMonths(periodStart, frequencyMonths);

    schedule.push({
      dueDate: toDateOnly(dueDate),
      amount: params.rentAmount,
      periodStart: toDateOnly(periodStart),
      periodEnd: toDateOnly(periodEnd),
    });

    dueDate = periodEnd;
  }

  return schedule;
}

function calculatePaymentCoveredMonths(params: {
  outstandingBalance: number;
  rentAmount: number;
  paymentFrequency: ExistingTenantClaimPaymentFrequency;
}) {
  if (params.outstandingBalance <= 0 || params.rentAmount <= 0) {
    return 0;
  }

  const frequencyMonths = getFrequencyMonths(params.paymentFrequency);
  const owedPeriods = params.outstandingBalance / params.rentAmount;

  return Math.ceil(owedPeriods * frequencyMonths);
}

function calculateExistingTenantArrears(params: {
  moveInDate: string;
  rentAmount: number;
  paymentFrequency: ExistingTenantClaimPaymentFrequency;
  paymentHistory: ExistingTenantPaymentHistoryItem[];
}) {
  const today = new Date();
  const normalizedPayments = normalizePaymentHistory(params.paymentHistory);

  const rentCharges = buildRentChargeSchedule({
    moveInDate: params.moveInDate,
    rentAmount: params.rentAmount,
    paymentFrequency: params.paymentFrequency,
    today,
  });

  const totalRentCharges = rentCharges.reduce(
    (total, charge) => total + charge.amount,
    0,
  );

  const totalPayments = normalizedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );

  const outstandingBalance = Math.max(totalRentCharges - totalPayments, 0);

  const calculatedCurrentDueDate =
    rentCharges.at(-1)?.dueDate ?? params.moveInDate;

  const calculatedMonthsOwed = calculatePaymentCoveredMonths({
    outstandingBalance,
    rentAmount: params.rentAmount,
    paymentFrequency: params.paymentFrequency,
  });

  return {
    calculatedCurrentDueDate,
    calculatedOutstandingBalance: outstandingBalance,
    calculatedMonthsOwed,
    normalizedPayments,
    metadata: {
      move_in_date: params.moveInDate,
      rent_amount: params.rentAmount,
      payment_frequency: params.paymentFrequency,
      frequency_months: getFrequencyMonths(params.paymentFrequency),
      rent_charges: rentCharges,
      total_rent_charges: totalRentCharges,
      payment_history: normalizedPayments,
      total_payments: totalPayments,
      calculated_current_due_date: calculatedCurrentDueDate,
      calculated_months_owed: calculatedMonthsOwed,
      calculated_outstanding_balance: outstandingBalance,
      calculated_at: new Date().toISOString(),
    },
  };
}

function assertClaimPubliclySubmittable(params: {
  status: string;
  tokenExpiresAt: string;
}) {
  if (new Date(params.tokenExpiresAt).getTime() < Date.now()) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_EXPIRED",
      "This existing tenant claim link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  if (params.status !== "pending") {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_AVAILABLE",
      "This existing tenant claim link is no longer available.",
      400,
    );
  }
}

function buildClaimWhatsappMessage(params: {
  tenantName: string;
  propertyName: string;
  unitIdentifier: string;
  claimUrl: string;
}) {
  return [
    `Hello ${params.tenantName},`,
    "",
    `Your landlord has invited you to confirm your tenancy details for ${params.unitIdentifier} at ${params.propertyName} on BOPA (Boldverse Property).`,
    "",
    "Please use this secure link to confirm your rent amount, move-in date, and identity details:",
    params.claimUrl,
    "",
    "Your landlord will review and confirm the rent cycle before the tenancy record goes live.",
  ].join("\n");
}

async function writeExistingTenantClaimAudit(params: {
  landlordId: string;
  unitId: string;
  propertyId: string | null;
  actorProfileId: string | null;
  actorRole:
    | typeof AUDIT_ACTOR_ROLES.landlord
    | typeof AUDIT_ACTOR_ROLES.tenant;
  eventType: ExistingTenantClaimAuditEventType;
  entityId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  await writeAuditLog({
    landlordId: params.landlordId,
    tenantId: null,
    tenancyId: null,
    unitId: params.unitId,
    propertyId: params.propertyId,
    actorProfileId: params.actorProfileId,
    actorRole: params.actorRole,
    eventType: params.eventType,
    entityType: AUDIT_ENTITY_TYPES.onboarding,
    entityId: params.entityId,
    description: params.description,
    metadata: params.metadata,
  });
}

export async function getCurrentLandlordExistingTenantClaimUnitOptions() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("units")
    .select(
      `
      id,
      unit_identifier,
      building_name,
      unit_type,
      annual_rent,
      monthly_rent,
      currency_code,
      status,
      properties!inner (
        id,
        landlord_id,
        property_name
      )
    `,
    )
    .eq("properties.landlord_id", landlord.id)
    .is("deleted_at", null)
    .not("status", "in", "(archived,unavailable,under_renovation)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((unit) => {
    const property = Array.isArray(unit.properties)
      ? unit.properties[0]
      : unit.properties;

    const propertyName = property?.property_name ?? "Property";
    const unitIdentifier = String(unit.unit_identifier);
    const buildingName =
      typeof unit.building_name === "string" ? unit.building_name : null;

    return {
      label: `${propertyName} · ${
        buildingName ? `${buildingName} · ` : ""
      }${unitIdentifier}`,
      value: String(unit.id),
      propertyName,
      unitIdentifier,
      buildingName,
      unitType: unit.unit_type as UnitType,
      annualRent:
        typeof unit.annual_rent === "number" ? unit.annual_rent : null,
      monthlyRent:
        typeof unit.monthly_rent === "number" ? unit.monthly_rent : null,
      currencyCode:
        typeof unit.currency_code === "string" ? unit.currency_code : "NGN",
      status: unit.status as UnitStatus,
    } satisfies ExistingTenantClaimUnitOption;
  });
}

export async function createExistingTenantClaimForCurrentLandlord(
  input: CreateExistingTenantClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const [unit, unitWithProperty] = await Promise.all([
    getUnitById(supabase, input.unitId),
    getUnitWithPropertyById(supabase, input.unitId),
  ]);

  const property = resolveUnitProperty(unitWithProperty);

  if (!property || property.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to invite an existing tenant for this unit.",
      403,
    );
  }

  if (
    unit.status === "archived" ||
    unit.status === "unavailable" ||
    unit.status === "under_renovation"
  ) {
    throw new AppError(
      "UNIT_NOT_AVAILABLE",
      "This unit cannot receive an existing tenant claim link.",
      400,
    );
  }

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);
  const token = createSecureToken();
  const tokenHash = hashToken(token);
  const tokenExpiresAt = getTokenExpiry();

  const claim = await createExistingTenantClaim(adminSupabase, {
    landlordId: landlord.id,
    unitId: input.unitId,
    tokenHash,
    tokenExpiresAt,
    invitedTenantFullName: input.fullName,
    invitedTenantPhoneNumber: normalizedPhone.e164,
    invitedTenantEmail: input.email?.trim()
      ? input.email.trim().toLowerCase()
      : null,
    note: input.note?.trim() || null,
  });

  const claimUrl = buildExistingTenantClaimUrl(token);
  const whatsappMessage = buildClaimWhatsappMessage({
    tenantName: input.fullName,
    propertyName: property.property_name,
    unitIdentifier: unitWithProperty.unit_identifier,
    claimUrl,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: unit.id,
    propertyId: property.id,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.onboardingLinkSent,
    entityId: claim.id,
    description: `Existing tenant claim link created for ${unitWithProperty.unit_identifier}.`,
    metadata: {
      existing_tenant_claim_id: claim.id,
      invited_tenant_full_name: input.fullName,
      invited_tenant_phone_number: normalizedPhone.e164,
      unit_identifier: unitWithProperty.unit_identifier,
      property_name: property.property_name,
      token_expires_at: tokenExpiresAt,
    },
  });

  return {
    claim,
    claimUrl,
    whatsappMessage,
    tenantWhatsappNumber: normalizedPhone.national,
    expiresAt: tokenExpiresAt,
  };
}

export async function resolveExistingTenantClaimToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(token);
  const claim = await getExistingTenantClaimByTokenHash(supabase, tokenHash);

  if (!claim) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_FOUND",
      "This existing tenant claim link is invalid.",
      404,
    );
  }

  if (
    claim.status === "pending" &&
    new Date(claim.token_expires_at).getTime() < Date.now()
  ) {
    await markExistingTenantClaimExpired(supabase, claim.id);

    throw new AppError(
      "EXISTING_TENANT_CLAIM_EXPIRED",
      "This existing tenant claim link has expired. Please ask the landlord to send a new link.",
      410,
    );
  }

  return claim;
}

export async function submitExistingTenantClaimByToken(
  input: SubmitExistingTenantClaimInput,
) {
  const supabase = createSupabaseAdminClient();
  const tokenHash = hashToken(input.token);
  const claim = await getExistingTenantClaimByTokenHash(supabase, tokenHash);

  if (!claim) {
    throw new AppError(
      "EXISTING_TENANT_CLAIM_NOT_FOUND",
      "This existing tenant claim link is invalid.",
      404,
    );
  }

  assertClaimPubliclySubmittable({
    status: claim.status,
    tokenExpiresAt: claim.token_expires_at,
  });

  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);

  const submittedClaim = await submitExistingTenantClaim(supabase, {
    claimId: claim.id,
    fullName: input.fullName,
    phoneNumber: normalizedPhone.e164,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
    occupation: input.occupation,
    idType: input.idType,
    idNumber: input.idNumber,
    moveInDate: input.moveInDate,
    claimedRentAmount: input.claimedRentAmount,
    paymentFrequency: input.paymentFrequency,
    tenantNotes: input.tenantNotes?.trim() || null,
  });

  await writeExistingTenantClaimAudit({
    landlordId: submittedClaim.landlord_id,
    unitId: submittedClaim.unit_id,
    propertyId: submittedClaim.units?.properties?.id ?? null,
    actorProfileId: null,
    actorRole: AUDIT_ACTOR_ROLES.tenant,
    eventType: AUDIT_EVENT_TYPES.tenantKycSubmitted,
    entityId: submittedClaim.id,
    description:
      "Existing tenant submitted tenancy details for landlord review.",
    metadata: {
      existing_tenant_claim_id: submittedClaim.id,
      tenant_full_name: submittedClaim.tenant_full_name,
      tenant_phone_number: submittedClaim.tenant_phone_number,
      tenant_occupation: submittedClaim.tenant_occupation,
      tenant_id_type: submittedClaim.tenant_id_type,
      tenant_claimed_rent_amount: submittedClaim.tenant_claimed_rent_amount,
      tenant_move_in_date: submittedClaim.tenant_move_in_date,
      payment_frequency: submittedClaim.tenant_payment_frequency,
    },
  });

  return submittedClaim;
}

export async function getCurrentLandlordExistingTenantClaims() {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();

  return listExistingTenantClaimsForLandlord(supabase, landlord.id);
}

export async function getCurrentLandlordExistingTenantClaim(claimId: string) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const claim = await getExistingTenantClaimById(supabase, claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this existing tenant claim.",
      403,
    );
  }

  return claim;
}

export async function updateExistingTenantClaimArrearsForCurrentLandlord(
  input: UpdateExistingTenantClaimArrearsInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const claim = await getExistingTenantClaimById(supabase, input.claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to update arrears for this existing tenant claim.",
      403,
    );
  }

  if (claim.status !== "submitted") {
    throw new AppError(
      "CLAIM_NOT_READY_FOR_ARREARS",
      "Only submitted existing tenant claims can have arrears calculated.",
      400,
    );
  }

  if (!claim.tenant_move_in_date || !claim.tenant_claimed_rent_amount) {
    throw new AppError(
      "CLAIM_RENT_DETAILS_INCOMPLETE",
      "The tenant must submit move-in date and rent amount before arrears can be calculated.",
      400,
    );
  }

  const calculation = calculateExistingTenantArrears({
    moveInDate: claim.tenant_move_in_date,
    rentAmount: Number(claim.tenant_claimed_rent_amount),
    paymentFrequency: claim.tenant_payment_frequency,
    paymentHistory: input.paymentHistory,
  });

  const updatedClaim = await updateExistingTenantClaimArrears(supabase, {
    claimId: input.claimId,
    landlordId: landlord.id,
    paymentHistory: calculation.normalizedPayments,
    calculatedCurrentDueDate: calculation.calculatedCurrentDueDate,
    calculatedOutstandingBalance: calculation.calculatedOutstandingBalance,
    calculatedMonthsOwed: calculation.calculatedMonthsOwed,
    calculationMetadata: calculation.metadata,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: claim.unit_id,
    propertyId: claim.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantUpdated,
    entityId: claim.id,
    description:
      "Existing tenant arrears estimate was updated from payment history.",
    metadata: {
      existing_tenant_claim_id: claim.id,
      tenant_full_name: claim.tenant_full_name,
      payment_history_count: calculation.normalizedPayments.length,
      total_payments: calculation.metadata.total_payments,
      total_rent_charges: calculation.metadata.total_rent_charges,
      calculated_current_due_date: calculation.calculatedCurrentDueDate,
      calculated_outstanding_balance: calculation.calculatedOutstandingBalance,
      calculated_months_owed: calculation.calculatedMonthsOwed,
    },
  });

  return updatedClaim;
}

export async function approveExistingTenantClaimForCurrentLandlord(
  input: ApproveExistingTenantClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const claim = await getExistingTenantClaimById(supabase, input.claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to approve this existing tenant claim.",
      403,
    );
  }

  if (claim.status !== "submitted") {
    throw new AppError(
      "CLAIM_NOT_READY_FOR_APPROVAL",
      "Only submitted existing tenant claims can be approved.",
      400,
    );
  }

  if (
    !claim.tenant_full_name ||
    !claim.tenant_phone_number ||
    !claim.tenant_move_in_date ||
    !claim.tenant_claimed_rent_amount ||
    !claim.tenant_id_type
  ) {
    throw new AppError(
      "CLAIM_DETAILS_INCOMPLETE",
      "The tenant claim is missing required details.",
      400,
    );
  }

  const [unit, existingUnitTenancy, existingPendingUnitTenancy] =
    await Promise.all([
      getUnitById(supabase, claim.unit_id),
      getActiveTenancyForUnit(supabase, claim.unit_id),
      getPendingAgreementTenancyForUnit(supabase, claim.unit_id),
    ]);

  if (existingUnitTenancy || existingPendingUnitTenancy) {
    throw new AppError(
      "UNIT_ALREADY_HAS_TENANCY",
      "This unit already has an active tenancy.",
      400,
    );
  }

  if (
    unit.status === "archived" ||
    unit.status === "unavailable" ||
    unit.status === "under_renovation"
  ) {
    throw new AppError(
      "UNIT_NOT_AVAILABLE_FOR_TENANCY",
      "This unit is not available for tenancy approval.",
      400,
    );
  }

  const currentPeriodEnd = calculateCurrentPeriodEnd({
    currentPeriodStart: input.confirmedCurrentDueDate,
    paymentFrequency: claim.tenant_payment_frequency,
  });

  const tenant = await createTenantFromExistingClaim(adminSupabase, {
    landlordId: landlord.id,
    unitId: claim.unit_id,
    fullName: claim.tenant_full_name,
    phoneNumber: claim.tenant_phone_number,
    email: claim.tenant_email,
    occupation: claim.tenant_occupation,
    idType: claim.tenant_id_type,
    approvedBy: landlord.id,
    sourceExistingTenantClaimId: claim.id,
    kycAnswers: {
      source: "existing_tenant_claim",
      existing_tenant_claim_id: claim.id,
      tenant_id_number: claim.tenant_id_number,
      tenant_claimed_move_in_date: claim.tenant_move_in_date,
      tenant_claimed_rent_amount: claim.tenant_claimed_rent_amount,
      landlord_payment_history: claim.landlord_payment_history,
      landlord_confirmed_move_in_date: input.confirmedMoveInDate,
      landlord_confirmed_current_due_date: input.confirmedCurrentDueDate,
      landlord_confirmed_current_period_end: currentPeriodEnd,
      landlord_confirmed_rent_amount: input.confirmedRentAmount,
      landlord_confirmed_opening_balance: input.openingBalance,
      landlord_review_notes: input.reviewNotes || null,
    },
  });

  const tenancy = await createLiveExistingTenantTenancy(adminSupabase, {
    landlordId: landlord.id,
    tenantId: tenant.id,
    unitId: claim.unit_id,
    rentAmount: input.confirmedRentAmount,
    paymentFrequency: claim.tenant_payment_frequency,
    currencyCode: claim.units?.currency_code ?? "NGN",
    moveInDate: input.confirmedMoveInDate,
    currentPeriodStart: input.confirmedCurrentDueDate,
    openingBalance: input.openingBalance,
    openingBalanceNote:
      input.openingBalance > 0
        ? "Opening balance from existing tenant approval."
        : null,
    agreementNotes: input.reviewNotes || null,
  });

  await postExistingTenantOpeningBalanceEntry(adminSupabase, {
    landlordId: landlord.id,
    tenantId: tenant.id,
    tenancyId: tenancy.id,
    amount: input.openingBalance,
    currencyCode: tenancy.currency_code,
    description: "Opening balance from existing tenant onboarding.",
    entryDate: input.confirmedCurrentDueDate,
    metadata: {
      source: "existing_tenant_claim",
      existing_tenant_claim_id: claim.id,
      claimed_rent_amount: claim.tenant_claimed_rent_amount,
      confirmed_rent_amount: input.confirmedRentAmount,
      confirmed_move_in_date: input.confirmedMoveInDate,
      confirmed_current_due_date: input.confirmedCurrentDueDate,
      current_period_end: currentPeriodEnd,
      landlord_payment_history: claim.landlord_payment_history,
      bopa_calculated_outstanding_balance:
        claim.bopa_calculated_outstanding_balance,
    },
  });

  await markUnitOccupied(adminSupabase, claim.unit_id);

  const approvedClaim = await approveExistingTenantClaim(adminSupabase, {
    claimId: claim.id,
    landlordId: landlord.id,
    reviewedBy: landlord.id,
    confirmedRentAmount: input.confirmedRentAmount,
    confirmedMoveInDate: input.confirmedMoveInDate,
    confirmedCurrentDueDate: input.confirmedCurrentDueDate,
    confirmedNextRentDueDate: tenancy.next_rent_charge_date ?? currentPeriodEnd,
    openingBalance: input.openingBalance,
    reviewNotes: input.reviewNotes?.trim() || null,
    approvedTenantId: tenant.id,
    approvedTenancyId: tenancy.id,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: claim.unit_id,
    propertyId: claim.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantApproved,
    entityId: claim.id,
    description: "Existing tenant claim was approved and converted to tenancy.",
    metadata: {
      existing_tenant_claim_id: claim.id,
      tenant_id: tenant.id,
      tenancy_id: tenancy.id,
      tenant_full_name: tenant.full_name,
      confirmed_rent_amount: input.confirmedRentAmount,
      confirmed_move_in_date: input.confirmedMoveInDate,
      confirmed_current_due_date: input.confirmedCurrentDueDate,
      opening_balance: input.openingBalance,
    },
  });

  await writeAuditLog({
    landlordId: landlord.id,
    tenantId: tenant.id,
    tenancyId: tenancy.id,
    unitId: claim.unit_id,
    propertyId: claim.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenancyCreated,
    entityType: AUDIT_ENTITY_TYPES.tenancy,
    entityId: tenancy.id,
    description: `Existing tenant tenancy created for ${tenant.full_name}.`,
    metadata: {
      source: "existing_tenant_claim",
      existing_tenant_claim_id: claim.id,
      tenancy_reference: tenancy.tenancy_reference,
      rent_amount: tenancy.rent_amount,
      payment_frequency: tenancy.payment_frequency,
      start_date: tenancy.start_date,
      current_period_start: tenancy.current_period_start,
      current_period_end: tenancy.current_period_end,
      next_rent_charge_date: tenancy.next_rent_charge_date,
      opening_balance: input.openingBalance,
    },
  });

  return approvedClaim;
}

export async function rejectExistingTenantClaimForCurrentLandlord(
  input: RejectExistingTenantClaimInput,
) {
  const landlord = await requireLandlordPlatformOperator();
  const supabase = await createSupabaseServerClient();
  const claim = await getExistingTenantClaimById(supabase, input.claimId);

  if (claim.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to reject this existing tenant claim.",
      403,
    );
  }

  const rejectedClaim = await rejectExistingTenantClaim(supabase, {
    claimId: input.claimId,
    landlordId: landlord.id,
    reviewedBy: landlord.id,
    reason: input.reason,
  });

  await writeExistingTenantClaimAudit({
    landlordId: landlord.id,
    unitId: claim.unit_id,
    propertyId: claim.units?.properties?.id ?? null,
    actorProfileId: landlord.id,
    actorRole: AUDIT_ACTOR_ROLES.landlord,
    eventType: AUDIT_EVENT_TYPES.tenantRejected,
    entityId: claim.id,
    description: "Existing tenant claim was rejected.",
    metadata: {
      existing_tenant_claim_id: claim.id,
      tenant_full_name: claim.tenant_full_name,
      rejected_reason: input.reason,
    },
  });

  return rejectedClaim;
}
