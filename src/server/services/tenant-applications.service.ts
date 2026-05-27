import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getAgentPropertyListingById } from "@/server/repositories/agent-property-listings.repository";
import {
  createPropertyApplication,
  createTenantKycProfile,
  getActiveProcessingFeeAccess,
  getActivePropertyApplicationForListing,
  getTenantKycProfileByPhoneNumber,
  updateTenantKycProfile,
  type PropertyApplicationRow,
  type TenantKycProfileInput,
  type TenantKycProfileRow,
  type TenantProcessingFeeAccessRow,
} from "@/server/repositories/tenant-applications.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { normalisePhoneNumber } from "@/server/utils/phone";

export const PROCESSING_FEE_VALIDITY_DAYS = 60;

export type TenantListingApplicationResult = {
  kycProfile: TenantKycProfileRow;
  application: PropertyApplicationRow;
  feeAccess: TenantProcessingFeeAccessRow | null;
  requiresProcessingFee: boolean;
};

function createAcquisitionContextKey(params: {
  agentId: string;
  landlordId: string | null;
  landlordPhoneNumber: string | null;
}) {
  if (params.landlordId) {
    return `agent:${params.agentId}:landlord:${params.landlordId}`;
  }

  if (params.landlordPhoneNumber) {
    return `agent:${params.agentId}:landlord_phone:${params.landlordPhoneNumber}`;
  }

  return `agent:${params.agentId}:landlord:unknown`;
}

function assertListingCanReceiveApplication(status: string) {
  if (status === "landlord_verified" || status === "converted") {
    return;
  }

  throw new AppError(
    "LISTING_NOT_AVAILABLE_FOR_APPLICATION",
    "This listing is not available for tenant applications yet.",
    400,
  );
}

async function upsertTenantKycProfile(
  input: TenantKycProfileInput,
): Promise<TenantKycProfileRow> {
  const supabase = createSupabaseAdminClient();
  const normalizedPhone = normalisePhoneNumber(input.phoneNumber);
  const existingProfile = await getTenantKycProfileByPhoneNumber(
    supabase,
    normalizedPhone.e164,
  );

  const finalInput: TenantKycProfileInput = {
    ...input,
    phoneNumber: normalizedPhone.e164,
  };

  if (!existingProfile) {
    return createTenantKycProfile(supabase, finalInput);
  }

  return updateTenantKycProfile(supabase, existingProfile.id, finalInput);
}

export async function createOrReuseTenantListingApplication(params: {
  agentPropertyListingId: string;
  kyc: TenantKycProfileInput;
}): Promise<TenantListingApplicationResult> {
  const supabase = createSupabaseAdminClient();

  const listing = await getAgentPropertyListingById(
    supabase,
    params.agentPropertyListingId,
  );

  assertListingCanReceiveApplication(listing.status);

  const kycProfile = await upsertTenantKycProfile(params.kyc);

  const acquisitionContextKey = createAcquisitionContextKey({
    agentId: listing.agent_id,
    landlordId: listing.matched_landlord_id,
    landlordPhoneNumber: listing.landlord_phone_number,
  });

  const nowIso = new Date().toISOString();

  const feeAccess = await getActiveProcessingFeeAccess(supabase, {
    tenantKycProfileId: kycProfile.id,
    acquisitionContextKey,
    nowIso,
  });

  const existingApplication = await getActivePropertyApplicationForListing(
    supabase,
    {
      tenantKycProfileId: kycProfile.id,
      agentPropertyListingId: listing.id,
    },
  );

  if (existingApplication) {
    return {
      kycProfile,
      application: existingApplication,
      feeAccess,
      requiresProcessingFee: !feeAccess,
    };
  }

  const application = await createPropertyApplication(supabase, {
    tenantKycProfileId: kycProfile.id,
    agentPropertyListingId: listing.id,
    agentId: listing.agent_id,
    landlordId: listing.matched_landlord_id,
    landlordPhoneNumber: listing.landlord_phone_number,
    acquisitionContextKey,
    processingFeeAccessId: feeAccess?.id ?? null,
    status: feeAccess ? "submitted_for_landlord_review" : "fee_pending",
    metadata: {
      source: "agent_listing_application",
      listing_status_at_application: listing.status,
      property_name: listing.property_name,
      unit_identifier: listing.unit_identifier,
      annual_rent: listing.annual_rent,
      monthly_rent: listing.monthly_rent,
    },
  });

  return {
    kycProfile,
    application,
    feeAccess,
    requiresProcessingFee: !feeAccess,
  };
}

export function getProcessingFeeValidUntil(paidAt: Date) {
  const validUntil = new Date(paidAt);
  validUntil.setDate(validUntil.getDate() + PROCESSING_FEE_VALIDITY_DAYS);
  return validUntil;
}

export function isProcessingFeeStillValid(
  validUntil: string,
  now = new Date(),
) {
  return new Date(validUntil).getTime() > now.getTime();
}
