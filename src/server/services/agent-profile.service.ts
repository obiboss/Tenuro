import "server-only";

import {
  createAgentPaystackAccount,
  deactivateAgentPaystackAccounts,
  getActiveAgentPaystackAccount,
} from "@/server/repositories/agent-paystack.repository";
import {
  getAgentProfileByAgentId,
  upsertAgentProfile,
} from "@/server/repositories/agent-profile.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { normalisePhoneNumber } from "@/server/utils/phone";
import type {
  SetupAgentBankAccountInput,
  SetupAgentProfileInput,
} from "@/server/validators/agent.schema";
import { requireAgent } from "./auth.service";
import {
  createAgentSubaccount,
  getSupportedBanks,
  verifyBankAccount,
} from "./paystack.service";
import { AppError } from "@/server/errors/app-error";

async function writeAgentAuditLog(params: {
  agentId: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: null,
    tenant_id: null,
    tenancy_id: null,
    unit_id: null,
    property_id: null,
    actor_profile_id: params.agentId,
    actor_role: "agent",
    event_type: params.eventType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    description: params.description,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

export async function getCurrentAgentWorkspace() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const [profile, paystackAccount] = await Promise.all([
    getAgentProfileByAgentId(supabase, agent.id),
    getActiveAgentPaystackAccount(supabase, agent.id),
  ]);

  return {
    agent,
    profile,
    paystackAccount,
  };
}

export async function getPaystackBanksForAgentSetup() {
  await requireAgent();

  const banks = await getSupportedBanks();

  return banks
    .filter((bank) => bank.active && bank.country === "Nigeria")
    .map((bank) => ({
      label: bank.name,
      value: bank.code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function setupAgentProfile(input: SetupAgentProfileInput) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();
  const normalizedPhone = normalisePhoneNumber(input.businessPhone);

  const profile = await upsertAgentProfile(supabase, {
    agentId: agent.id,
    businessName: input.businessName,
    businessPhone: normalizedPhone.e164,
    serviceState: input.serviceState,
    serviceLga: input.serviceLga,
    businessAddress: input.businessAddress?.trim()
      ? input.businessAddress.trim()
      : null,
  });

  await writeAgentAuditLog({
    agentId: agent.id,
    eventType: "agent_profile_updated",
    entityType: "agent_profile",
    entityId: profile.id,
    description: `Agent profile updated: ${profile.business_name}`,
    metadata: {
      business_name: profile.business_name,
      service_state: profile.service_state,
      service_lga: profile.service_lga,
    },
  });

  return profile;
}

export async function setupAgentBankAccount(input: SetupAgentBankAccountInput) {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const profile = await getAgentProfileByAgentId(supabase, agent.id);

  if (!profile) {
    throw new AppError(
      "AGENT_PROFILE_REQUIRED",
      "Complete your agent profile before connecting a payout account.",
      400,
    );
  }

  const resolvedAccount = await verifyBankAccount({
    accountNumber: input.accountNumber,
    bankCode: input.bankCode,
  });

  if (resolvedAccount.account_number !== input.accountNumber) {
    throw new AppError(
      "BANK_ACCOUNT_MISMATCH",
      "The bank account number could not be confirmed.",
      400,
    );
  }

  const subaccount = await createAgentSubaccount({
    businessName: input.businessName,
    bankCode: input.bankCode,
    accountNumber: input.accountNumber,
    agentName: agent.fullName,
    agentPhoneNumber: agent.phoneNumber,
    agentEmail: agent.email,
  });

  await deactivateAgentPaystackAccounts(supabase, agent.id);

  const paystackAccount = await createAgentPaystackAccount(supabase, {
    agentId: agent.id,
    businessName: input.businessName,
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    accountName: resolvedAccount.account_name,
    paystackSubaccountCode: subaccount.subaccount_code,
    paystackSubaccountId: subaccount.id,
    currencyCode: "NGN",
  });

  await writeAgentAuditLog({
    agentId: agent.id,
    eventType: "agent_payout_account_connected",
    entityType: "agent_paystack_account",
    entityId: paystackAccount.id,
    description: `Agent payout account connected: ${paystackAccount.bank_name}`,
    metadata: {
      bank_name: paystackAccount.bank_name,
      account_name: paystackAccount.account_name,
      account_number_last4: paystackAccount.account_number.slice(-4),
      paystack_subaccount_code: paystackAccount.paystack_subaccount_code,
    },
  });

  return paystackAccount;
}
