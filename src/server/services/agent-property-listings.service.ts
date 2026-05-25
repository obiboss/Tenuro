import "server-only";

import crypto from "node:crypto";
import { AppError } from "@/server/errors/app-error";
import {
  approveAgentPropertyListingByLandlord,
  createAgentPropertyListing,
  getAgentPropertyListingByClaimTokenHash,
  getAgentPropertyListingById,
  getAgentPropertyListingByVerificationTokenHash,
  getAgentPropertyListings,
  markAgentPropertyListingClaimedAndConverted,
  type AgentPropertyListingRow,
  updateAgentPropertyListingVerificationToken,
} from "@/server/repositories/agent-property-listings.repository";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { getAgentProfileByAgentId } from "@/server/repositories/agent-profile.repository";
import { createProperty } from "@/server/repositories/properties.repository";
import { upsertProfile } from "@/server/repositories/profiles.repository";
import { createUnit } from "@/server/repositories/units.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import { buildWaMeUrl } from "@/server/utils/whatsapp";
import type { AgentPropertyListingInput } from "@/server/validators/agent-property-listing.schema";
import { requireAgent } from "./auth.service";

const LANDLORD_VERIFICATION_TOKEN_BYTES = 32;
const LANDLORD_VERIFICATION_TOKEN_DAYS = 7;

