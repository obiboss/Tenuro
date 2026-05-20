import "server-only";

import { notFound } from "next/navigation";
import { AppError, isAppError } from "@/server/errors/app-error";
import { requireUser } from "@/server/services/auth.service";
import type { ServerSessionUser } from "@/server/types/auth.types";

export type PlatformAdminSessionUser = ServerSessionUser & {
  role: "platform_admin";
};

export function assertPlatformAdmin(
  user: ServerSessionUser,
): asserts user is PlatformAdminSessionUser {
  if (user.role !== "platform_admin") {
    throw new AppError(
      "PLATFORM_ADMIN_REQUIRED",
      "You do not have permission to access platform admin tools.",
      403,
    );
  }
}

export async function requirePlatformAdmin(): Promise<PlatformAdminSessionUser> {
  const user = await requireUser();

  assertPlatformAdmin(user);

  return user;
}

export async function requirePlatformAdminPage() {
  try {
    return await requirePlatformAdmin();
  } catch (error) {
    if (isAppError(error) && error.code === "PLATFORM_ADMIN_REQUIRED") {
      notFound();
    }

    throw error;
  }
}
