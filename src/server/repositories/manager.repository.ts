import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MANAGER_CURRENT_TENANT_STATUSES,
  type ManagerCurrentTenantStatus,
  type ManagerCollectionMode,
  type ManagerManagementFeeType,
  type ManagerPaymentMethod,
  type ManagerPaymentReceiver,
  type ManagerPaystackChargeBearer,
  type ManagerRemittancePaymentMethod,
  type ManagerRemittanceStatus,
  type ManagerRentPaymentStatus,
  type ManagerTenantStatus,
  type ManagerUnitStatus,
} from "@/constants/manager";
import {
  getActiveManagerStaffMemberForProfile,
  type ManagerWorkspaceRole,
} from "@/server/repositories/manager-staff.repository";
import {
  MANAGER_RENT_DUE_SOON_DAYS,
  getManagerTenantCurrentEligibility,
  getManagerTenantRentStatus,
} from "@/lib/manager-rent-status";
import {
  listManagerMaintenanceRequests,
  type ManagerMaintenanceRequestRow,
} from "@/server/repositories/manager-maintenance.repository";
import {
  listManagerTenantOnboardingRequests,
  type ManagerTenantOnboardingRequestRow,
} from "@/server/repositories/manager-tenant-onboarding.repository";

export type ManagerOrganizationStatus = "active" | "suspended" | "inactive";
export type ManagerClientStatus = "active" | "inactive" | "archived";
export type ManagerPropertyStatus = "active" | "inactive" | "archived";

export type ManagerOrganizationRow = {
  id: string;
  owner_profile_id: string;
  organization_name: string;
  organization_phone: string | null;
  organization_email: string | null;
  rc_number: string | null;
  office_address: string | null;
  country_code: "NG";
  currency_code: "NGN";
  status: ManagerOrganizationStatus;
  created_at: string;
  updated_at: string;
};

export type ManagerOrganizationAccess = {
  organization: ManagerOrganizationRow;
  staffRole: ManagerWorkspaceRole;
  isOwner: boolean;
  staffMemberId: string | null;
};

export type ManagerLandlordClientRow = {
  id: string;
  organization_id: string;
  landlord_profile_id: string | null;
  landlord_name: string;
  landlord_phone: string | null;
  landlord_email: string | null;
  landlord_address: string | null;
  notes: string | null;
  status: ManagerClientStatus;
  created_at: string;
  updated_at: string;
};

export type ManagerLandlordPayoutProfileRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  payment_receiver: ManagerPaymentReceiver;
  receiver_name: string;
  receiver_phone: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  account_name: string | null;
  payout_note: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ManagerLandlordRemittanceRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  payout_profile_id: string | null;
  amount_remitted: number;
  currency_code: "NGN";
  remittance_date: string;
  period_start: string | null;
  period_end: string | null;
  payment_method: ManagerRemittancePaymentMethod;
  payment_reference: string | null;
  proof_url: string | null;
  status: ManagerRemittanceStatus;
  recorded_by_profile_id: string | null;
  confirmed_by_profile_id: string | null;
  confirmed_at: string | null;
  rejected_at: string | null;
  reversed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ManagerPropertyRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_name: string;
  property_address: string;
  city: string | null;
  state: string | null;
  lga: string | null;
  collection_mode: ManagerCollectionMode;
  management_fee_type: ManagerManagementFeeType;
  management_fee_value: number;
  paystack_charge_bearer: ManagerPaystackChargeBearer;
  payment_receiver: ManagerPaymentReceiver;
  notes: string | null;
  status: ManagerPropertyStatus;
  created_at: string;
  updated_at: string;
};

export type ManagerUnitRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_label: string;
  unit_type: string | null;
  rent_amount: number;
  status: ManagerUnitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ManagerTenantRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  occupation: string | null;
  rent_amount: number;
  current_balance: number;
  move_in_date: string | null;
  next_rent_due_date: string | null;
  move_out_date: string | null;
  status: ManagerTenantStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ManagerRentPaymentRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  collection_mode: ManagerCollectionMode;
  payment_receiver: ManagerPaymentReceiver;
  paystack_charge_bearer: ManagerPaystackChargeBearer;
  amount_paid: number;
  currency_code: "NGN";
  payment_method: ManagerPaymentMethod;
  payment_reference: string | null;
  payment_date: string;
  period_start: string | null;
  period_end: string | null;
  management_fee_type: ManagerManagementFeeType;
  management_fee_value: number;
  management_fee_amount: number;
  landlord_net_amount: number;
  status: ManagerRentPaymentStatus;
  recorded_by_profile_id: string | null;
  confirmed_by_profile_id: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  reversed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ManagerOverviewRecentPayment = {
  id: string;
  amountPaid: number;
  status: ManagerRentPaymentStatus;
  paymentDate: string;
  tenantName: string;
  propertyName: string;
  unitLabel: string;
};

export type ManagerOverviewAction = {
  label: string;
  href: string;
};

export type ManagerOverviewAttentionTone = "danger" | "warning" | "neutral";
export type ManagerOverviewAttentionCategory =
  | "rent"
  | "payment"
  | "onboarding"
  | "unit_review"
  | "tenant_review"
  | "property_setup"
  | "remittance"
  | "maintenance";

export type ManagerOverviewAttentionItem = {
  id: string;
  propertyId: string | null;
  category: ManagerOverviewAttentionCategory;
  title: string;
  subject: string;
  detail: string;
  action: ManagerOverviewAction;
  tone: ManagerOverviewAttentionTone;
  priority: number;
};

export type ManagerOverviewRentPosition = {
  totalTenants: number;
  owingTenants: number;
  dueSoonTenants: number;
  rentCollected: number;
  vacantUnits: number;
};

export type ManagerOverviewUpcomingRentItem = {
  id: string;
  tenantName: string;
  propertyName: string;
  unitLabel: string;
  amountDue: number;
  dueDate: string;
  daysFromToday: number;
  stateLabel: string;
  action: ManagerOverviewAction;
  tone: ManagerOverviewAttentionTone;
};

export type ManagerOverviewRecentActivityItem = {
  id: string;
  description: string;
  date: string;
  href: string;
};

