"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  generateTenancyAgreementForCurrentLandlord,
  saveTenancyAgreementDraftForCurrentLandlord,
} from "@/server/services/tenancy-agreements.service";
import {
  generateTenancyAgreementSchema,
  saveTenancyAgreementDraftSchema,
} from "@/server/validators/tenancy-agreement.schema";

export type TenancyAgreementActionState = {
  ok: boolean;
  message: string;
  agreementId?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function generateTenancyAgreementAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = generateTenancyAgreementSchema.parse({
      tenancyId: formData.get("tenancyId"),
    });

    const agreement = await generateTenancyAgreementForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${agreement.tenant_id}`);

    return {
      ok: true,
      message: "Agreement draft generated.",
      agreementId: agreement.id,
    };
  } catch (error) {
    console.error("generateTenancyAgreementAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function saveTenancyAgreementDraftAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = saveTenancyAgreementDraftSchema.parse({
      agreementId: formData.get("agreementId"),
      agreementBody: formData.get("agreementBody"),
    });

    const agreement = await saveTenancyAgreementDraftForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${agreement.tenant_id}`);

    return successResult("Agreement draft saved.", {
      agreementId: agreement.id,
    });
  } catch (error) {
    console.error("saveTenancyAgreementDraftAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
