"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import { getManagerOrganizationForCurrentUser } from "@/server/repositories/manager.repository";
import { requireManager } from "@/server/services/auth.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : undefined,
    z.string().max(maximum).optional(),
  );

const recordPropertyRemittanceSchema = z
  .object({
    landlordClientId: z.string().uuid(),
    propertyId: z.string().uuid(),
    amountRemitted: z.coerce.number().finite().positive(),
    remittanceDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid remittance date."),
    periodStart: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value.trim()
          : undefined,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
    periodEnd: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value.trim()
          : undefined,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
    paymentMethod: z.enum(["bank_transfer", "cash", "cheque", "other"]),
    paymentReference: optionalText(160),
    proofUrl: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0
          ? value.trim()
          : undefined,
      z.string().url().optional(),
    ),
    notes: optionalText(600),
  })
  .refine(
    (value) =>
      !value.periodStart ||
      !value.periodEnd ||
      value.periodEnd >= value.periodStart,
    {
      path: ["periodEnd"],
      message: "Period end date cannot be before period start date.",
    },
  );

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function recordManagerPropertyRemittanceAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("remittance.manage");

    const input = recordPropertyRemittanceSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      amountRemitted: formData.get("amountRemitted"),
      remittanceDate: formData.get("remittanceDate"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference"),
      proofUrl: formData.get("proofUrl"),
      notes: formData.get("notes"),
    });

    const manager = await requireManager();
    const supabase = await createSupabaseServerClient();
    const organization = await getManagerOrganizationForCurrentUser(
      supabase,
      manager.id,
    );

    if (!organization) {
      return {
        ok: false,
        message: "Your manager workspace could not be found.",
      };
    }

    const [{ data: landlord, error: landlordError }, { data: property, error: propertyError }] =
      await Promise.all([
        supabase
          .from("manager_landlord_clients")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("id", input.landlordClientId)
          .maybeSingle<{ id: string }>(),
        supabase
          .from("manager_properties")
          .select("id, landlord_client_id")
          .eq("organization_id", organization.id)
          .eq("id", input.propertyId)
          .maybeSingle<{ id: string; landlord_client_id: string }>(),
      ]);

    if (landlordError) {
      throw landlordError;
    }

    if (propertyError) {
      throw propertyError;
    }

    if (!landlord || !property || property.landlord_client_id !== landlord.id) {
      return {
        ok: false,
        message: "Select a property that belongs to this landlord.",
      };
    }

    const { error } = await supabase.from("manager_landlord_remittances").insert({
      organization_id: organization.id,
      landlord_client_id: input.landlordClientId,
      payout_profile_id: null,
      amount_remitted: Math.round(input.amountRemitted * 100) / 100,
      currency_code: "NGN",
      remittance_date: input.remittanceDate,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      payment_method: input.paymentMethod,
      payment_reference: input.paymentReference ?? null,
      proof_url: input.proofUrl ?? null,
      status: "recorded",
      recorded_by_profile_id: manager.id,
      notes: input.notes ?? null,
      metadata: {
        source: "bopa_manager_property_remittance",
        property_id: input.propertyId,
      },
    });

    if (error) {
      throw error;
    }

    revalidatePath("/manager/overview");
    revalidatePath("/manager/remittances");
    revalidatePath("/manager/reports");
    revalidatePath("/manager/landlords");

    return {
      ok: true,
      message: "Remittance recorded for the selected property.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
