import "server-only";

import {
  CARETAKER_INVITE_EXPIRY_HOURS,
  DEFAULT_CARETAKER_PERMISSIONS,
} from "@/server/constants/caretaker-permissions";
import { getAppBaseUrl } from "@/server/constants/routes";
import { AppError } from "@/server/errors/app-error";
import {
  getActiveCaretakerAssignments,
  listCaretakerAssignmentsForLandlord,
  revokeCaretakerAssignments,
  upsertCaretakerAssignment,
  type LandlordCaretakerAssignmentRow,
} from "@/server/repositories/caretaker-assignments.repository";
import {
  createCaretakerInvite,
  getCaretakerInviteByTokenHash,
  listPendingCaretakerInvitesForLandlord,
  markCaretakerInviteAccepted,
  type CaretakerInviteRow,
} from "@/server/repositories/caretaker-invites.repository";
import { getProfileById, upsertProfile } from "@/server/repositories/profiles.repository";
import { getPropertiesForLandlord } from "@/server/repositories/properties.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { sha256Hex } from "@/server/utils/crypto";
import { normalisePhoneNumber } from "@/server/utils/phone";
import {
  generateSecureToken,
  getExpiryDateFromNow,
} from "@/server/utils/tokens";
import type {
  AcceptCaretakerInviteInput,
  AcceptCaretakerInviteSignupInput,
  CreateCaretakerInviteInput,
  RevokeCaretakerAccessInput,
} from "@/server/validators/caretaker.schema";
import {
  getSessionUser,
  requireLandlord,
} from "./auth.service";

export type LandlordCaretakerSummary = {
  caretakerProfileId: string;
  caretakerName: string;
  caretakerPhone: string | null;
  isActive: boolean;
  assignments: Array<{
    id: string;
    propertyId: string;
    propertyName: string;
    revokedAt: string | null;
    isActive: boolean;
  }>;
};

export type ResolvedCaretakerInvite = {
  invite: CaretakerInviteRow;
  landlordName: string;
  propertyNames: string[];
};

function buildCaretakerInviteMessage(params: {
  caretakerName: string;
  landlordName: string;
  inviteUrl: string;
}) {
  return [
    `Good day ${params.caretakerName}.`,
    `${params.landlordName} invited you to help manage rent follow-up for assigned properties on BOPA.`,
    `Accept your caretaker invite here: ${params.inviteUrl}`,
  ].join(" ");
}

function assertInviteIsUsable(invite: CaretakerInviteRow) {
  if (invite.revoked_at) {
    throw new AppError(
      "CARETAKER_INVITE_REVOKED",
      "This caretaker invite is no longer active.",
      410,
    );
  }

  if (invite.accepted_at) {
    throw new AppError(
      "CARETAKER_INVITE_ALREADY_ACCEPTED",
      "This caretaker invite has already been accepted.",
      400,
    );
  }

  const expiresAt = new Date(invite.expires_at);

  if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
    throw new AppError(
      "CARETAKER_INVITE_EXPIRED",
      "This caretaker invite has expired. Ask the landlord for a new invite.",
      410,
    );
  }
}

async function assertLandlordOwnsProperties(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  landlordId: string,
  propertyIds: string[],
) {
  const properties = await getPropertiesForLandlord(supabase, landlordId);
  const ownedIds = new Set(properties.map((property) => property.id));
  const invalidIds = propertyIds.filter((propertyId) => !ownedIds.has(propertyId));

  if (invalidIds.length > 0) {
    throw new AppError(
      "CARETAKER_PROPERTY_FORBIDDEN",
      "One or more selected properties are not available for this landlord.",
      403,
    );
  }
}

async function getPropertyNamesForInvite(
  supabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  landlordId: string,
  propertyIds: string[],
) {
  const properties = await getPropertiesForLandlord(supabase, landlordId);

  return propertyIds
    .map(
      (propertyId) =>
        properties.find((property) => property.id === propertyId)?.property_name,
    )
    .filter((name): name is string => Boolean(name));
}

