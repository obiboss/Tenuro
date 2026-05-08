"use server";

import { revalidatePath } from "next/cache";
import {
  type AgentLandlordVerificationActionState,
  type AgentPropertyListingActionState,
  type PublicLandlordVerificationActionState,
} from "@/actions/agent-property-listings.state";
import { errorResult } from "@/server/errors/result";
import {
  createLandlordVerificationLinkForCurrentAgent,
  createPropertyListingForCurrentAgent,
  verifyAgentPropertyListingByLandlord,
} from "@/server/services/agent-property-listings.service";
import { agentPropertyListingSchema } from "@/server/validators/agent-property-listing.schema";
import { z } from "zod";

const listingIdSchema = z.string().uuid();

const verificationTokenSchema = z.string().trim().min(20);

function nullableMoney(value: FormDataEntryValue | null) {
  if (value === null || value === "") {
    return null;
  }

  return value;
}

export async function createAgentPropertyListingAction(
  _previousState: AgentPropertyListingActionState,
  formData: FormData,
): Promise<AgentPropertyListingActionState> {
  try {
    const parsed = agentPropertyListingSchema.parse({
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
      message: "Landlord verification link is ready.",
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

    await verifyAgentPropertyListingByLandlord(token);

    revalidatePath("/agent/listings");

    return {
      ok: true,
      message:
        "Property verified successfully. The agent can now continue the onboarding workflow.",
    };
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
    };
  }
}
