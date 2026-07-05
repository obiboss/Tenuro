"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import {
  acceptManagerStaffInvite,
  createManagerStaffInvite,
} from "@/server/services/manager-staff-access.service";
import {
  acceptManagerStaffInviteSchema,
  createManagerStaffInviteSchema,
} from "@/server/validators/manager-staff.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createManagerStaffInviteAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    const parsed = createManagerStaffInviteSchema.parse({
      staffName: formData.get("staffName"),
      staffEmail: formData.get("staffEmail"),
      staffRole: formData.get("staffRole"),
      note: formData.get("note"),
    });

    await createManagerStaffInvite(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/staff");

    return {
      ok: true,
      message: "Staff invite created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptManagerStaffInviteAction(formData: FormData) {
  const parsed = acceptManagerStaffInviteSchema.parse({
    token: formData.get("token"),
  });

  await acceptManagerStaffInvite(parsed.token);

  revalidatePath("/manager");
  redirect("/manager/overview");
}
