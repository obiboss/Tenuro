"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult } from "@/server/errors/result";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { createDeveloperEstate } from "@/server/repositories/developer-estates.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";
import type { AuthActionState } from "@/server/types/auth.types";
import { createDeveloperEstateSchema } from "@/server/validators/developer-estate.schema";

function toActionError(error: unknown): AuthActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createDeveloperEstateAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  let estateId: string | null = null;

  try {
    const developer = await requireDeveloper();
    const parsed = createDeveloperEstateSchema.parse({
      estateName: formData.get("estateName"),
      location: formData.get("location"),
      city: formData.get("city"),
      state: formData.get("state"),
      description: formData.get("description"),
      status: formData.get("status") || "planning",
    });

    const supabase = createSupabaseAdminClient();
    const account = await getDeveloperAccountByOwnerProfileId(
      supabase,
      developer.id,
    );

    if (!account || account.status !== "active") {
      return {
        ok: false,
        message: "Developer account is not active.",
      };
    }

    const estate = await createDeveloperEstate(supabase, {
      developerAccountId: account.id,
      estateName: parsed.estateName,
      location: parsed.location,
      city: nullableText(parsed.city),
      state: nullableText(parsed.state),
      description: nullableText(parsed.description),
      status: parsed.status,
    });

    estateId = estate.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/developer/estates");

  if (estateId) {
    redirect(`/developer/estates/${estateId}`);
  }

  return {
    ok: true,
    message: "Estate created successfully.",
  };
}