function groupLandlordCaretakerAssignments(
  rows: LandlordCaretakerAssignmentRow[],
): LandlordCaretakerSummary[] {
  const grouped = new Map<string, LandlordCaretakerSummary>();

  for (const row of rows) {
    const existing = grouped.get(row.caretaker_profile_id);

    const assignment = {
      id: row.id,
      propertyId: row.property_id,
      propertyName: row.properties?.property_name ?? "Property",
      revokedAt: row.revoked_at,
      isActive: row.revoked_at === null,
    };

    if (!existing) {
      grouped.set(row.caretaker_profile_id, {
        caretakerProfileId: row.caretaker_profile_id,
        caretakerName: row.caretaker?.full_name ?? "Caretaker",
        caretakerPhone: row.caretaker?.phone_number ?? null,
        isActive: assignment.isActive,
        assignments: [assignment],
      });
      continue;
    }

    existing.assignments.push(assignment);
    existing.isActive = existing.isActive || assignment.isActive;
  }

  return [...grouped.values()].sort((a, b) =>
    a.caretakerName.localeCompare(b.caretakerName),
  );
}

export async function getLandlordCaretakersPageData() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  const [assignments, pendingInvites, properties] = await Promise.all([
    listCaretakerAssignmentsForLandlord(supabase, landlord.id),
    listPendingCaretakerInvitesForLandlord(supabase, landlord.id),
    getPropertiesForLandlord(supabase, landlord.id),
  ]);

  return {
    landlordName: landlord.fullName,
    caretakers: groupLandlordCaretakerAssignments(assignments),
    pendingInvites,
    properties: properties.map((property) => ({
      id: property.id,
      name: property.property_name,
    })),
  };
}