export type ManagerOverviewPropertySummary = {
  id: string;
  propertyName: string;
  landlordName: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  unavailableUnits: number;
  needsAttentionCount: number;
  href: string;
};

export type ManagerOverview = {
  organization: ManagerOrganizationRow;
  primaryAction: ManagerOverviewAction;
  totals: {
    landlordClients: number;
    totalProperties: number;
    activeProperties: number;
    totalUnits: number;
    vacantUnits: number;
    occupiedUnits: number;
    totalTenants: number;
    activeTenants: number;
    totalRecordedPayments: number;
    totalVerifiedPayments: number;
    totalManagerCommission: number;
    totalLandlordShare: number;
  };
  rentPosition: ManagerOverviewRentPosition;
  attentionItems: ManagerOverviewAttentionItem[];
  upcomingRent: ManagerOverviewUpcomingRentItem[];
  recentActivity: ManagerOverviewRecentActivityItem[];
  propertySummaries: ManagerOverviewPropertySummary[];
  recentPayments: ManagerOverviewRecentPayment[];
};

export type ManagerLandlordRemittanceSummary = {
  landlordClientId: string;
  landlordName: string;
  amountDueToLandlord: number;
  amountRemitted: number;
  pendingBalance: number;
};

const MANAGER_ORGANIZATION_SELECT = `
  id,
  owner_profile_id,
  organization_name,
  organization_phone,
  organization_email,
  rc_number,
  office_address,
  country_code,
  currency_code,
  status,
  created_at,
  updated_at
`;

const MANAGER_LANDLORD_CLIENT_SELECT = `
  id,
  organization_id,
  landlord_profile_id,
  landlord_name,
  landlord_phone,
  landlord_email,
  landlord_address,
  notes,
  status,
  created_at,
  updated_at
`;

const MANAGER_LANDLORD_PAYOUT_PROFILE_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  payment_receiver,
  receiver_name,
  receiver_phone,
  bank_name,
  bank_code,
  account_number,
  account_name,
  payout_note,
  is_default,
  is_active,
  created_at,
  updated_at
`;

const MANAGER_LANDLORD_REMITTANCE_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  payout_profile_id,
  amount_remitted,
  currency_code,
  remittance_date,
  period_start,
  period_end,
  payment_method,
  payment_reference,
  proof_url,
  status,
  recorded_by_profile_id,
  confirmed_by_profile_id,
  confirmed_at,
  rejected_at,
  reversed_at,
  rejection_reason,
  notes,
  metadata,
  created_at,
  updated_at
`;

const MANAGER_PROPERTY_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_name,
  property_address,
  city,
  state,
  lga,
  collection_mode,
  management_fee_type,
  management_fee_value,
  paystack_charge_bearer,
  payment_receiver,
  notes,
  status,
  created_at,
  updated_at
`;

const MANAGER_UNIT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_label,
  unit_type,
  rent_amount,
  status,
  notes,
  created_at,
  updated_at
`;

const MANAGER_TENANT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  full_name,
  phone_number,
  email,
  occupation,
  rent_amount,
  current_balance,
  move_in_date,
  next_rent_due_date,
  move_out_date,
  status,
  notes,
  created_at,
  updated_at
`;

const MANAGER_RENT_PAYMENT_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  tenant_id,
  collection_mode,
  payment_receiver,
  paystack_charge_bearer,
  amount_paid,
  currency_code,
  payment_method,
  payment_reference,
  payment_date,
  period_start,
  period_end,
  management_fee_type,
  management_fee_value,
  management_fee_amount,
  landlord_net_amount,
  status,
  recorded_by_profile_id,
  confirmed_by_profile_id,
  verified_at,
  rejected_at,
  reversed_at,
  rejection_reason,
  notes,
  metadata,
  created_at,
  updated_at
`;

