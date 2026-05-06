import "server-only";

import { headers } from "next/headers";
import { AUDIT_ACTOR_ROLES } from "@/server/constants/audit-events";
import {
  insertAuditLog,
  listAuditLogsForLandlord,
  type AuditLogInsert,
} from "@/server/repositories/audit-log.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireLandlord } from "@/server/services/auth.service";

type WriteAuditLogInput = Omit<AuditLogInsert, "ipAddress" | "userAgent"> & {
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function getRequestAuditContext() {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;

    return {
      ipAddress,
      userAgent: requestHeaders.get("user-agent"),
    };
  } catch {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  const supabase = createSupabaseAdminClient();
  const requestContext = await getRequestAuditContext();

  await insertAuditLog(supabase, {
    ...input,
    ipAddress: input.ipAddress ?? requestContext.ipAddress,
    userAgent: input.userAgent ?? requestContext.userAgent,
  });
}

export async function writeSystemAuditLog(
  input: Omit<WriteAuditLogInput, "actorRole" | "actorProfileId">,
) {
  await writeAuditLog({
    ...input,
    actorRole: AUDIT_ACTOR_ROLES.system,
    actorProfileId: null,
  });
}

export async function getCurrentLandlordAuditLogs() {
  const landlord = await requireLandlord();
  const supabase = await createSupabaseServerClient();

  return listAuditLogsForLandlord(supabase, landlord.id);
}
