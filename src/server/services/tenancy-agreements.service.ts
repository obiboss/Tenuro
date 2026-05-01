import "server-only";

import { AppError } from "@/server/errors/app-error";
import {
  createTenancyAgreementDraft,
  getTenancyAgreementById,
  getTenancyAgreementByTenancyId,
  updateTenancyAgreementDraft,
} from "@/server/repositories/tenancy-agreements.repository";
import { getTenancyById } from "@/server/repositories/tenancies.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type {
  GenerateTenancyAgreementInput,
  SaveTenancyAgreementDraftInput,
} from "@/server/validators/tenancy-agreement.schema";
import { requireLandlord } from "./auth.service";
import { buildTenancyAgreementTemplate } from "./tenancy-agreement-template.service";

function buildSnapshots(params: {
  landlord: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
  };
  tenancy: Awaited<ReturnType<typeof getTenancyById>>;
}) {
  const tenant = params.tenancy.tenants;
  const unit = params.tenancy.units;
  const property = unit?.properties;

  return {
    landlordSnapshot: {
      id: params.landlord.id,
      fullName: params.landlord.fullName,
      phoneNumber: params.landlord.phoneNumber,
      email: params.landlord.email,
    },
    tenantSnapshot: {
      id: tenant?.id ?? null,
      fullName: tenant?.full_name ?? null,
      phoneNumber: tenant?.phone_number ?? null,
      email: tenant?.email ?? null,
    },
    propertySnapshot: {
      id: property?.id ?? null,
      propertyName: property?.property_name ?? null,
      address: property?.address ?? null,
      unitId: unit?.id ?? null,
      unitIdentifier: unit?.unit_identifier ?? null,
      buildingName: unit?.building_name ?? null,
      unitType: unit?.unit_type ?? null,
    },
    tenancySnapshot: {
      id: params.tenancy.id,
      tenancyReference: params.tenancy.tenancy_reference,
      rentAmount: params.tenancy.rent_amount,
      paymentFrequency: params.tenancy.payment_frequency,
      currencyCode: params.tenancy.currency_code,
      startDate: params.tenancy.start_date,
      endDate: params.tenancy.end_date,
      renewalNoticeDate: params.tenancy.renewal_notice_date,
      openingBalance: params.tenancy.opening_balance,
      openingBalanceNote: params.tenancy.opening_balance_note,
    },
  };
}

export async function getCurrentTenancyAgreementByTenancyId(tenancyId: string) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to view this agreement.",
      403,
    );
  }

  return getTenancyAgreementByTenancyId(supabase, tenancyId);
}

export async function generateTenancyAgreementForCurrentLandlord(
  input: GenerateTenancyAgreementInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const tenancy = await getTenancyById(supabase, input.tenancyId);

  if (tenancy.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to generate this agreement.",
      403,
    );
  }

  if (tenancy.status !== "active") {
    throw new AppError(
      "TENANCY_NOT_ACTIVE",
      "Create an active tenancy record before generating the agreement document.",
      400,
    );
  }

  const existingAgreement = await getTenancyAgreementByTenancyId(
    supabase,
    input.tenancyId,
  );

  if (existingAgreement) {
    return existingAgreement;
  }

  const snapshots = buildSnapshots({
    landlord,
    tenancy,
  });

  const agreementBody = buildTenancyAgreementTemplate({
    landlord,
    tenancy,
  });

  return createTenancyAgreementDraft(supabase, {
    landlordId: landlord.id,
    tenantId: tenancy.tenant_id,
    tenancyId: tenancy.id,
    agreementBody,
    ...snapshots,
  });
}

export async function saveTenancyAgreementDraftForCurrentLandlord(
  input: SaveTenancyAgreementDraftInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const agreement = await getTenancyAgreementById(supabase, input.agreementId);

  if (agreement.landlord_id !== landlord.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this agreement.",
      403,
    );
  }

  if (agreement.document_status !== "draft") {
    throw new AppError(
      "AGREEMENT_LOCKED",
      "This agreement can no longer be edited.",
      400,
    );
  }

  return updateTenancyAgreementDraft(supabase, {
    agreementId: input.agreementId,
    agreementBody: input.agreementBody,
  });
}