export async function createCaretakerInviteForCurrentLandlord(
  input: CreateCaretakerInviteInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  await assertLandlordOwnsProperties(
    supabase,
    landlord.id,
    input.propertyIds,
  );

  const normalizedPhone = normalisePhoneNumber(input.caretakerPhone);
  const rawToken = generateSecureToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = getExpiryDateFromNow(CARETAKER_INVITE_EXPIRY_HOURS);

  await createCaretakerInvite(supabase, {
    landlordId: landlord.id,
    caretakerName: input.caretakerName,
    caretakerPhone: normalizedPhone.e164,
    propertyIds: input.propertyIds,
    permissions: DEFAULT_CARETAKER_PERMISSIONS,
    tokenHash,
    note: input.note ?? null,
    expiresAt: expiresAt.toISOString(),
  });

  const inviteUrl = `${getAppBaseUrl()}/caretaker/invite/${rawToken}`;

  return {
    inviteUrl,
    whatsappMessage: buildCaretakerInviteMessage({
      caretakerName: input.caretakerName,
      landlordName: landlord.fullName,
      inviteUrl,
    }),
    caretakerPhone: normalizedPhone.national,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function resolveCaretakerInviteToken(
  token: string,
): Promise<ResolvedCaretakerInvite> {
  const supabase = createSupabaseAdminClient();
  const tokenHash = sha256Hex(token);
  const invite = await getCaretakerInviteByTokenHash(supabase, tokenHash);

  if (!invite) {
    throw new AppError(
      "CARETAKER_INVITE_INVALID",
      "This caretaker invite link is invalid.",
      404,
    );
  }

  assertInviteIsUsable(invite);

  const landlord = await getProfileById(supabase, invite.landlord_id);
  const propertyNames = await getPropertyNamesForInvite(
    supabase,
    invite.landlord_id,
    invite.property_ids,
  );

  return {
    invite,
    landlordName: landlord?.full_name ?? "Landlord",
    propertyNames,
  };
}

async function createAssignmentsFromInvite(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseAdminClient>>;
  invite: CaretakerInviteRow;
  caretakerProfileId: string;
}) {
  await assertLandlordOwnsProperties(
    params.supabase,
    params.invite.landlord_id,
    params.invite.property_ids,
  );

  for (const propertyId of params.invite.property_ids) {
    await upsertCaretakerAssignment(params.supabase, {
      landlordId: params.invite.landlord_id,
      caretakerProfileId: params.caretakerProfileId,
      propertyId,
      permissions: params.invite.permissions,
    });
  }
}

function assertProfileCanAcceptCaretakerInvite(role: string) {
  if (role === "caretaker") {
    return;
  }

  throw new AppError(
    "CARETAKER_INVITE_ROLE_CONFLICT",
    "This invite must be accepted with a caretaker account.",
    403,
  );
}

async function finalizeCaretakerInviteAcceptance(params: {
  invite: CaretakerInviteRow;
  caretakerProfileId: string;
}) {
  const adminSupabase = createSupabaseAdminClient();

  await createAssignmentsFromInvite({
    supabase: adminSupabase,
    invite: params.invite,
    caretakerProfileId: params.caretakerProfileId,
  });

  const acceptedInvite = await markCaretakerInviteAccepted(adminSupabase, {
    inviteId: params.invite.id,
    acceptedByProfileId: params.caretakerProfileId,
  });

  if (!acceptedInvite) {
    throw new AppError(
      "CARETAKER_INVITE_ALREADY_ACCEPTED",
      "This caretaker invite has already been accepted.",
      400,
    );
  }
}

export async function acceptCaretakerInviteForCurrentUser(
  input: AcceptCaretakerInviteInput,
) {
  const user = await getSessionUser();

  if (!user) {
    throw new AppError(
      "AUTH_REQUIRED",
      "Sign in or create a caretaker account to accept this invite.",
      401,
    );
  }

  assertProfileCanAcceptCaretakerInvite(user.role);

  const resolved = await resolveCaretakerInviteToken(input.token);
  const invitePhone = normalisePhoneNumber(resolved.invite.caretaker_phone);

  if (user.phoneNumber) {
    const userPhone = normalisePhoneNumber(user.phoneNumber);

    if (userPhone.e164 !== invitePhone.e164) {
      throw new AppError(
        "CARETAKER_INVITE_PHONE_MISMATCH",
        "This invite was sent to a different phone number.",
        403,
      );
    }
  }

  await finalizeCaretakerInviteAcceptance({
    invite: resolved.invite,
    caretakerProfileId: user.id,
  });

  return {
    redirectTo: "/caretaker/overview",
  };
}

export async function acceptCaretakerInviteWithSignup(
  input: AcceptCaretakerInviteSignupInput,
) {
  const resolved = await resolveCaretakerInviteToken(input.token);
  const invitePhone = normalisePhoneNumber(resolved.invite.caretaker_phone);
  const adminSupabase = createSupabaseAdminClient();

  const { data: createdUser, error: createUserError } =
    await adminSupabase.auth.admin.createUser({
      phone: invitePhone.e164,
      password: input.password,
      phone_confirm: true,
      user_metadata: {
        full_name: resolved.invite.caretaker_name,
        role: "caretaker",
      },
    });

  if (createUserError || !createdUser.user) {
    throw new AppError(
      "CARETAKER_AUTH_CREATE_FAILED",
      createUserError?.message ||
        "Caretaker account could not be created. If you already have an account, sign in and accept the invite.",
      400,
    );
  }

  await upsertProfile(adminSupabase, {
    id: createdUser.user.id,
    role: "caretaker",
    fullName: resolved.invite.caretaker_name,
    phoneNumber: invitePhone.e164,
    email: null,
  });

  await finalizeCaretakerInviteAcceptance({
    invite: resolved.invite,
    caretakerProfileId: createdUser.user.id,
  });

  const userSupabase = await createSupabaseServerClient();
  const { error: signInError } = await userSupabase.auth.signInWithPassword({
    phone: invitePhone.e164,
    password: input.password,
  });

  if (signInError) {
    throw new AppError(
      "CARETAKER_SIGN_IN_FAILED",
      "Account created but sign-in failed. Please sign in and open the invite link again.",
      400,
    );
  }

  return {
    redirectTo: "/caretaker/overview",
  };
}

export async function revokeCaretakerAccessForCurrentLandlord(
  input: RevokeCaretakerAccessInput,
) {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  await revokeCaretakerAssignments(supabase, {
    landlordId: landlord.id,
    caretakerProfileId: input.caretakerProfileId,
    propertyId: input.propertyId,
  });
}

export async function getCaretakerInviteAcceptanceContext(token: string) {
  const resolved = await resolveCaretakerInviteToken(token);
  const sessionUser = await getSessionUser();

  return {
    ...resolved,
    sessionUser,
    canAcceptNow: sessionUser?.role === "caretaker",
    roleConflict:
      sessionUser !== null && sessionUser.role !== "caretaker"
        ? "This invite must be accepted with a caretaker account."
        : null,
  };
}

export async function verifyCaretakerHasActiveAssignments(
  caretakerProfileId: string,
) {
  const supabase = await createSupabaseServerClient();
  const assignments = await getActiveCaretakerAssignments(
    supabase,
    caretakerProfileId,
  );

  return assignments.length > 0;
}
