"use server";

import { revalidatePath } from "next/cache";
import type { TenantListingApplicationActionState } from "@/actions/tenant-listing-applications.state";
import { errorResult } from "@/server/errors/result";
import { createOrReuseTenantListingApplication } from "@/server/services/tenant-applications.service";
import { tenantKycApplicationSchema } from "@/server/validators/tenant-application.schema";

function getOptionalFormText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function submitTenantListingApplicationAction(
  _previousState: TenantListingApplicationActionState,
  formData: FormData,
): Promise<TenantListingApplicationActionState> {
  try {
    const parsed = tenantKycApplicationSchema.parse({
      agentPropertyListingId: formData.get("agentPropertyListingId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: getOptionalFormText(formData, "email"),
      dateOfBirth: getOptionalFormText(formData, "dateOfBirth"),
      homeAddress: formData.get("homeAddress"),
      occupation: formData.get("occupation"),
      employer: getOptionalFormText(formData, "employer"),
      idType: formData.get("idType"),
      idNumber: formData.get("idNumber"),
      idDocumentPath: getOptionalFormText(formData, "idDocumentPath"),
      passportPhotoPath: getOptionalFormText(formData, "passportPhotoPath"),
      canProvideGuarantor: formData.get("canProvideGuarantor"),
    });

    const result = await createOrReuseTenantListingApplication({
      agentPropertyListingId: parsed.agentPropertyListingId,
      kyc: {
        fullName: parsed.fullName,
        phoneNumber: parsed.phoneNumber,
        email: parsed.email || null,
        dateOfBirth: parsed.dateOfBirth || null,
        homeAddress: parsed.homeAddress,
        occupation: parsed.occupation,
        employer: parsed.employer || null,
        idType: parsed.idType,
        idDocumentPath: parsed.idDocumentPath || null,
        passportPhotoPath: parsed.passportPhotoPath || null,
        kycAnswers: {
          id_number: parsed.idNumber,
          can_provide_guarantor: parsed.canProvideGuarantor,
        },
        kycReviewFlags:
          parsed.canProvideGuarantor === "no"
            ? [
                {
                  type: "guarantor_unavailable",
                  severity: "review",
                  message:
                    "Tenant says they cannot provide guarantor details if required.",
                },
              ]
            : [],
      },
    });

    revalidatePath(`/agent-listings`);

    if (result.requiresProcessingFee) {
      return {
        ok: true,
        message:
          "Your application profile has been saved. Please complete the processing and verification fee before landlord review.",
        requiresProcessingFee: true,
        applicationId: result.application.id,
      };
    }

    return {
      ok: true,
      message:
        "Your application has been submitted for landlord review. Your previous processing fee is still valid for this agent/landlord context.",
      requiresProcessingFee: false,
      applicationId: result.application.id,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}
