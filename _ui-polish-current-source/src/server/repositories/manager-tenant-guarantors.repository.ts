import type { SupabaseClient } from "@supabase/supabase-js";

export type ManagerTenantGuarantorStatus =
  | "pending_confirmation"
  | "confirmed"
  | "declined"
  | "cancelled";

export type ManagerTenantGuarantorRow = {
  id: string;
  organization_id: string;
  landlord_client_id: string;
  property_id: string;
  unit_id: string;
  onboarding_request_id: string;
  position: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  relationship_to_tenant: string;
  residential_address: string;
  occupation: string;
  employer_or_business: string | null;
  monthly_income: number;
  id_type: "nin" | "passport" | "drivers_license" | "voters_card";
  id_number: string;
  status: ManagerTenantGuarantorStatus;
  confirmation_token_hash: string;
  confirmation_token_expires_at: string;
  confirmation_token_used_at: string | null;
  responsibility_acknowledged: boolean;
  confirmed_at: string | null;
  confirmation_ip: string | null;
  confirmation_user_agent: string | null;
  metadata: Record<string, unknown>;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  manager_tenant_onboarding_requests: {
    id: string;
    status: string;
    tenant_full_name: string | null;
    invited_tenant_full_name: string | null;
    tenant_phone_number: string | null;
    invited_tenant_phone_number: string | null;
  } | null;
  manager_properties: {
    id: string;
    property_name: string;
    property_address: string;
  } | null;
  manager_units: {
    id: string;
    unit_label: string;
  } | null;
  manager_organizations: {
    id: string;
    organization_name: string;
    organization_phone: string | null;
    organization_email: string | null;
  } | null;
};

export const MANAGER_TENANT_GUARANTOR_SELECT = `
  id,
  organization_id,
  landlord_client_id,
  property_id,
  unit_id,
  onboarding_request_id,
  position,
  full_name,
  phone_number,
  email,
  relationship_to_tenant,
  residential_address,
  occupation,
  employer_or_business,
  monthly_income,
  id_type,
  id_number,
  status,
  confirmation_token_hash,
  confirmation_token_expires_at,
  confirmation_token_used_at,
  responsibility_acknowledged,
  confirmed_at,
  confirmation_ip,
  confirmation_user_agent,
  metadata,
  cancelled_at,
  created_at,
  updated_at,
  manager_tenant_onboarding_requests (
    id,
    status,
    tenant_full_name,
    invited_tenant_full_name,
    tenant_phone_number,
    invited_tenant_phone_number
  ),
  manager_properties (
    id,
    property_name,
    property_address
  ),
  manager_units (
    id,
    unit_label
  ),
  manager_organizations (
    id,
    organization_name,
    organization_phone,
    organization_email
  )
`;

export async function createManagerTenantGuarantors(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    landlordClientId: string;
    propertyId: string;
    unitId: string;
    onboardingRequestId: string;
    guarantors: Array<{
      position: number;
      fullName: string;
      phoneNumber: string;
      email: string | null;
      relationshipToTenant: string;
      residentialAddress: string;
      occupation: string;
      employerOrBusiness: string | null;
      monthlyIncome: number;
      idType: ManagerTenantGuarantorRow["id_type"];
      idNumber: string;
      tokenHash: string;
      tokenExpiresAt: string;
      metadata: Record<string, unknown>;
    }>;
  },
) {
  if (params.guarantors.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .insert(
      params.guarantors.map((guarantor) => ({
        organization_id: params.organizationId,
        landlord_client_id: params.landlordClientId,
        property_id: params.propertyId,
        unit_id: params.unitId,
        onboarding_request_id: params.onboardingRequestId,
        position: guarantor.position,
        full_name: guarantor.fullName,
        phone_number: guarantor.phoneNumber,
        email: guarantor.email,
        relationship_to_tenant: guarantor.relationshipToTenant,
        residential_address: guarantor.residentialAddress,
        occupation: guarantor.occupation,
        employer_or_business: guarantor.employerOrBusiness,
        monthly_income: guarantor.monthlyIncome,
        id_type: guarantor.idType,
        id_number: guarantor.idNumber,
        status: "pending_confirmation",
        confirmation_token_hash: guarantor.tokenHash,
        confirmation_token_expires_at: guarantor.tokenExpiresAt,
        metadata: guarantor.metadata,
      })),
    )
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .returns<ManagerTenantGuarantorRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function listManagerTenantGuarantorsForRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("onboarding_request_id", params.requestId)
    .neq("status", "cancelled")
    .order("position", { ascending: true })
    .returns<ManagerTenantGuarantorRow[]>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantGuarantorByTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
) {
  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .eq("confirmation_token_hash", tokenHash)
    .maybeSingle<ManagerTenantGuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function getManagerTenantGuarantorById(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    guarantorId: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .eq("organization_id", params.organizationId)
    .eq("id", params.guarantorId)
    .single<ManagerTenantGuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function confirmManagerTenantGuarantor(
  supabase: SupabaseClient,
  params: {
    guarantorId: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    relationshipToTenant: string;
    residentialAddress: string;
    occupation: string;
    employerOrBusiness: string | null;
    monthlyIncome: number;
    idType: ManagerTenantGuarantorRow["id_type"];
    idNumber: string;
    ipAddress: string | null;
    userAgent: string | null;
  },
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .update({
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      relationship_to_tenant: params.relationshipToTenant,
      residential_address: params.residentialAddress,
      occupation: params.occupation,
      employer_or_business: params.employerOrBusiness,
      monthly_income: params.monthlyIncome,
      id_type: params.idType,
      id_number: params.idNumber,
      status: "confirmed",
      responsibility_acknowledged: true,
      confirmed_at: now,
      confirmation_token_used_at: now,
      confirmation_ip: params.ipAddress,
      confirmation_user_agent: params.userAgent,
    })
    .eq("id", params.guarantorId)
    .eq("status", "pending_confirmation")
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .single<ManagerTenantGuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function rotateManagerTenantGuarantorToken(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    guarantorId: string;
    tokenHash: string;
    tokenExpiresAt: string;
  },
) {
  const { data, error } = await supabase
    .from("manager_tenant_guarantors")
    .update({
      confirmation_token_hash: params.tokenHash,
      confirmation_token_expires_at: params.tokenExpiresAt,
      confirmation_token_used_at: null,
    })
    .eq("organization_id", params.organizationId)
    .eq("id", params.guarantorId)
    .eq("status", "pending_confirmation")
    .select(MANAGER_TENANT_GUARANTOR_SELECT)
    .single<ManagerTenantGuarantorRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function cancelManagerTenantGuarantorsForRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
  },
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("manager_tenant_guarantors")
    .update({
      status: "cancelled",
      cancelled_at: now,
    })
    .eq("organization_id", params.organizationId)
    .eq("onboarding_request_id", params.requestId)
    .eq("status", "pending_confirmation");

  if (error) {
    throw error;
  }
}

export async function deleteManagerTenantGuarantorsForRequest(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    requestId: string;
  },
) {
  const { error } = await supabase
    .from("manager_tenant_guarantors")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("onboarding_request_id", params.requestId)
    .eq("status", "pending_confirmation");

  if (error) {
    throw error;
  }
}
