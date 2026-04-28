"use server";

import { revalidatePath } from "next/cache";
import { errorResult, successResult } from "@/server/errors/result";
import {
  createUnitSchema,
  updateUnitSchema,
} from "@/server/validators/unit.schema";
import {
  archiveUnitForCurrentLandlord,
  createUnitForCurrentLandlord,
  updateUnitForCurrentLandlord,
} from "@/server/services/units.service";

export type UnitActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

function nullableMoney(value: FormDataEntryValue | null) {
  if (value === null || value === "") {
    return null;
  }

  return value;
}

export async function createUnitAction(
  propertyId: string,
  _previousState: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  try {
    const parsed = createUnitSchema.parse({
      propertyId,
      buildingName: formData.get("buildingName"),
      unitIdentifier: formData.get("unitIdentifier"),
      unitType: formData.get("unitType"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      monthlyRent: nullableMoney(formData.get("monthlyRent")),
      annualRent: nullableMoney(formData.get("annualRent")),
      currencyCode: "NGN",
    });

    await createUnitForCurrentLandlord(parsed);

    revalidatePath(`/properties/${propertyId}`);

    return successResult("Unit saved.");
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function updateUnitAction(
  unitId: string,
  propertyId: string,
  _previousState: UnitActionState,
  formData: FormData,
): Promise<UnitActionState> {
  try {
    const parsed = updateUnitSchema.parse({
      buildingName: formData.get("buildingName"),
      unitIdentifier: formData.get("unitIdentifier"),
      unitType: formData.get("unitType"),
      bedrooms: formData.get("bedrooms"),
      bathrooms: formData.get("bathrooms"),
      monthlyRent: nullableMoney(formData.get("monthlyRent")),
      annualRent: nullableMoney(formData.get("annualRent")),
      currencyCode: "NGN",
    });

    await updateUnitForCurrentLandlord(unitId, parsed);

    revalidatePath(`/properties/${propertyId}`);

    return successResult("Unit details saved.");
  } catch (error) {
    const result = errorResult(error);

    return {
      ok: false,
      message: result.message,
      fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
    };
  }
}

export async function archiveUnitAction(unitId: string, propertyId: string) {
  await archiveUnitForCurrentLandlord(unitId);
  revalidatePath(`/properties/${propertyId}`);
}