export async function getManagerOrganizationAccessForCurrentUser(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ManagerOrganizationAccess | null> {
  const { data: ownedOrganization, error: ownedOrganizationError } =
    await supabase
      .from("manager_organizations")
      .select(MANAGER_ORGANIZATION_SELECT)
      .eq("owner_profile_id", profileId)
      .maybeSingle<ManagerOrganizationRow>();

  if (ownedOrganizationError) {
    throw ownedOrganizationError;
  }

  if (ownedOrganization) {
    return {
      organization: ownedOrganization,
      staffRole: "owner",
      isOwner: true,
      staffMemberId: null,
    };
  }

  const staffMember = await getActiveManagerStaffMemberForProfile(
    supabase,
    profileId,
  );

  if (!staffMember) {
    return null;
  }

  const { data: staffOrganization, error: staffOrganizationError } =
    await supabase
      .from("manager_organizations")
      .select(MANAGER_ORGANIZATION_SELECT)
      .eq("id", staffMember.organization_id)
      .maybeSingle<ManagerOrganizationRow>();

  if (staffOrganizationError) {
    throw staffOrganizationError;
  }

  if (!staffOrganization) {
    return null;
  }

  return {
    organization: staffOrganization,
    staffRole: staffMember.staff_role,
    isOwner: false,
    staffMemberId: staffMember.id,
  };
}

export async function getManagerOrganizationForCurrentUser(
  supabase: SupabaseClient,
  ownerProfileId: string,
) {
  const access = await getManagerOrganizationAccessForCurrentUser(
    supabase,
    ownerProfileId,
  );

  return access?.organization ?? null;
}

export async function createManagerOrganization(
  supabase: SupabaseClient,
  params: {
    ownerProfileId: string;
    organizationName: string;
    organizationPhone: string | null;
    organizationEmail: string | null;
    rcNumber: string | null;
    officeAddress: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_organizations")
    .insert({
      owner_profile_id: params.ownerProfileId,
      organization_name: params.organizationName,
      organization_phone: params.organizationPhone,
      organization_email: params.organizationEmail,
      rc_number: params.rcNumber,
      office_address: params.officeAddress,
      country_code: "NG",
      currency_code: "NGN",
      status: "active",
    })
    .select(MANAGER_ORGANIZATION_SELECT)
    .single<ManagerOrganizationRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerLandlordClients(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_landlord_clients")
    .select(MANAGER_LANDLORD_CLIENT_SELECT)
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .returns<ManagerLandlordClientRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerLandlordClient(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordName: string;
    landlordPhone: string | null;
    landlordEmail: string | null;
    landlordAddress: string | null;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_landlord_clients")
    .insert({
      organization_id: params.organizationId,
      landlord_name: params.landlordName,
      landlord_phone: params.landlordPhone,
      landlord_email: params.landlordEmail,
      landlord_address: params.landlordAddress,
      notes: params.notes,
      status: "active",
    })
    .select(MANAGER_LANDLORD_CLIENT_SELECT)
    .single<ManagerLandlordClientRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listLandlordPayoutProfiles(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_landlord_payout_profiles")
    .select(MANAGER_LANDLORD_PAYOUT_PROFILE_SELECT)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<ManagerLandlordPayoutProfileRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertLandlordPayoutProfile(
  supabase: SupabaseClient,
  params: {
    id: string | null;
    organizationId: string;
    landlordClientId: string;
    paymentReceiver: ManagerPaymentReceiver;
    receiverName: string;
    receiverPhone: string | null;
    bankName: string | null;
    bankCode: string | null;
    accountNumber: string | null;
    accountName: string | null;
    payoutNote: string | null;
    isDefault: boolean;
  },
) {
  if (params.isDefault) {
    let query = supabase
      .from("manager_landlord_payout_profiles")
      .update({ is_default: false })
      .eq("organization_id", params.organizationId)
      .eq("landlord_client_id", params.landlordClientId)
      .eq("is_active", true);

    if (params.id) {
      query = query.neq("id", params.id);
    }

    const { error: defaultError } = await query;

    if (defaultError) {
      throw defaultError;
    }
  }

  const payload = {
    organization_id: params.organizationId,
    landlord_client_id: params.landlordClientId,
    payment_receiver: params.paymentReceiver,
    receiver_name: params.receiverName,
    receiver_phone: params.receiverPhone,
    bank_name: params.bankName,
    bank_code: params.bankCode,
    account_number: params.accountNumber,
    account_name: params.accountName,
    payout_note: params.payoutNote,
    is_default: params.isDefault,
    is_active: true,
  };

  if (params.id) {
    const { data, error } = await supabase
      .from("manager_landlord_payout_profiles")
      .update(payload)
      .eq("id", params.id)
      .eq("organization_id", params.organizationId)
      .select(MANAGER_LANDLORD_PAYOUT_PROFILE_SELECT)
      .single<ManagerLandlordPayoutProfileRow>();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("manager_landlord_payout_profiles")
    .insert(payload)
    .select(MANAGER_LANDLORD_PAYOUT_PROFILE_SELECT)
    .single<ManagerLandlordPayoutProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerProperties(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_properties")
    .select(MANAGER_PROPERTY_SELECT)
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .returns<ManagerPropertyRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerPropertyById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_properties")
    .select(MANAGER_PROPERTY_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .eq("id", params.propertyId)
    .maybeSingle<ManagerPropertyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerProperty(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyName: string;
    propertyAddress: string;
    city: string | null;
    state: string | null;
    lga: string | null;
    collectionMode: ManagerCollectionMode;
    managementFeeType: ManagerManagementFeeType;
    managementFeeValue: number;
    paystackChargeBearer: ManagerPaystackChargeBearer;
    paymentReceiver: ManagerPaymentReceiver;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_properties")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_name: params.propertyName,
      property_address: params.propertyAddress,
      city: params.city,
      state: params.state,
      lga: params.lga,
      collection_mode: params.collectionMode,
      management_fee_type: params.managementFeeType,
      management_fee_value: params.managementFeeValue,
      paystack_charge_bearer: params.paystackChargeBearer,
      payment_receiver: params.paymentReceiver,
      notes: params.notes,
      status: "active",
    })
    .select(MANAGER_PROPERTY_SELECT)
    .single<ManagerPropertyRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerUnits(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId?: string;
  },
) {
  let query = supabase
    .from("manager_units")
    .select(MANAGER_UNIT_SELECT)
    .eq("organization_id", params.organizationId);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<ManagerUnitRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerUnitById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_units")
    .select(MANAGER_UNIT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .eq("property_id", params.propertyId)
    .eq("id", params.unitId)
    .maybeSingle<ManagerUnitRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerUnit(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitLabel: string;
    unitType: string | null;
    rentAmount: number;
    status: ManagerUnitStatus;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_units")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_label: params.unitLabel,
      unit_type: params.unitType,
      rent_amount: params.rentAmount,
      status: params.status,
      notes: params.notes,
    })
    .select(MANAGER_UNIT_SELECT)
    .single<ManagerUnitRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateManagerUnitStatus(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    unitId: string;
    status: ManagerUnitStatus;
  },
) {
  const { error } = await supabase
    .from("manager_units")
    .update({ status: params.status })
    .eq("organization_id", params.organizationId)
    .eq("id", params.unitId);

  if (error) {
    throw error;
  }
}

export async function listManagerTenants(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    propertyId?: string;
    unitId?: string;
    statuses?: readonly ManagerTenantStatus[];
  },
) {
  const statuses = params.statuses ?? MANAGER_CURRENT_TENANT_STATUSES;
  let query = supabase
    .from("manager_tenants")
    .select(MANAGER_TENANT_SELECT)
    .eq("organization_id", params.organizationId)
    .in("status", [...statuses]);

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }

  if (params.unitId) {
    query = query.eq("unit_id", params.unitId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .returns<ManagerTenantRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function hasCurrentManagerTenantForUnit(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    unitId: string;
    excludeTenantId?: string;
  },
) {
  let query = supabase
    .from("manager_tenants")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("unit_id", params.unitId)
    .in("status", [...MANAGER_CURRENT_TENANT_STATUSES])
    .limit(1);

  if (params.excludeTenantId) {
    query = query.neq("id", params.excludeTenantId);
  }

  const { data, error } = await query.maybeSingle<{ id: string }>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export function isCurrentManagerTenantStatus(
  status: ManagerTenantStatus,
): status is ManagerCurrentTenantStatus {
  return MANAGER_CURRENT_TENANT_STATUSES.some(
    (currentStatus) => currentStatus === status,
  );
}

export async function getManagerTenantById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenants")
    .select(MANAGER_TENANT_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("landlord_client_id", params.landlordClientId)
    .eq("property_id", params.propertyId)
    .eq("unit_id", params.unitId)
    .eq("id", params.tenantId)
    .maybeSingle<ManagerTenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createManagerTenant(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    occupation: string | null;
    rentAmount: number;
    currentBalance: number;
    moveInDate: string | null;
    nextRentDueDate: string | null;
    status: ManagerTenantStatus;
    notes: string | null;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenants")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      occupation: params.occupation,
      rent_amount: params.rentAmount,
      current_balance: params.currentBalance,
      move_in_date: params.moveInDate,
      next_rent_due_date: params.nextRentDueDate,
      status: params.status,
      notes: params.notes,
    })
    .select(MANAGER_TENANT_SELECT)
    .single<ManagerTenantRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function recordManagerRentPayment(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    tenantId: string;
    collectionMode: ManagerCollectionMode;
    paymentReceiver: ManagerPaymentReceiver;
    paystackChargeBearer: ManagerPaystackChargeBearer;
    amountPaid: number;
    paymentMethod: ManagerPaymentMethod;
    paymentReference: string | null;
    paymentDate: string;
    periodStart: string | null;
    periodEnd: string | null;
    managementFeeType: ManagerManagementFeeType;
    managementFeeValue: number;
    managementFeeAmount: number;
    landlordNetAmount: number;
    status: ManagerRentPaymentStatus;
    recordedByProfileId: string;
    notes: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_rent_payments")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      property_id: params.propertyId,
      unit_id: params.unitId,
      tenant_id: params.tenantId,
      collection_mode: params.collectionMode,
      payment_receiver: params.paymentReceiver,
      paystack_charge_bearer: params.paystackChargeBearer,
      amount_paid: params.amountPaid,
      currency_code: "NGN",
      payment_method: params.paymentMethod,
      payment_reference: params.paymentReference,
      payment_date: params.paymentDate,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      management_fee_type: params.managementFeeType,
      management_fee_value: params.managementFeeValue,
      management_fee_amount: params.managementFeeAmount,
      landlord_net_amount: params.landlordNetAmount,
      status: params.status,
      recorded_by_profile_id: params.recordedByProfileId,
      notes: params.notes,
      metadata: params.metadata,
    })
    .select(MANAGER_RENT_PAYMENT_SELECT)
    .single<ManagerRentPaymentRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerRentPayments(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_rent_payments")
    .select(MANAGER_RENT_PAYMENT_SELECT)
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ManagerRentPaymentRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function recordManagerLandlordRemittance(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    payoutProfileId: string | null;
    amountRemitted: number;
    remittanceDate: string;
    periodStart: string | null;
    periodEnd: string | null;
    paymentMethod: ManagerRemittancePaymentMethod;
    paymentReference: string | null;
    proofUrl: string | null;
    status: ManagerRemittanceStatus;
    recordedByProfileId: string;
    notes: string | null;
    metadata: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("manager_landlord_remittances")
    .insert({
      organization_id: params.organizationId,
      landlord_client_id: params.landlordClientId,
      payout_profile_id: params.payoutProfileId,
      amount_remitted: params.amountRemitted,
      currency_code: "NGN",
      remittance_date: params.remittanceDate,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      payment_method: params.paymentMethod,
      payment_reference: params.paymentReference,
      proof_url: params.proofUrl,
      status: params.status,
      recorded_by_profile_id: params.recordedByProfileId,
      notes: params.notes,
      metadata: params.metadata,
    })
    .select(MANAGER_LANDLORD_REMITTANCE_SELECT)
    .single<ManagerLandlordRemittanceRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerLandlordRemittances(
  supabase: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("manager_landlord_remittances")
    .select(MANAGER_LANDLORD_REMITTANCE_SELECT)
    .eq("organization_id", organizationId)
    .order("remittance_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<ManagerLandlordRemittanceRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export function getManagerLandlordRemittanceSummaries(params: {
  landlordClients: ManagerLandlordClientRow[];
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
}): ManagerLandlordRemittanceSummary[] {
  return params.landlordClients
    .filter((client) => client.status === "active")
    .map((client) => {
      const amountDueToLandlord = params.payments
        .filter(
          (payment) =>
            payment.landlord_client_id === client.id &&
            (payment.status === "recorded" || payment.status === "verified"),
        )
        .reduce(
          (total, payment) => total + Number(payment.landlord_net_amount),
          0,
        );

      const amountRemitted = params.remittances
        .filter(
          (remittance) =>
            remittance.landlord_client_id === client.id &&
            (remittance.status === "recorded" ||
              remittance.status === "confirmed"),
        )
        .reduce(
          (total, remittance) => total + Number(remittance.amount_remitted),
          0,
        );

      return {
        landlordClientId: client.id,
        landlordName: client.landlord_name,
        amountDueToLandlord,
        amountRemitted,
        pendingBalance: Math.max(0, amountDueToLandlord - amountRemitted),
      };
    });
}

const overviewCurrencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const overviewDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
});

function formatDisplayName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed
    .split(/\s+/)
    .map((part) => {
      if (part.length === 0) {
        return part;
      }

      return `${part.charAt(0).toLocaleUpperCase("en-NG")}${part
        .slice(1)
        .toLocaleLowerCase("en-NG")}`;
    })
    .join(" ");
}

function formatDisplayTitle(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  return trimmed
    .split(/\s+/)
    .map((part) => {
      if (part.length === 0) {
        return part;
      }

      if (/\d/.test(part) || part === part.toLocaleUpperCase("en-NG")) {
        return part.toLocaleUpperCase("en-NG");
      }

      return `${part.charAt(0).toLocaleUpperCase("en-NG")}${part
        .slice(1)
        .toLocaleLowerCase("en-NG")}`;
    })
    .join(" ");
}

function isReliableRentPayment(payment: ManagerRentPaymentRow) {
  return payment.status === "recorded" || payment.status === "verified";
}

function formatOverviewCurrency(value: number) {
  return overviewCurrencyFormatter.format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );
}

function formatOverviewDate(date: string | null) {
  if (!date) {
    return "No due date";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid due date";
  }

  return overviewDateFormatter.format(parsedDate);
}

function getTenantOverviewAction(
  tenant: ManagerTenantRow,
): ManagerOverviewAction {
  return {
    label: "View tenant",
    href: `/manager/tenants#tenant-${tenant.id}`,
  };
}

function getUnitOverviewAction(unit: ManagerUnitRow): ManagerOverviewAction {
  return {
    label: "Review unit",
    href: `/manager/properties/${unit.property_id}`,
  };
}

function buildPrimaryAction(params: {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
  attentionItems: ManagerOverviewAttentionItem[];
}): ManagerOverviewAction {
  const primaryAttentionAction = params.attentionItems.find(
    (item) => item.category !== "property_setup",
  )?.action;

  if (primaryAttentionAction) {
    return primaryAttentionAction;
  }

  const visibleProperties = params.properties.filter(
    (property) => property.status !== "archived",
  );

  if (visibleProperties.length === 0) {
    return {
      label: "Add property",
      href: "/manager/properties/new",
    };
  }

  const currentTenants = params.tenants.filter((tenant) =>
    isCurrentManagerTenantStatus(tenant.status),
  );

  const activeUnits = params.units.filter((unit) => unit.status !== "inactive");

  if (activeUnits.length > 0 && currentTenants.length === 0) {
    return {
      label: "Add tenant",
      href: "/manager/tenants",
    };
  }

  if (currentTenants.length > 0 && params.payments.length === 0) {
    return {
      label: "Record payment",
      href: "/manager/payments",
    };
  }

  if (currentTenants.length === 0) {
    return {
      label: "Open properties",
      href: "/manager/properties",
    };
  }

  return {
    label: "Record payment",
    href: "/manager/payments",
  };
}

type ManagerOverviewRentStatus = ReturnType<typeof getManagerTenantRentStatus>;

type ManagerCurrentTenantAssignment = {
  tenant: ManagerTenantRow;
  rentStatus: ManagerOverviewRentStatus;
};

function buildAttentionItems(params: {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
  onboardingRequests: ManagerTenantOnboardingRequestRow[];
  maintenanceRequests: ManagerMaintenanceRequestRow[];
}): ManagerOverviewAttentionItem[] {
  const propertyById = new Map(
    params.properties.map((property) => [property.id, property]),
  );
  const landlordNameById = new Map(
    params.landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const unitById = new Map(params.units.map((unit) => [unit.id, unit]));
  const rentStatusByTenantId = new Map<string, ManagerOverviewRentStatus>();
  const currentTenantAssignmentsByUnitId = new Map<
    string,
    ManagerCurrentTenantAssignment[]
  >();

  for (const tenant of params.tenants) {
    const unit = unitById.get(tenant.unit_id);
    const rentStatus = getManagerTenantRentStatus({
      tenant,
      unit,
    });

    rentStatusByTenantId.set(tenant.id, rentStatus);

    if (isCurrentManagerTenantStatus(tenant.status)) {
      const unitAssignments =
        currentTenantAssignmentsByUnitId.get(tenant.unit_id) ?? [];
      unitAssignments.push({
        tenant,
        rentStatus,
      });
      currentTenantAssignmentsByUnitId.set(tenant.unit_id, unitAssignments);
    }
  }

  const attentionItems: ManagerOverviewAttentionItem[] = [];

  for (const tenant of params.tenants) {
    const rentStatus = rentStatusByTenantId.get(tenant.id);

    if (
      !rentStatus ||
      (rentStatus.kind !== "owing" && rentStatus.kind !== "due_soon")
    ) {
      continue;
    }

    const property = propertyById.get(tenant.property_id);
    const unit = unitById.get(tenant.unit_id);
    const daysFromToday = rentStatus.daysFromToday ?? 0;
    const isOwing = rentStatus.kind === "owing";
    const isOverdue = daysFromToday < 0;

    attentionItems.push({
      id: `tenant-rent-${tenant.id}`,
      propertyId: tenant.property_id,
      category: "rent",
      title: isOwing
        ? isOverdue
          ? "Overdue rent"
          : "Rent balance outstanding"
        : "Rent due soon",
      subject: formatDisplayName(tenant.full_name, "Tenant"),
      detail: `${property?.property_name ?? "Property"} - ${
        unit?.unit_label ?? "Unit"
      } - ${formatOverviewCurrency(rentStatus.amountDue)} - ${formatOverviewDate(
        tenant.next_rent_due_date,
      )} - ${rentStatus.label}`,
      action: getTenantOverviewAction(tenant),
      tone: isOwing ? "danger" : "warning",
      priority: isOwing
        ? 980_000 + Math.max(0, Math.abs(daysFromToday))
        : 950_000 - Math.min(MANAGER_RENT_DUE_SOON_DAYS, daysFromToday),
    });
  }

  for (const payment of params.payments) {
    if (payment.status !== "pending_confirmation") {
      continue;
    }

    const tenant = params.tenants.find((item) => item.id === payment.tenant_id);
    const property = propertyById.get(payment.property_id);

    attentionItems.push({
      id: `payment-confirmation-${payment.id}`,
      propertyId: payment.property_id,
      category: "payment",
      title: "Payment needs confirmation",
      subject: formatDisplayName(tenant?.full_name, "Rent payment"),
      detail: property?.property_name ?? "Property",
      action: {
        label: "Review payment",
        href: "/manager/payments",
      },
      tone: "warning",
      priority: 850_000,
    });
  }

  for (const request of params.onboardingRequests) {
    if (
      request.status !== "submitted" &&
      request.status !== "agreement_accepted" &&
      request.status !== "payment_paid"
    ) {
      continue;
    }

    const property = propertyById.get(request.property_id);
    const unit = unitById.get(request.unit_id);
    const tenantName =
      formatDisplayName(request.tenant_full_name, "") ||
      formatDisplayName(request.invited_tenant_full_name, "Tenant onboarding");

    attentionItems.push({
      id: `tenant-onboarding-${request.id}`,
      propertyId: request.property_id,
      category: "onboarding",
      title:
        request.status === "submitted"
          ? "Tenant onboarding needs review"
          : "Tenant onboarding needs completion",
      subject: tenantName,
      detail: `${unit?.unit_label ?? "Unit"} - ${
        property?.property_name ?? "Property"
      }`,
      action: {
        label: "Review request",
        href: `/manager/properties/${request.property_id}?tenantRequest=${request.id}#tenant-onboarding`,
      },
      tone: "warning",
      priority: request.status === "submitted" ? 810_000 : 780_000,
    });
  }

  for (const [unitId, assignments] of currentTenantAssignmentsByUnitId) {
    if (assignments.length <= 1) {
      continue;
    }

    const unit = unitById.get(unitId);
    const property = unit ? propertyById.get(unit.property_id) : null;

    attentionItems.push({
      id: `unit-duplicate-current-tenants-${unitId}`,
      propertyId: unit?.property_id ?? null,
      category: "unit_review",
      title: "Multiple current tenants assigned to one unit",
      subject: unit?.unit_label ?? "Unit",
      detail: `${property?.property_name ?? "Property"} - ${assignments
        .map((assignment) =>
          formatDisplayName(assignment.tenant.full_name, "Tenant"),
        )
        .slice(0, 3)
        .join(", ")}`,
      action: unit
        ? getUnitOverviewAction(unit)
        : {
            label: "Review tenants",
            href: "/manager/tenants",
          },
      tone: "danger",
      priority: 740_000 + assignments.length,
    });
  }

  for (const tenant of params.tenants) {
    const unit = unitById.get(tenant.unit_id);
    const rentStatus = rentStatusByTenantId.get(tenant.id);
    const eligibility = getManagerTenantCurrentEligibility({
      tenant,
      unit,
    });

    if (!rentStatus) {
      continue;
    }

    if (
      unit &&
      unit.status !== "occupied" &&
      (rentStatus.isCurrentRentBearingTenant ||
        eligibility.isStoredCurrentTenant)
    ) {
      const property = propertyById.get(unit.property_id);

      attentionItems.push({
        id: `current-tenant-non-occupied-unit-${tenant.id}`,
        propertyId: unit.property_id,
        category: "tenant_review",
        title: "Current tenant assigned to non-occupied unit",
        subject: formatDisplayName(tenant.full_name, "Tenant"),
        detail: `${property?.property_name ?? "Property"} - ${
          unit.unit_label
        } is ${unit.status}`,
        action: getTenantOverviewAction(tenant),
        tone: "warning",
        priority: 730_000,
      });
    }

    if (eligibility.isStoredCurrentTenant && !eligibility.hasNextRentDueDate) {
      const property = propertyById.get(tenant.property_id);
      const unitLabel = unit?.unit_label ?? "Unit";

      attentionItems.push({
        id: `current-tenant-missing-due-date-${tenant.id}`,
        propertyId: tenant.property_id,
        category: "tenant_review",
        title: "Current tenant has no rent due date",
        subject: formatDisplayName(tenant.full_name, "Tenant"),
        detail: `${property?.property_name ?? "Property"} - ${unitLabel}`,
        action: getTenantOverviewAction(tenant),
        tone: "warning",
        priority: 720_000,
      });
    }

  }

  for (const unit of params.units) {
    const currentAssignments =
      currentTenantAssignmentsByUnitId.get(unit.id) ?? [];

    if (unit.status === "occupied" && currentAssignments.length === 0) {
      const property = propertyById.get(unit.property_id);

      attentionItems.push({
        id: `occupied-unit-without-active-tenant-${unit.id}`,
        propertyId: unit.property_id,
        category: "unit_review",
        title: "Occupied unit has no active tenant",
        subject: unit.unit_label,
        detail: property?.property_name ?? "Property",
        action: getUnitOverviewAction(unit),
        tone: "warning",
        priority: 700_000,
      });
    }
  }

  const remittanceSummaries = getManagerLandlordRemittanceSummaries({
    landlordClients: params.landlordClients,
    payments: params.payments,
    remittances: params.remittances,
  });

  for (const remittanceSummary of remittanceSummaries) {
    if (remittanceSummary.pendingBalance <= 0) {
      continue;
    }

    attentionItems.push({
      id: `landlord-remittance-${remittanceSummary.landlordClientId}`,
      propertyId: null,
      category: "remittance",
      title: "Landlord remittance pending",
      subject: formatDisplayName(remittanceSummary.landlordName, "Landlord"),
      detail: "Rent collected and not fully remitted",
      action: {
        label: "Open remittances",
        href: "/manager/remittances",
      },
      tone: "warning",
      priority:
        560_000 + Math.min(20_000, remittanceSummary.pendingBalance / 1_000),
    });
  }

  for (const request of params.maintenanceRequests) {
    if (request.status !== "reported" && request.status !== "in_progress") {
      continue;
    }

    const property = propertyById.get(request.property_id);
    const unit = request.unit_id ? unitById.get(request.unit_id) : null;
    const priorityWeight =
      request.priority === "urgent"
        ? 690_000
        : request.priority === "high"
          ? 670_000
          : 640_000;

    attentionItems.push({
      id: `maintenance-${request.id}`,
      propertyId: request.property_id,
      category: "maintenance",
      title: "Maintenance issue open",
      subject: formatDisplayTitle(request.issue_title, "Maintenance issue"),
      detail: `${property?.property_name ?? "Property"}${
        unit ? ` - ${unit.unit_label}` : ""
      }`,
      action: {
        label: "Open maintenance",
        href: "/manager/maintenance",
      },
      tone:
        request.priority === "urgent" || request.priority === "high"
          ? "warning"
          : "neutral",
      priority: priorityWeight - 120_000,
    });
  }

  for (const property of params.properties) {
    const propertyUnits = params.units.filter(
      (unit) => unit.property_id === property.id,
    );

    if (property.status === "active" && propertyUnits.length === 0) {
      attentionItems.push({
        id: `property-without-units-${property.id}`,
        propertyId: property.id,
        category: "property_setup",
        title: "Property has no units",
        subject: property.property_name,
        detail: landlordNameById.get(property.landlord_client_id) ?? "Landlord",
        action: {
          label: `Add units to ${formatDisplayTitle(
            property.property_name,
            "property",
          )}`,
          href: `/manager/properties/${property.id}?addUnit=1`,
        },
        tone: "neutral",
        priority: 600_000,
      });
    }
  }

  return attentionItems.sort((firstItem, secondItem) => {
    if (firstItem.priority !== secondItem.priority) {
      return secondItem.priority - firstItem.priority;
    }

    return firstItem.title.localeCompare(secondItem.title);
  });
}

function buildUpcomingRent(params: {
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
}): ManagerOverviewUpcomingRentItem[] {
  const propertyNameById = new Map(
    params.properties.map((property) => [property.id, property.property_name]),
  );
  const unitById = new Map(params.units.map((unit) => [unit.id, unit]));

  return params.tenants
    .map((tenant): ManagerOverviewUpcomingRentItem | null => {
      const unit = unitById.get(tenant.unit_id);
      const rentStatus = getManagerTenantRentStatus({
        tenant,
        unit,
      });

      if (
        rentStatus.kind !== "due_soon" ||
        !tenant.next_rent_due_date ||
        rentStatus.daysFromToday === null
      ) {
        return null;
      }

      return {
        id: tenant.id,
        tenantName: tenant.full_name,
        propertyName: propertyNameById.get(tenant.property_id) ?? "Property",
        unitLabel: unit?.unit_label ?? "Unit",
        amountDue: rentStatus.amountDue,
        dueDate: tenant.next_rent_due_date,
        daysFromToday: rentStatus.daysFromToday,
        stateLabel: rentStatus.label,
        action: getTenantOverviewAction(tenant),
        tone: "warning",
      };
    })
    .filter((item): item is ManagerOverviewUpcomingRentItem => Boolean(item))
    .sort((firstItem, secondItem) => {
      if (firstItem.daysFromToday !== secondItem.daysFromToday) {
        return firstItem.daysFromToday - secondItem.daysFromToday;
      }

      return firstItem.tenantName.localeCompare(secondItem.tenantName);
    })
    .slice(0, 5);
}

function buildRecentActivity(params: {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  tenants: ManagerTenantRow[];
  payments: ManagerRentPaymentRow[];
  remittances: ManagerLandlordRemittanceRow[];
  onboardingRequests: ManagerTenantOnboardingRequestRow[];
  maintenanceRequests: ManagerMaintenanceRequestRow[];
}): ManagerOverviewRecentActivityItem[] {
  const tenantNameById = new Map(
    params.tenants.map((tenant) => [tenant.id, tenant.full_name]),
  );
  const propertyNameById = new Map(
    params.properties.map((property) => [property.id, property.property_name]),
  );
  const landlordNameById = new Map(
    params.landlordClients.map((client) => [client.id, client.landlord_name]),
  );

  const paymentActivities = params.payments
    .filter(
      (payment) =>
        payment.status === "recorded" ||
        payment.status === "verified" ||
        payment.status === "pending_confirmation",
    )
    .map((payment) => ({
      id: `payment-${payment.id}`,
      description:
        payment.status === "pending_confirmation"
          ? `Rent payment is awaiting confirmation for ${formatDisplayName(
              tenantNameById.get(payment.tenant_id),
              "tenant",
            )}`
          : `Rent payment was recorded for ${formatDisplayName(
              tenantNameById.get(payment.tenant_id),
              "tenant",
            )}`,
      date: payment.payment_date,
      href: "/manager/payments",
    }));

  const remittanceActivities = params.remittances.map((remittance) => ({
    id: `remittance-${remittance.id}`,
    description: `Landlord remittance was recorded for ${formatDisplayName(
      landlordNameById.get(remittance.landlord_client_id),
      "landlord",
    )}`,
    date: remittance.remittance_date,
    href: "/manager/remittances",
  }));

  const onboardingActivities = params.onboardingRequests.map((request) => {
    const tenantName =
      request.tenant_full_name ??
      request.invited_tenant_full_name ??
      "Tenant";

    return {
      id: `tenant-onboarding-${request.id}`,
      description:
        request.status === "submitted"
          ? `Tenant onboarding was submitted for ${formatDisplayName(
              tenantName,
              "tenant",
            )}`
          : `Tenant onboarding started for ${formatDisplayName(
              tenantName,
              "tenant",
            )}`,
      date: request.submitted_at ?? request.created_at,
      href: `/manager/properties/${request.property_id}?tenantRequest=${request.id}#tenant-onboarding`,
    };
  });

  const tenantActivities = params.tenants.map((tenant) => ({
    id: `tenant-${tenant.id}`,
    description: `${formatDisplayName(
      tenant.full_name,
      "Tenant",
    )} was added as a tenant`,
    date: tenant.created_at,
    href: "/manager/tenants",
  }));

  const propertyActivities = params.properties.map((property) => ({
    id: `property-${property.id}`,
    description: `${formatDisplayTitle(
      property.property_name,
      "Property",
    )} was added`,
    date: property.created_at,
    href: `/manager/properties/${property.id}`,
  }));

  const unitActivities = params.units.map((unit) => ({
    id: `unit-${unit.id}`,
    description: `${formatDisplayTitle(
      unit.unit_label,
      "Unit",
    )} was added to ${formatDisplayTitle(
      propertyNameById.get(unit.property_id),
      "property",
    )}`,
    date: unit.created_at,
    href: `/manager/properties/${unit.property_id}`,
  }));

  const maintenanceActivities = params.maintenanceRequests.map((request) => ({
    id: `maintenance-${request.id}`,
    description: `${formatDisplayTitle(
      request.issue_title,
      "Maintenance issue",
    )} was reported for ${formatDisplayTitle(
      propertyNameById.get(request.property_id),
      "property",
    )}`,
    date: request.reported_date,
    href: "/manager/maintenance",
  }));

  return [
    ...paymentActivities,
    ...remittanceActivities,
    ...onboardingActivities,
    ...maintenanceActivities,
    ...tenantActivities,
    ...propertyActivities,
    ...unitActivities,
  ]
    .sort((firstItem, secondItem) => {
      return (
        new Date(secondItem.date).getTime() - new Date(firstItem.date).getTime()
      );
    })
    .slice(0, 5);
}

function buildPropertyAttentionCountById(
  attentionItems: ManagerOverviewAttentionItem[],
) {
  const attentionCountByPropertyId = new Map<string, number>();

  for (const item of attentionItems) {
    if (!item.propertyId) {
      continue;
    }

    attentionCountByPropertyId.set(
      item.propertyId,
      (attentionCountByPropertyId.get(item.propertyId) ?? 0) + 1,
    );
  }

  return attentionCountByPropertyId;
}

function buildPropertySummaries(params: {
  landlordClients: ManagerLandlordClientRow[];
  properties: ManagerPropertyRow[];
  units: ManagerUnitRow[];
  attentionItems: ManagerOverviewAttentionItem[];
}): ManagerOverviewPropertySummary[] {
  const landlordNameById = new Map(
    params.landlordClients.map((client) => [client.id, client.landlord_name]),
  );
  const attentionCountByPropertyId = buildPropertyAttentionCountById(
    params.attentionItems,
  );

  return params.properties
    .filter((property) => property.status !== "archived")
    .map((property) => {
      const propertyUnits = params.units.filter(
        (unit) => unit.property_id === property.id,
      );

      return {
        id: property.id,
        propertyName: property.property_name,
        landlordName:
          landlordNameById.get(property.landlord_client_id) ?? "Landlord",
        totalUnits: propertyUnits.length,
        occupiedUnits: propertyUnits.filter((unit) => unit.status === "occupied")
          .length,
        vacantUnits: propertyUnits.filter((unit) => unit.status === "vacant")
          .length,
        unavailableUnits: propertyUnits.filter(
          (unit) => unit.status === "reserved" || unit.status === "inactive",
        ).length,
        needsAttentionCount: attentionCountByPropertyId.get(property.id) ?? 0,
        href: `/manager/properties/${property.id}`,
      };
    })
    .sort((firstItem, secondItem) =>
      firstItem.propertyName.localeCompare(secondItem.propertyName),
    );
}

export async function getManagerOverview(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<ManagerOverview | null> {
  const { data: organization, error: organizationError } = await supabase
    .from("manager_organizations")
    .select(MANAGER_ORGANIZATION_SELECT)
    .eq("id", organizationId)
    .maybeSingle<ManagerOrganizationRow>();

  if (organizationError) {
    throw organizationError;
  }

  if (!organization) {
    return null;
  }

  const [
    clients,
    properties,
    units,
    tenants,
    payments,
    remittances,
    onboardingRequests,
    maintenanceRequests,
  ] =
    await Promise.all([
      listManagerLandlordClients(supabase, organizationId),
      listManagerProperties(supabase, organizationId),
      listManagerUnits(supabase, { organizationId }),
      listManagerTenants(supabase, { organizationId }),
      listManagerRentPayments(supabase, organizationId),
      listManagerLandlordRemittances(supabase, organizationId),
      listManagerTenantOnboardingRequests(supabase, { organizationId }),
      listManagerMaintenanceRequests(supabase, organizationId),
    ]);

  const reliablePayments = payments.filter(isReliableRentPayment);
  const rentCollected = reliablePayments.reduce(
    (total, payment) => total + Number(payment.amount_paid),
    0,
  );
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const rentStatuses = tenants.map((tenant) =>
    getManagerTenantRentStatus({
      tenant,
      unit: unitById.get(tenant.unit_id),
    }),
  );
  const currentRentStatuses = rentStatuses.filter(
    (rentStatus) => rentStatus.isCurrentRentBearingTenant,
  );
  const currentTenants = tenants.filter((tenant) =>
    isCurrentManagerTenantStatus(tenant.status),
  );
  const attentionItems = buildAttentionItems({
    landlordClients: clients,
    properties,
    units,
    tenants,
    payments,
    remittances,
    onboardingRequests,
    maintenanceRequests,
  });

  return {
    organization,
    primaryAction: buildPrimaryAction({
      properties,
      units,
      tenants,
      payments,
      attentionItems,
    }),
    totals: {
      landlordClients: clients.filter((client) => client.status === "active")
        .length,
      totalProperties: properties.length,
      activeProperties: properties.filter(
        (property) => property.status === "active",
      ).length,
      totalUnits: units.length,
      vacantUnits: units.filter((unit) => unit.status === "vacant").length,
      occupiedUnits: units.filter((unit) => unit.status === "occupied").length,
      totalTenants: tenants.length,
      activeTenants: currentTenants.length,
      totalRecordedPayments: rentCollected,
      totalVerifiedPayments: payments
        .filter((payment) => payment.status === "verified")
        .reduce((total, payment) => total + Number(payment.amount_paid), 0),
      totalManagerCommission: reliablePayments.reduce(
        (total, payment) => total + Number(payment.management_fee_amount),
        0,
      ),
      totalLandlordShare: reliablePayments.reduce(
        (total, payment) => total + Number(payment.landlord_net_amount),
        0,
      ),
    },
    rentPosition: {
      totalTenants: currentTenants.length,
      owingTenants: currentRentStatuses.filter(
        (rentStatus) => rentStatus.kind === "owing",
      ).length,
      dueSoonTenants: currentRentStatuses.filter(
        (rentStatus) => rentStatus.kind === "due_soon",
      ).length,
      rentCollected,
      vacantUnits: units.filter((unit) => unit.status === "vacant").length,
    },
    attentionItems,
    upcomingRent: buildUpcomingRent({
      properties,
      units,
      tenants,
    }),
    recentActivity: buildRecentActivity({
      landlordClients: clients,
      properties,
      units,
      tenants,
      payments,
      remittances,
      onboardingRequests,
      maintenanceRequests,
    }),
    propertySummaries: buildPropertySummaries({
      landlordClients: clients,
      properties,
      units,
      attentionItems,
    }),
    recentPayments: payments.slice(0, 6).map((payment) => {
      const tenant = tenants.find((item) => item.id === payment.tenant_id);
      const property = properties.find(
        (item) => item.id === payment.property_id,
      );
      const unit = units.find((item) => item.id === payment.unit_id);

      return {
        id: payment.id,
        amountPaid: Number(payment.amount_paid),
        status: payment.status,
        paymentDate: payment.payment_date,
        tenantName: tenant?.full_name ?? "Tenant",
        propertyName: property?.property_name ?? "Property",
        unitLabel: unit?.unit_label ?? "Unit",
      };
    }),
  };
}
