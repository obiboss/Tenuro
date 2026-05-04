"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { errorResult } from "@/server/errors/result";
import {
  acceptTenancyAgreementFromTenant,
  finalizeTenancyAgreementForCurrentLandlord,
  generateTenancyAgreementForCurrentLandlord,
  generateTenancyAgreementPdfForCurrentLandlord,
  refreshTenancyAgreementAcceptanceLinkForCurrentLandlord,
  saveTenancyAgreementDraftForCurrentLandlord,
} from "@/server/services/tenancy-agreements.service";
import {
  acceptTenancyAgreementSchema,
  finalizeTenancyAgreementSchema,
  generateTenancyAgreementPdfSchema,
  generateTenancyAgreementSchema,
  refreshTenancyAgreementAcceptanceLinkSchema,
  saveTenancyAgreementDraftSchema,
} from "@/server/validators/tenancy-agreement.schema";

export type TenancyAgreementActionState = {
  ok: boolean;
  message: string;
  agreementId?: string;
  acceptanceUrl?: string;
  whatsappMessage?: string;
  tenantWhatsappNumber?: string;
  pdfDownloadUrl?: string | null;
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

    return {
      ok: true,
      message: "Agreement draft saved.",
      agreementId: agreement.id,
    };
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

    const result = await finalizeTenancyAgreementForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.agreement.tenant_id}`);

    return {
      ok: true,
      message: "Agreement finalized. Send the acceptance link to the tenant.",
      agreementId: result.agreement.id,
      acceptanceUrl: result.acceptanceUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
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

export async function refreshTenancyAgreementAcceptanceLinkAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = refreshTenancyAgreementAcceptanceLinkSchema.parse({
      agreementId: formData.get("agreementId"),
    });

    const result =
      await refreshTenancyAgreementAcceptanceLinkForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.agreement.tenant_id}`);

    return {
      ok: true,
      message: "Agreement acceptance link prepared.",
      agreementId: result.agreement.id,
      acceptanceUrl: result.acceptanceUrl,
      whatsappMessage: result.whatsappMessage,
      tenantWhatsappNumber: result.tenantWhatsappNumber,
    };
  } catch (error) {
    console.error("refreshTenancyAgreementAcceptanceLinkAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function acceptTenancyAgreementAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = acceptTenancyAgreementSchema.parse({
      token: formData.get("token"),
    });

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
    const userAgent = requestHeaders.get("user-agent");

    const result = await acceptTenancyAgreementFromTenant({
      token: parsed.token,
      ipAddress,
      userAgent,
    });

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.agreement.tenant_id}`);

    return {
      ok: true,
      message: "Agreement accepted successfully.",
      agreementId: result.agreement.id,
      pdfDownloadUrl: result.pdfDownloadUrl,
    };
  } catch (error) {
    console.error("acceptTenancyAgreementAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function generateTenancyAgreementPdfAction(
  _previousState: TenancyAgreementActionState,
  formData: FormData,
): Promise<TenancyAgreementActionState> {
  try {
    const parsed = generateTenancyAgreementPdfSchema.parse({
      agreementId: formData.get("agreementId"),
    });

    const result = await generateTenancyAgreementPdfForCurrentLandlord(parsed);

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${result.agreement.tenant_id}`);

    return {
      ok: true,
      message: "Agreement PDF prepared.",
      agreementId: result.agreement.id,
      pdfDownloadUrl: result.pdfDownloadUrl,
    };
  } catch (error) {
    console.error("generateTenancyAgreementPdfAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
