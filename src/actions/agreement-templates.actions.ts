"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import { saveAgreementTemplateForCurrentLandlord } from "@/server/services/agreement-templates.service";
import { saveAgreementTemplateSchema } from "@/server/validators/agreement-template.schema";
import type { AgreementTemplateActionState } from "./agreement-templates.state";

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  return value.trim();
}

export async function saveAgreementTemplateAction(
  _previousState: AgreementTemplateActionState,
  formData: FormData,
): Promise<AgreementTemplateActionState> {
  try {
    const parsed = saveAgreementTemplateSchema.parse({
      propertyId: readOptionalString(formData, "propertyId"),
      name: formData.get("name"),
      templateBody: formData.get("templateBody"),
    });

    await saveAgreementTemplateForCurrentLandlord(parsed);

    revalidatePath("/settings");
    revalidatePath("/properties");

    if (parsed.propertyId) {
      revalidatePath(`/properties/${parsed.propertyId}`);
    }

    return successResult("Agreement template saved.");
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
