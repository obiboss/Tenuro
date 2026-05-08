"use server";

import { revalidatePath } from "next/cache";
import {
  type AgentBankSetupActionState,
  type AgentProfileActionState,
} from "@/actions/agent-profile.state";
import { errorResult } from "@/server/errors/result";
import {
  setupAgentBankAccount,
  setupAgentProfile,
} from "@/server/services/agent-profile.service";
import {
  setupAgentBankAccountSchema,
  setupAgentProfileSchema,
} from "@/server/validators/agent.schema";

function toAgentActionError(
  error: unknown,
): AgentProfileActionState | AgentBankSetupActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function setupAgentProfileAction(
  _previousState: AgentProfileActionState,
  formData: FormData,
): Promise<AgentProfileActionState> {
  try {
    const parsed = setupAgentProfileSchema.parse({
      businessName: formData.get("businessName"),
      businessPhone: formData.get("businessPhone"),
      serviceState: formData.get("serviceState"),
      serviceLga: formData.get("serviceLga"),
      businessAddress: formData.get("businessAddress"),
    });

    await setupAgentProfile(parsed);

    revalidatePath("/agent/overview");

    return {
      ok: true,
      message: "Agent profile saved successfully.",
    };
  } catch (error) {
    return toAgentActionError(error);
  }
}

export async function setupAgentBankAccountAction(
  _previousState: AgentBankSetupActionState,
  formData: FormData,
): Promise<AgentBankSetupActionState> {
  try {
    const parsed = setupAgentBankAccountSchema.parse({
      bankCode: formData.get("bankCode"),
      bankName: formData.get("bankName"),
      accountNumber: formData.get("accountNumber"),
      businessName: formData.get("businessName"),
    });

    await setupAgentBankAccount(parsed);

    revalidatePath("/agent/overview");

    return {
      ok: true,
      message: "Agent payout account connected successfully.",
    };
  } catch (error) {
    return toAgentActionError(error);
  }
}
