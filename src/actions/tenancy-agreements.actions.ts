"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  acceptTenancyAgreementByToken,
  finalizeTenancyAgreementForCurrentLandlord,
  generateAgreementAcceptanceLinkForCurrentLandlord,
  generateTenancyAgreementForCurrentLandlord,
  saveTenancyAgreementDraftForCurrentLandlord,
} from "@/server/services/tenancy-agreements.service";
import {
  acceptTenancyAgreementSchema,
  finalizeTenancyAgreementSchema,
  generateAgreementAcceptanceLinkSchema,
  generateTenancyAgreementSchema,
  saveTenancyAgreementDraftSchema,
} from "@/server/validators/tenancy-agreement.schema";

export type TenancyAgreementActionState = {
  ok: boolean;
  message: string;
  agreementId?: string;
  acceptanceUrl?: string;
  expiresAt?: string;
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

export async function finalizeTenancyAgreementAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = finalizeTenancyAgreementSchema.parse({
      agreementId: formData.get("agreementId"),
    });

    const agreement = await finalizeTenancyAgreementForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${agreement.tenant_id}`);

    return {
      ok: true,
      message:
        "Agreement finalized. You can now generate the tenant acceptance link.",
      agreementId: agreement.id,
    };
  } catch (error) {
    console.error("finalizeTenancyAgreementAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function generateAgreementAcceptanceLinkAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = generateAgreementAcceptanceLinkSchema.parse({
      agreementId: formData.get("agreementId"),
    });

    const result =
      await generateAgreementAcceptanceLinkForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.agreement.tenant_id}`);

    return {
      ok: true,
      message: "Tenant agreement acceptance link prepared.",
      agreementId: result.agreement.id,
      acceptanceUrl: result.acceptanceUrl,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error("generateAgreementAcceptanceLinkAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function acceptTenantAgreementAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = acceptTenancyAgreementSchema.parse({
      token: formData.get("token"),
    });

    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = headerStore.get("user-agent");

    const agreement = await acceptTenancyAgreementByToken({
      token: parsed.token,
      ipAddress,
      userAgent,
    });

    return {
      ok: true,
      message: "Agreement accepted successfully.",
      agreementId: agreement.id,
    };
  } catch (error) {
    console.error("acceptTenantAgreementAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
