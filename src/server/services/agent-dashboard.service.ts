import "server-only";

import { getAgentPropertyListings } from "@/server/repositories/agent-property-listings.repository";
import { getAgentProfileByAgentId } from "@/server/repositories/agent-profile.repository";
import { getActiveAgentPaystackAccount } from "@/server/repositories/agent-paystack.repository";
import { createSupabaseServerClient } from "@/server/supabase/server";
import { requireAgent } from "./auth.service";

type AgentTenantCountRow = {
  id: string;
  onboarding_status: string;
};

type AgentProcessingFeeIntentSummaryRow = {
  id: string;
  status: "initialized" | "paid" | "failed" | "abandoned" | "cancelled";
  agent_share_amount: number;
  tenuro_share_amount: number;
  total_amount: number;
};

type AgentCommissionAllocationSummaryRow = {
  id: string;
  amount: number;
  allocation_status: "pending" | "paid" | "failed" | "cancelled";
};

function sumAmounts<T>(rows: T[], selector: (row: T) => number) {
  return rows.reduce((total, row) => total + selector(row), 0);
}

function countByStatus<
  T extends { status?: string; allocation_status?: string },
>(rows: T[], status: string) {
  return rows.filter(
    (row) => row.status === status || row.allocation_status === status,
  ).length;
}

export async function getCurrentAgentDashboardOverview() {
  const agent = await requireAgent();
  const supabase = await createSupabaseServerClient();

  const [
    profile,
    paystackAccount,
    listings,
    tenantRowsResult,
    feeRowsResult,
    allocationRowsResult,
  ] = await Promise.all([
    getAgentProfileByAgentId(supabase, agent.id),
    getActiveAgentPaystackAccount(supabase, agent.id),
    getAgentPropertyListings(supabase, agent.id),
    supabase
      .from("tenants")
      .select("id, onboarding_status")
      .eq("invited_by_agent_id", agent.id)
      .is("deleted_at", null)
      .returns<AgentTenantCountRow[]>(),
    supabase
      .from("agent_tenant_processing_fee_intents")
      .select(
        "id, status, agent_share_amount, tenuro_share_amount, total_amount",
      )
      .eq("agent_id", agent.id)
      .returns<AgentProcessingFeeIntentSummaryRow[]>(),
    supabase
      .from("payment_allocations")
      .select("id, amount, allocation_status")
      .eq("recipient_type", "agent")
      .eq("recipient_profile_id", agent.id)
      .returns<AgentCommissionAllocationSummaryRow[]>(),
  ]);

  if (tenantRowsResult.error) {
    throw tenantRowsResult.error;
  }

  if (feeRowsResult.error) {
    throw feeRowsResult.error;
  }

  if (allocationRowsResult.error) {
    throw allocationRowsResult.error;
  }

  const tenantRows = tenantRowsResult.data ?? [];
  const processingFeeRows = feeRowsResult.data ?? [];
  const commissionAllocationRows = allocationRowsResult.data ?? [];

  const submittedListings = listings.filter(
    (listing) => listing.status === "submitted",
  );
  const verificationSentListings = listings.filter(
    (listing) => listing.status === "landlord_verification_sent",
  );
  const landlordApprovedListings = listings.filter(
    (listing) => listing.status === "landlord_verified",
  );
  const convertedListings = listings.filter(
    (listing) => listing.status === "converted",
  );

  const approvedFinalCommissionAmount = sumAmounts(listings, (listing) =>
    listing.status === "converted" || listing.status === "landlord_verified"
      ? Number(listing.agent_commission_amount ?? 0)
      : 0,
  );

  const paidProcessingFees = processingFeeRows.filter(
    (intent) => intent.status === "paid",
  );
  const pendingProcessingFees = processingFeeRows.filter(
    (intent) => intent.status === "initialized",
  );

  const paidCommissionAllocations = commissionAllocationRows.filter(
    (allocation) => allocation.allocation_status === "paid",
  );
  const pendingCommissionAllocations = commissionAllocationRows.filter(
    (allocation) => allocation.allocation_status === "pending",
  );

  return {
    agent,
    profile,
    paystackAccount,
    listings,
    recentListings: listings.slice(0, 5),
    tenants: {
      totalInvited: tenantRows.length,
      profileComplete: tenantRows.filter(
        (tenant) => tenant.onboarding_status === "profile_complete",
      ).length,
      approved: tenantRows.filter(
        (tenant) => tenant.onboarding_status === "approved",
      ).length,
      rejected: tenantRows.filter(
        (tenant) => tenant.onboarding_status === "rejected",
      ).length,
    },
    listingStats: {
      total: listings.length,
      submitted: submittedListings.length,
      verificationSent: verificationSentListings.length,
      landlordApproved: landlordApprovedListings.length,
      converted: convertedListings.length,
    },
    processingFees: {
      totalCount: processingFeeRows.length,
      paidCount: paidProcessingFees.length,
      pendingCount: pendingProcessingFees.length,
      paidAgentShareAmount: sumAmounts(paidProcessingFees, (intent) =>
        Number(intent.agent_share_amount),
      ),
      pendingAgentShareAmount: sumAmounts(pendingProcessingFees, (intent) =>
        Number(intent.agent_share_amount),
      ),
    },
    commissions: {
      approvedFinalCommissionAmount,
      allocationCount: commissionAllocationRows.length,
      paidAllocationCount: paidCommissionAllocations.length,
      pendingAllocationCount: pendingCommissionAllocations.length,
      paidAmount: sumAmounts(paidCommissionAllocations, (allocation) =>
        Number(allocation.amount),
      ),
      pendingAmount: sumAmounts(pendingCommissionAllocations, (allocation) =>
        Number(allocation.amount),
      ),
    },
    setup: {
      hasProfile: Boolean(profile),
      hasPayout: Boolean(paystackAccount),
    },
  };
}
