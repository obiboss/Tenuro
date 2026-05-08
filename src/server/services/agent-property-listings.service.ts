import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  createAgentPropertyListing,
  getAgentPropertyListingById,
  getAgentPropertyListingByVerificationTokenHash,
  getAgentPropertyListings,
  markAgentPropertyListingLandlordVerified,
  updateAgentPropertyListingVerificationToken,
  type AgentPropertyListingRow,
} from "@/server/repositories/agent-property-listings.repository";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { getAgentProfileByAgentId } from "@/server/repositories/agent-profile.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type { AgentPropertyListingInput } from "@/server/validators/agent-property-listing.schema";
import { requireAgent } from "./auth.service";

const LANDLORD_VERIFICATION_TOKEN_BYTES = 32;
const LANDLORD_VERIFICATION_TOKEN_DAYS = 7;

function createVerificationToken() {
  return crypto
    .randomBytes(LANDLORD_VERIFICATION_TOKEN_BYTES)
    .toString("base64url");
}

function hashVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getAppBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new AppError("APP_URL_MISSING", "App URL is not configured.", 500);
  }

  return appUrl.replace(/\/$/, "");
}

function buildLandlordVerificationUrl(token: string) {
  return `${getAppBaseUrl()}/a/property-verification/${encodeURIComponent(
    token,
  )}`;
}

function buildWhatsAppUrl(params: {
  phoneNumber: string;
  landlordName: string;
  propertyName: string;
  verificationUrl: string;
}) {
  const phoneDigits = params.phoneNumber.replace(/\D/g, "");
  const message = [
    `Hello ${params.landlordName},`,
    "",
    `Your property "${params.propertyName}" was submitted on Tenuro by an agent.`,
    "Please verify that you own or authorised this property listing using the secure link below:",
    params.verificationUrl,
    "",
    "Tenuro - Property records made simple.",
  ].join("\n");

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

async function writeAgentPropertyListingAuditLog(params: {
  agentId: string;
  listingId: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: null,
    tenant_id: null,
    tenancy_id: null,
    unit_id: null,
    property_id: null,
    actor_profile_id: params.agentId,
    actor_role: "agent",
    event_type: params.eventType,
    entity_type: "agent_property_listing",
    entity_id: params.listingId,
    description: params.description,
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
}

async function writeSystemPropertyListingAuditLog(params: {
  listingId: string;
  eventType: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: null,
    tenant_id: null,
    tenancy_id: null,
    unit_id: null,
    property_id: null,
    actor_profile_id: null,
    actor_role: "system",
    event_type: params.eventType,
    entity_type: "agent_property_listing",
    entity_id: params.listingId,
    description: params.description,
    metadata: params.metadata,
  });

  if (error) {
    throw error;
  }
}

export async function getCurrentAgentListingsWorkspace() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const [profile, paystackAccount, listings] = await Promise.all([
    getAgentProfileByAgentId(supabase, agent.id),
    getActiveAgentPaystackAccount(supabase, agent.id),
    getAgentPropertyListings(supabase, agent.id),
  ]);

  return {
    agent,
    profile,
    paystackAccount,
    listings,
  };
}

export async function createPropertyListingForCurrentAgent(
  input: AgentPropertyListingInput,
) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const profile = await getAgentProfileByAgentId(supabase, agent.id);

  if (!profile) {
    throw new AppError(
      "AGENT_PROFILE_REQUIRED",
      "Complete your agent profile before submitting a property listing.",
      400,
    );
  }

  const normalizedLandlordPhone = normalisePhoneNumber(
    input.landlordPhoneNumber,
  );

  const listing = await createAgentPropertyListing(supabase, {
    agentId: agent.id,
    agentProfileId: profile.id,
    input: {
      ...input,
      landlordPhoneNumber: normalizedLandlordPhone.e164,
    },
  });

  await writeAgentPropertyListingAuditLog({
    agentId: agent.id,
    listingId: listing.id,
    eventType: "agent_property_listing_created",
    description: `Agent submitted property listing: ${listing.property_name}.`,
    metadata: {
      property_name: listing.property_name,
      property_type: listing.property_type,
      state: listing.state,
      lga: listing.lga,
      landlord_full_name: listing.landlord_full_name,
      unit_identifier: listing.unit_identifier,
      unit_type: listing.unit_type,
      annual_rent: listing.annual_rent,
      monthly_rent: listing.monthly_rent,
      status: listing.status,
    },
  });

  return listing;
}

