"use server";

import { revalidatePath } from "next/cache";
import { getDeveloperStaffTitleLabel } from "@/constants/developer-staff-permissions";
import { errorResult } from "@/server/errors/result";
import {
  acceptDeveloperStaffRoleLink,
  createDeveloperStaffRoleLinkForTitle,
} from "@/server/services/developer-staff.service";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import {
  acceptDeveloperStaffRoleLinkSchema,
  createDeveloperStaffRoleLinkSchema,
} from "@/server/validators/developer-staff.schema";
import type { DeveloperStaffRoleLinkActionState } from "@/actions/developer-staff.state";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createDeveloperStaffRoleLinkAction(
  _previousState: DeveloperStaffRoleLinkActionState,
  formData: FormData,
): Promise<DeveloperStaffRoleLinkActionState> {
  try {
    const developer = await requireDeveloper();

    const parsed = createDeveloperStaffRoleLinkSchema.parse({
      staffTitle: formData.get("staffTitle"),
    });

    const supabase = createSupabaseAdminClient();

    const result = await createDeveloperStaffRoleLinkForTitle({
      supabase,
      ownerProfileId: developer.id,
      staffTitle: parsed.staffTitle,
    });

    revalidatePath("/developer/staff");

    return {
      ok: true,
      message: `${getDeveloperStaffTitleLabel(
        parsed.staffTitle,
      )} onboarding link generated.`,
      onboardingUrl: result.onboardingUrl,
      staffTitleLabel: getDeveloperStaffTitleLabel(parsed.staffTitle),
    };
  } catch (error) {
    return {
      ...toActionError(error),
      onboardingUrl: null,
      staffTitleLabel: null,
    };
  }
}

export async function acceptDeveloperStaffRoleLinkAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  try {
    const parsed = acceptDeveloperStaffRoleLinkSchema.parse({
      token: formData.get("token"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    const supabase = createSupabaseAdminClient();

    await acceptDeveloperStaffRoleLink({
      supabase,
      input: parsed,
    });

    return {
      ok: true,
      message: "Staff account created. You can now sign in.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
