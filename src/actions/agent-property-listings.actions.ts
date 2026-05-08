"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type AgentLandlordVerificationActionState,
  type AgentPropertyListingActionState,
  type LandlordClaimSignupActionState,
  type PublicLandlordVerificationActionState,
} from "@/actions/agent-property-listings.state";
import { errorResult } from "@/server/errors/result";
import {
  approveAgentPropertyListingByLandlordReview,
  completeLandlordClaimSignup,
  createLandlordVerificationLinkForCurrentAgent,
  createPropertyListingForCurrentAgent,
} from "@/server/services/agent-property-listings.service";
import { passwordSchema } from "@/server/validators/auth.schema";
import { agentPropertyListingSchema } from "@/server/validators/agent-property-listing.schema";
import { z } from "zod";

const listingIdSchema = z.string().uuid();
const verificationTokenSchema = z.string().trim().min(20);
const claimTokenSchema = z.string().trim().min(20);

function nullableMoney(value: FormDataEntryValue | null) {
  if (value === null || value === "") {
    return null;
  }

  return value;
}

function parseAgentPropertyListingForm(formData: FormData) {
  return agentPropertyListingSchema.parse({
    landlordFullName: formData.get("landlordFullName"),
    landlordPhoneNumber: formData.get("landlordPhoneNumber"),
    landlordEmail: formData.get("landlordEmail"),
    propertyName: formData.get("propertyName"),
    address: formData.get("address"),
    state: formData.get("state"),
    lga: formData.get("lga"),
    propertyType: formData.get("propertyType"),
    countryCode: "NG",
    currencyCode: "NGN",
    buildingName: formData.get("buildingName"),
    unitIdentifier: formData.get("unitIdentifier"),
    unitType: formData.get("unitType"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    annualRent: nullableMoney(formData.get("annualRent")),
    monthlyRent: nullableMoney(formData.get("monthlyRent")),
    notes: formData.get("notes"),
  });
}

export async function createAgentPropertyListingAction(
  _previousState: AgentPropertyListingActionState,
  formData: FormData,
): Promise<AgentPropertyListingActionState> {
  try {
    const parsed = parseAgentPropertyListingForm(formData);

    await createPropertyListingForCurrentAgent(parsed);

    revalidatePath("/agent/listings");
    revalidatePath("/agent/overview");

    return {
      ok: true,
      message: "Property listing submitted successfully.",
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

export async function createLandlordVerificationLinkAction(
  _previousState: AgentLandlordVerificationActionState,
  formData: FormData,
): Promise<AgentLandlordVerificationActionState> {
  try {
    const listingId = listingIdSchema.parse(formData.get("listingId"));

    const result =
      await createLandlordVerificationLinkForCurrentAgent(listingId);

    revalidatePath("/agent/listings");
    revalidatePath("/agent/overview");

    return {
      ok: true,
      message: "Opening WhatsApp with the landlord verification message.",
      verificationUrl: result.verificationUrl,
      whatsappUrl: result.whatsappUrl,
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

export async function verifyLandlordPropertyListingAction(
  _previousState: PublicLandlordVerificationActionState,
  formData: FormData,
): Promise<PublicLandlordVerificationActionState> {
  try {
    const token = verificationTokenSchema.parse(formData.get("token"));
    const parsed = parseAgentPropertyListingForm(formData);

    const result = await approveAgentPropertyListingByLandlordReview({
      token,
      input: parsed,
    });

    revalidatePath("/agent/listings");

    if (result.existingLandlordFound) {
      return {
        ok: true,
        message:
          "Property approved successfully. Sign in to continue managing your property.",
        nextAction: "sign_in",
      };
    }

    return {
      ok: true,
      message:
        "Property approved successfully. You can now add more units for this property.",
      nextAction: "add_units",
      claimUrl: result.claimUrl ?? undefined,
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      nextAction: null,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function completeLandlordClaimSignupAction(
  _previousState: LandlordClaimSignupActionState,
  formData: FormData,
): Promise<LandlordClaimSignupActionState> {
  let redirectTo: string | null = null;

  try {
    const token = claimTokenSchema.parse(formData.get("token"));
    const password = passwordSchema.parse(formData.get("password"));

    const result = await completeLandlordClaimSignup({
      token,
      password,
    });

    revalidatePath("/overview");
    revalidatePath("/properties");
    revalidatePath(`/properties/${result.propertyId}`);

    redirectTo = `/properties/${result.propertyId}`;
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return {
    ok: true,
    message: "Landlord account created successfully.",
  };
}
