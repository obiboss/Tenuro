import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ManagerCollectionMode,
  ManagerManagementFeeType,
  ManagerPaymentMethod,
  ManagerPaymentReceiver,
  ManagerPaystackChargeBearer,
  ManagerRemittancePaymentMethod,
  ManagerRemittanceStatus,
  ManagerRentPaymentStatus,
  ManagerTenantStatus,
  ManagerUnitStatus,
} from "@/constants/manager";
import {
  getActiveManagerStaffMemberForProfile,
  type ManagerWorkspaceRole,
} from "@/server/repositories/manager-staff.repository";

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

export type ManagerOverview = {
  organization: ManagerOrganizationRow;
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
  },
) {
  let query = supabase
    .from("manager_tenants")
    .select(MANAGER_TENANT_SELECT)
    .eq("organization_id", params.organizationId);

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

  const [clients, properties, units, tenants, payments] = await Promise.all([
    listManagerLandlordClients(supabase, organizationId),
    listManagerProperties(supabase, organizationId),
    listManagerUnits(supabase, { organizationId }),
    listManagerTenants(supabase, { organizationId }),
    listManagerRentPayments(supabase, organizationId),
  ]);

  return {
    organization,
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
      activeTenants: tenants.filter((tenant) => tenant.status === "active")
        .length,
      totalRecordedPayments: payments.reduce(
        (total, payment) => total + Number(payment.amount_paid),
        0,
      ),
      totalVerifiedPayments: payments
        .filter((payment) => payment.status === "verified")
        .reduce((total, payment) => total + Number(payment.amount_paid), 0),
      totalManagerCommission: payments.reduce(
        (total, payment) => total + Number(payment.management_fee_amount),
        0,
      ),
      totalLandlordShare: payments.reduce(
        (total, payment) => total + Number(payment.landlord_net_amount),
        0,
      ),
    },
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
