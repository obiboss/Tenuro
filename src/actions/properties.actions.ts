"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorResult, successResult } from "@/server/errors/result";
import {
  createPropertySchema,
  updatePropertySchema,
} from "@/server/validators/property.schema";
import {
  archivePropertyForCurrentLandlord,
  createPropertyForCurrentLandlord,
  updatePropertyForCurrentLandlord,
} from "@/server/services/properties.service";

export type PropertyActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createPropertyAction(
  _previousState: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  let createdPropertyId: string | null = null;

  try {
    const parsed = createPropertySchema.parse({
      propertyName: formData.get("propertyName"),
      address: formData.get("address"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      propertyType: formData.get("propertyType"),
      countryCode: "NG",
      currencyCode: "NGN",
    });

    const property = await createPropertyForCurrentLandlord(parsed);

    createdPropertyId = property.id;

    revalidatePath("/properties");
  } catch (error) {
    console.error("createPropertyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message:
        result.message === "Something went wrong. Please try again."
          ? error instanceof Error
            ? error.message
            : result.message
          : result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }

  if (createdPropertyId) {
    redirect(`/properties/${createdPropertyId}`);
  }

  return {
    ok: true,
    message: "Property saved.",
  };
}

export async function updatePropertyAction(
  propertyId: string,
  _previousState: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  try {
    const parsed = updatePropertySchema.parse({
      propertyName: formData.get("propertyName"),
      address: formData.get("address"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      propertyType: formData.get("propertyType"),
      countryCode: "NG",
      currencyCode: "NGN",
    });

    await updatePropertyForCurrentLandlord(propertyId, parsed);

    revalidatePath("/properties");
    revalidatePath(`/properties/${propertyId}`);

    return successResult("Property details saved.");
  } catch (error) {
    console.error("updatePropertyAction failed:", error);

    const result = errorResult(error);

    return {
      ok: false,
      message:
        result.message === "Something went wrong. Please try again."
          ? error instanceof Error
            ? error.message
            : result.message
          : result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function archivePropertyAction(propertyId: string) {
  await archivePropertyForCurrentLandlord(propertyId);

  revalidatePath("/properties");
  revalidatePath("/overview");
  redirect("/properties");
}