export async function createLandlordVerificationLinkForCurrentAgent(
  listingId: string,
) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const listing = await getAgentPropertyListingById(supabase, listingId);

  if (listing.agent_id !== agent.id) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to send verification for this listing.",
      403,
    );
  }

  if (
    listing.status !== "submitted" &&
    listing.status !== "landlord_verification_sent"
  ) {
    throw new AppError(
      "INVALID_LISTING_STATUS",
      "This listing cannot receive a verification link in its current status.",
      400,
    );
  }

  const token = createVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(
    Date.now() + LANDLORD_VERIFICATION_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updatedListing = await updateAgentPropertyListingVerificationToken(
    supabase,
    {
      listingId,
      tokenHash,
      expiresAt,
    },
  );

  const verificationUrl = buildLandlordVerificationUrl(token);
  const whatsappUrl = buildWhatsAppUrl({
    phoneNumber: updatedListing.landlord_phone_number,
    landlordName: updatedListing.landlord_full_name,
    propertyName: updatedListing.property_name,
    verificationUrl,
  });

  await writeAgentPropertyListingAuditLog({
    agentId: agent.id,
    listingId: updatedListing.id,
    eventType: "agent_landlord_verification_link_created",
    description: `Landlord verification link created for ${updatedListing.property_name}.`,
    metadata: {
      property_name: updatedListing.property_name,
      landlord_full_name: updatedListing.landlord_full_name,
      landlord_phone_number: updatedListing.landlord_phone_number,
      verification_expires_at:
        updatedListing.landlord_verification_token_expires_at,
      status: updatedListing.status,
    },
  });

  return {
    listing: updatedListing,
    verificationUrl,
    whatsappUrl,
  };
}

export async function getPublicLandlordVerificationListing(token: string) {
  const tokenHash = hashVerificationToken(token);
  const supabase = createSupabaseAdminClient();

  const listing = await getAgentPropertyListingByVerificationTokenHash(
    supabase,
    tokenHash,
  );

  if (!listing) {
    throw new AppError(
      "INVALID_VERIFICATION_LINK",
      "This property verification link is invalid or has already been used.",
      404,
    );
  }

  if (listing.status !== "landlord_verification_sent") {
    throw new AppError(
      "INVALID_VERIFICATION_STATUS",
      "This property listing cannot be verified from this link.",
      400,
    );
  }

  if (!listing.landlord_verification_token_expires_at) {
    throw new AppError(
      "INVALID_VERIFICATION_LINK",
      "This property verification link is invalid.",
      400,
    );
  }

  if (
    new Date(listing.landlord_verification_token_expires_at).getTime() <
    Date.now()
  ) {
    throw new AppError(
      "EXPIRED_VERIFICATION_LINK",
      "This property verification link has expired. Please ask the agent to send a new link.",
      410,
    );
  }

  return listing;
}

export async function verifyAgentPropertyListingByLandlord(token: string) {
  const listing = await getPublicLandlordVerificationListing(token);
  const supabase = createSupabaseAdminClient();

  const verifiedListing = await markAgentPropertyListingLandlordVerified(
    supabase,
    listing.id,
  );

  await writeSystemPropertyListingAuditLog({
    listingId: verifiedListing.id,
    eventType: "landlord_verified_agent_property_listing",
    description: `Landlord verified agent property listing: ${verifiedListing.property_name}.`,
    metadata: {
      property_name: verifiedListing.property_name,
      landlord_full_name: verifiedListing.landlord_full_name,
      landlord_phone_number: verifiedListing.landlord_phone_number,
      status: verifiedListing.status,
      verified_at: verifiedListing.landlord_verified_at,
    },
  });

  return verifiedListing;
}

export function getListingVerificationStatusCopy(
  listing: AgentPropertyListingRow,
) {
  if (listing.status === "landlord_verified") {
    return "Verified by landlord";
  }

  if (listing.status === "landlord_verification_sent") {
    return "Verification sent";
  }

  if (listing.status === "submitted") {
    return "Ready to verify";
  }

  return listing.status.replaceAll("_", " ");
}
