"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import { createManagerPaystackPaymentRequest } from "@/server/services/manager-paystack.service";
import { createManagerPaystackPaymentRequestSchema } from "@/server/validators/manager-paystack.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createManagerPaystackPaymentRequestAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    const parsed = createManagerPaystackPaymentRequestSchema.parse({
      tenantId: formData.get("tenantId"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      notes: formData.get("notes"),
    });

    await createManagerPaystackPaymentRequest(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/payments");
    revalidatePath("/manager/reports");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message:
        "Paystack rent payment link created. Open or send it from the payment link list.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