function createSecureToken(byteLength: number) {
  return crypto.randomBytes(byteLength).toString("base64url");
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

function buildLandlordVerificationUrl(token: string) {
  return `${getAppBaseUrl()}/a/property-verification/${encodeURIComponent(
    token,
  )}`;
}

function buildLandlordClaimUrl(token: string) {
  return `${getAppBaseUrl()}/register/landlord/claim/${encodeURIComponent(
    token,
  )}`;
}

function buildLandlordVerificationWhatsAppUrl(params: {
  phoneNumber: string;
  landlordName: string;
  propertyName: string;
  verificationUrl: string;
}) {
  const message = [
    `Hello ${params.landlordName},`,
    "",
    `Your property "${params.propertyName}" was submitted on BOPA by an agent.`,
    "Please review the property details, correct anything that is wrong, and approve it using this secure link:",
    params.verificationUrl,
    "",
    "After approval, you can add more flats, rooms, shops, or units so your property records are complete.",
    "",
    "BOPA - Property records made simple.",
  ].join("\n");

  return buildWaMeUrl({
    phoneNumber: params.phoneNumber,
    message,
  });
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

async function findLandlordProfileByPhoneNumber(phoneNumber: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email")
    .eq("phone_number", phoneNumber)
    .eq("role", "landlord")
    .eq("is_active", true)
    .maybeSingle<{
      id: string;
      role: "landlord";
      full_name: string;
      phone_number: string;
      email: string | null;
    }>();

  if (error) {
    throw error;
  }

  return data;
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

  const token = createSecureToken(LANDLORD_VERIFICATION_TOKEN_BYTES);
  const tokenHash = hashToken(token);
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
  const whatsappUrl = buildLandlordVerificationWhatsAppUrl({
    phoneNumber: updatedListing.landlord_phone_number,
    landlordName: updatedListing.landlord_full_name,
    propertyName: updatedListing.property_name,
    verificationUrl,
  });

  await writeAgentPropertyListingAuditLog({
    agentId: agent.id,
    listingId: updatedListing.id,
    eventType: "agent_landlord_verification_link_sent",
    description: `Landlord verification link sent for ${updatedListing.property_name}.`,
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
  const tokenHash = hashToken(token);
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

  if (
    listing.status !== "landlord_verification_sent" &&
    listing.status !== "landlord_verified"
  ) {
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

export async function approveAgentPropertyListingByLandlordReview(params: {
  token: string;
  input: AgentPropertyListingInput;
}) {
  const listing = await getPublicLandlordVerificationListing(params.token);

  if (listing.status === "landlord_verified") {
    return {
      listing,
      existingLandlordFound: Boolean(listing.matched_landlord_id),
      claimUrl: listing.matched_landlord_id
        ? null
        : buildLandlordClaimUrl(params.token),
    };
  }

  const supabase = createSupabaseAdminClient();

  const normalizedLandlordPhone = normalisePhoneNumber(
    params.input.landlordPhoneNumber,
  );

  const finalInput = {
    ...params.input,
    landlordPhoneNumber: normalizedLandlordPhone.e164,
  };

  const matchedLandlord = await findLandlordProfileByPhoneNumber(
    finalInput.landlordPhoneNumber,
  );

  const claimToken = matchedLandlord ? null : params.token;

  const approvedListing = await approveAgentPropertyListingByLandlord(
    supabase,
    {
      listingId: listing.id,
      input: finalInput,
      matchedLandlordId: matchedLandlord?.id ?? null,
      claimTokenHash: claimToken ? hashToken(claimToken) : null,
      claimTokenExpiresAt: claimToken
        ? listing.landlord_verification_token_expires_at
        : null,
    },
  );

  const claimUrl = claimToken ? buildLandlordClaimUrl(claimToken) : null;

  await writeSystemPropertyListingAuditLog({
    listingId: approvedListing.id,
    eventType: "landlord_reviewed_and_approved_agent_property_listing",
    description: `Landlord reviewed and approved agent property listing: ${approvedListing.property_name}.`,
    metadata: {
      matched_existing_landlord: Boolean(matchedLandlord),
      claim_url_created: Boolean(claimUrl),
      previous: {
        landlord_full_name: listing.landlord_full_name,
        landlord_phone_number: listing.landlord_phone_number,
        landlord_email: listing.landlord_email,
        property_name: listing.property_name,
        address: listing.address,
        state: listing.state,
        lga: listing.lga,
        property_type: listing.property_type,
        building_name: listing.building_name,
        unit_identifier: listing.unit_identifier,
        unit_type: listing.unit_type,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        annual_rent: listing.annual_rent,
        monthly_rent: listing.monthly_rent,
        notes: listing.notes,
      },
      final: {
        landlord_full_name: approvedListing.landlord_full_name,
        landlord_phone_number: approvedListing.landlord_phone_number,
        landlord_email: approvedListing.landlord_email,
        property_name: approvedListing.property_name,
        address: approvedListing.address,
        state: approvedListing.state,
        lga: approvedListing.lga,
        property_type: approvedListing.property_type,
        building_name: approvedListing.building_name,
        unit_identifier: approvedListing.unit_identifier,
        unit_type: approvedListing.unit_type,
        bedrooms: approvedListing.bedrooms,
        bathrooms: approvedListing.bathrooms,
        annual_rent: approvedListing.annual_rent,
        monthly_rent: approvedListing.monthly_rent,
        notes: approvedListing.notes,
      },
      status: approvedListing.status,
      verified_at: approvedListing.landlord_verified_at,
    },
  });

  return {
    listing: approvedListing,
    existingLandlordFound: Boolean(matchedLandlord),
    claimUrl,
  };
}

export async function getPublicLandlordClaimListing(token: string) {
  const tokenHash = hashToken(token);
  const supabase = createSupabaseAdminClient();

  const listing = await getAgentPropertyListingByClaimTokenHash(
    supabase,
    tokenHash,
  );

  if (!listing) {
    throw new AppError(
      "INVALID_CLAIM_LINK",
      "This landlord account setup link is invalid or has already been used.",
      404,
    );
  }

  if (listing.status !== "landlord_verified") {
    throw new AppError(
      "INVALID_CLAIM_STATUS",
      "This property is not ready for landlord account setup.",
      400,
    );
  }

  if (listing.matched_landlord_id) {
    throw new AppError(
      "LANDLORD_ALREADY_EXISTS",
      "This landlord already has a BOPA account. Please sign in to continue.",
      400,
    );
  }

  if (!listing.landlord_claim_token_expires_at) {
    throw new AppError(
      "INVALID_CLAIM_LINK",
      "This landlord account setup link is invalid.",
      400,
    );
  }

  if (listing.landlord_claim_token_used_at) {
    throw new AppError(
      "CLAIM_LINK_USED",
      "This landlord account setup link has already been used.",
      400,
    );
  }

  if (
    new Date(listing.landlord_claim_token_expires_at).getTime() < Date.now()
  ) {
    throw new AppError(
      "EXPIRED_CLAIM_LINK",
      "This landlord account setup link has expired. Please ask the agent to resend the property review link.",
      410,
    );
  }

  return listing;
}

export async function completeLandlordClaimSignup(params: {
  token: string;
  password: string;
}) {
  const listing = await getPublicLandlordClaimListing(params.token);
  const existingLandlord = await findLandlordProfileByPhoneNumber(
    listing.landlord_phone_number,
  );

  if (existingLandlord) {
    throw new AppError(
      "LANDLORD_ALREADY_EXISTS",
      "A landlord account already exists for this phone number. Please sign in to continue.",
      409,
    );
  }

  const adminSupabase = createSupabaseAdminClient();

  const { data: createdUser, error: createUserError } =
    await adminSupabase.auth.admin.createUser({
      phone: listing.landlord_phone_number,
      password: params.password,
      phone_confirm: true,
      user_metadata: {
        full_name: listing.landlord_full_name,
        role: "landlord",
      },
    });

  if (createUserError || !createdUser.user) {
    throw new AppError(
      "LANDLORD_ACCOUNT_CREATE_FAILED",
      createUserError?.message ?? "Landlord account could not be created.",
      400,
    );
  }

  await upsertProfile(adminSupabase, {
    id: createdUser.user.id,
    role: "landlord",
    fullName: listing.landlord_full_name,
    phoneNumber: listing.landlord_phone_number,
    email: listing.landlord_email,
  });

  const property = await createProperty(adminSupabase, createdUser.user.id, {
    propertyName: listing.property_name,
    address: listing.address,
    state: listing.state,
    lga: listing.lga,
    propertyType: listing.property_type,
    countryCode: listing.country_code,
    currencyCode: listing.currency_code,
  });

  const unit = await createUnit(adminSupabase, {
    propertyId: property.id,
    buildingName: listing.building_name ?? "",
    unitIdentifier: listing.unit_identifier,
    unitType: listing.unit_type,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    monthlyRent: listing.monthly_rent,
    annualRent: listing.annual_rent,
    currencyCode: listing.currency_code,
  });

  await markAgentPropertyListingClaimedAndConverted(adminSupabase, {
    listingId: listing.id,
    landlordId: createdUser.user.id,
    propertyId: property.id,
    unitId: unit.id,
  });

  await writeSystemPropertyListingAuditLog({
    listingId: listing.id,
    eventType: "landlord_claimed_agent_property_listing",
    description: `Landlord account created and property converted: ${listing.property_name}.`,
    metadata: {
      landlord_id: createdUser.user.id,
      property_id: property.id,
      unit_id: unit.id,
      property_name: property.property_name,
      unit_identifier: unit.unit_identifier,
    },
  });

  const serverSupabase = await createSupabaseServerClient();

  await serverSupabase.auth.signInWithPassword({
    phone: listing.landlord_phone_number,
    password: params.password,
  });

  return {
    landlordId: createdUser.user.id,
    propertyId: property.id,
    unitId: unit.id,
  };
}

export function getListingVerificationStatusCopy(
  listing: AgentPropertyListingRow,
) {
  if (listing.status === "converted") {
    return "Landlord onboarded";
  }

  if (listing.status === "landlord_verified") {
    return "Approved by landlord";
  }

  if (listing.status === "landlord_verification_sent") {
    return "Sent to landlord";
  }

  if (listing.status === "submitted") {
    return "Ready to send";
  }

  return listing.status.replaceAll("_", " ");
}
