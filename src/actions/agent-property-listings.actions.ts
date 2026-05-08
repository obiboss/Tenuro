"use server";

import { revalidatePath } from "next/cache";
import { type AgentPropertyListingActionState } from "@/actions/agent-property-listings.state";
import { errorResult } from "@/server/errors/result";
import { createPropertyListingForCurrentAgent } from "@/server/services/agent-property-listings.service";
import { agentPropertyListingSchema } from "@/server/validators/agent-property-listing.schema";

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
