import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createAgentTenantOnboardingTenant,
  getPublicTenantByOnboardingTokenHash,
} from "@/server/repositories/agent-tenant-onboarding.repository";
import {
  getAgentPropertyListingById,
  getAgentPropertyListings,
  type AgentPropertyListingRow,
} from "@/server/repositories/agent-property-listings.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { CreateAgentTenantOnboardingLinkInput } from "@/server/validators/agent-tenant-onboarding.schema";
import { requireAgent } from "./auth.service";

const TENANT_ONBOARDING_TOKEN_BYTES = 32;
const TENANT_ONBOARDING_TOKEN_DAYS = 7;

function createSecureToken() {
  return crypto
    .randomBytes(TENANT_ONBOARDING_TOKEN_BYTES)
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

function buildTenantOnboardingUrl(token: string) {
  return `${getAppBaseUrl()}/t/onboarding/${encodeURIComponent(token)}`;
}

function buildWhatsAppUrl(params: {
  phoneNumber: string;
  tenantName: string;
  propertyName: string;
  unitIdentifier: string;
  onboardingUrl: string;
}) {
  const phoneDigits = params.phoneNumber.replace(/\D/g, "");

  const message = [
    `Hello ${params.tenantName},`,
    "",
    `You have been invited to complete your tenant profile for ${params.unitIdentifier} at ${params.propertyName} on Tenuro.`,
    "Please use the secure link below to complete your onboarding:",
    params.onboardingUrl,
    "",
    "Tenuro - Property records made simple.",
  ].join("\n");

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

function assertListingReadyForTenantOnboarding(
  listing: AgentPropertyListingRow,
) {
  if (listing.status !== "converted") {
    throw new AppError(
      "LISTING_NOT_READY_FOR_TENANT_ONBOARDING",
      "The landlord must complete property setup before tenant onboarding can be sent.",
      400,
    );
  }

  if (!listing.matched_landlord_id || !listing.converted_unit_id) {
    throw new AppError(
      "LISTING_CONVERSION_REQUIRED",
      "This listing must be connected to a landlord property and unit before tenant onboarding can be sent.",
      400,
    );
  }
}

async function writeAgentTenantOnboardingAuditLog(params: {
  agentId: string;
  listingId: string;
  tenantId: string;
  landlordId: string;
  unitId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: params.landlordId,
    tenant_id: params.tenantId,
    tenancy_id: null,
    unit_id: params.unitId,
    property_id: null,
    actor_profile_id: params.agentId,
    actor_role: "agent",
    event_type: "agent_tenant_onboarding_link_sent",
    entity_type: "tenant",
    entity_id: params.tenantId,
    description: params.description,
    metadata: {
      agent_property_listing_id: params.listingId,
      ...params.metadata,
    },
  });

  if (error) {
    throw error;
  }
}

export async function getCurrentAgentTenantOnboardingWorkspace() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const listings = await getAgentPropertyListings(supabase, agent.id);

  return {
    agent,
    listings: listings.filter(
      (listing) =>
        listing.status === "converted" &&
        Boolean(listing.matched_landlord_id) &&
        Boolean(listing.converted_unit_id),
    ),
  };
}

export async function createTenantOnboardingLinkForCurrentAgent(
  input: CreateAgentTenantOnboardingLinkInput,
) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const listing = await getAgentPropertyListingById(supabase, input.listingId);

  if (listing.agent_id !== agent.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to send tenant onboarding for this listing.",
      403,
    );
  }

  assertListingReadyForTenantOnboarding(listing);

  const landlordId = listing.matched_landlord_id;
  const unitId = listing.converted_unit_id;

  if (!landlordId || !unitId) {
    throw new AppError(
      "LISTING_CONVERSION_REQUIRED",
      "This listing must be connected to a landlord property and unit before tenant onboarding can be sent.",
      400,
    );
  }

  const normalizedTenantPhone = normalisePhoneNumber(input.phoneNumber);
  const token = createSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + TENANT_ONBOARDING_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const adminSupabase = createSupabaseAdminClient();

  const tenant = await createAgentTenantOnboardingTenant(adminSupabase, {
    landlordId,
    unitId,
    agentPropertyListingId: listing.id,
    invitedByAgentId: agent.id,
    fullName: input.fullName,
    phoneNumber: normalizedTenantPhone.e164,
    email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
    note: input.note?.trim() ? input.note.trim() : null,
    onboardingTokenHash: tokenHash,
    onboardingTokenExpiresAt: expiresAt,
  });

  const onboardingUrl = buildTenantOnboardingUrl(token);
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: tenant.phone_number,
    tenantName: tenant.full_name,
    propertyName: listing.property_name,
    unitIdentifier: listing.unit_identifier,
    onboardingUrl,
  });

  await writeAgentTenantOnboardingAuditLog({
    agentId: agent.id,
    listingId: listing.id,
    tenantId: tenant.id,
    landlordId,
    unitId,
    description: `Agent sent tenant onboarding link to ${tenant.full_name}.`,
    metadata: {
      tenant_name: tenant.full_name,
      tenant_phone_number: tenant.phone_number,
      property_name: listing.property_name,
      unit_identifier: listing.unit_identifier,
      onboarding_token_expires_at: expiresAt,
    },
  });

  return {
    tenant,
    onboardingUrl,
    whatsappUrl,
  };
}

export async function getPublicTenantOnboardingByToken(token: string) {
  const tokenHash = hashToken(token);
  const supabase = createSupabaseAdminClient();

  const tenant = await getPublicTenantByOnboardingTokenHash(
    supabase,
    tokenHash,
  );

  if (!tenant) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid or has already been used.",
      404,
    );
  }

  if (
    tenant.onboarding_status !== "invited" &&
    tenant.onboarding_status !== "profile_complete"
  ) {
    throw new AppError(
      "TENANT_ONBOARDING_NOT_AVAILABLE",
      "This tenant onboarding link is no longer available.",
      400,
    );
  }

  if (!tenant.onboarding_token_expires_at) {
    throw new AppError(
      "INVALID_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link is invalid.",
      400,
    );
  }

  if (new Date(tenant.onboarding_token_expires_at).getTime() < Date.now()) {
    throw new AppError(
      "EXPIRED_TENANT_ONBOARDING_LINK",
      "This tenant onboarding link has expired. Please ask the agent or landlord to send a new link.",
      410,
    );
  }

  return tenant;
}
