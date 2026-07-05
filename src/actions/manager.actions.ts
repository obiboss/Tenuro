"use server";

import { revalidatePath } from "next/cache";
import type { ManagerActionState } from "@/actions/manager.state";
import { errorResult } from "@/server/errors/result";
import {
  createManagerLandlordClient,
  createManagerOrganization,
  createManagerProperty,
  createManagerTenant,
  createManagerUnit,
  recordManagerLandlordRemittance,
  recordManagerRentPayment,
  saveManagerLandlordPayoutProfile,
} from "@/server/services/manager.service";
import { requireManagerWorkspacePermission } from "@/server/services/manager-staff-access.service";
import {
  createManagerLandlordClientSchema,
  createManagerOrganizationSchema,
  createManagerPropertySchema,
  createManagerTenantSchema,
  createManagerUnitSchema,
  recordManagerLandlordRemittanceSchema,
  recordManagerRentPaymentSchema,
  saveManagerLandlordPayoutProfileSchema,
} from "@/server/validators/manager.schema";

function toActionError(error: unknown): ManagerActionState {
  const result = errorResult(error);

  return {
    ok: false,
    message: result.message,
    fieldErrors: "fieldErrors" in result ? result.fieldErrors : undefined,
  };
}

export async function createManagerOrganizationAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    const parsed = createManagerOrganizationSchema.parse({
      organizationName: formData.get("organizationName"),
      organizationPhone: formData.get("organizationPhone"),
      organizationEmail: formData.get("organizationEmail"),
      rcNumber: formData.get("rcNumber"),
      officeAddress: formData.get("officeAddress"),
    });

    await createManagerOrganization(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/onboarding");
    revalidatePath("/manager/overview");

    return {
      ok: true,
      message: "Manager organization created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManagerLandlordClientAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = createManagerLandlordClientSchema.parse({
      landlordName: formData.get("landlordName"),
      landlordPhone: formData.get("landlordPhone"),
      landlordEmail: formData.get("landlordEmail"),
      landlordAddress: formData.get("landlordAddress"),
      notes: formData.get("notes"),
    });

    await createManagerLandlordClient(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/landlords");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message: "Landlord client created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveManagerLandlordPayoutProfileAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("remittance.manage");

    const parsed = saveManagerLandlordPayoutProfileSchema.parse({
      payoutProfileId: formData.get("payoutProfileId"),
      landlordClientId: formData.get("landlordClientId"),
      paymentReceiver: formData.get("paymentReceiver"),
      receiverName: formData.get("receiverName"),
      receiverPhone: formData.get("receiverPhone"),
      bankName: formData.get("bankName"),
      bankCode: formData.get("bankCode"),
      accountNumber: formData.get("accountNumber"),
      accountName: formData.get("accountName"),
      payoutNote: formData.get("payoutNote"),
      isDefault: formData.get("isDefault"),
    });

    await saveManagerLandlordPayoutProfile(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/landlords");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message: "Landlord payout profile saved successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManagerPropertyAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = createManagerPropertySchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyName: formData.get("propertyName"),
      propertyAddress: formData.get("propertyAddress"),
      city: formData.get("city"),
      state: formData.get("state"),
      lga: formData.get("lga"),
      collectionMode: formData.get("collectionMode"),
      managementFeeType: formData.get("managementFeeType"),
      managementFeeValue: formData.get("managementFeeValue"),
      paystackChargeBearer: formData.get("paystackChargeBearer"),
      paymentReceiver: formData.get("paymentReceiver"),
      notes: formData.get("notes"),
    });

    await createManagerProperty(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/properties");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message: "Property created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManagerUnitAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = createManagerUnitSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitLabel: formData.get("unitLabel"),
      unitType: formData.get("unitType"),
      rentAmount: formData.get("rentAmount"),
      status: formData.get("status") || "vacant",
      notes: formData.get("notes"),
    });

    await createManagerUnit(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/properties");

    return {
      ok: true,
      message: "Unit created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManagerTenantAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("property.manage");

    const parsed = createManagerTenantSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      fullName: formData.get("fullName"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      occupation: formData.get("occupation"),
      rentAmount: formData.get("rentAmount"),
      currentBalance: formData.get("currentBalance"),
      moveInDate: formData.get("moveInDate"),
      nextRentDueDate: formData.get("nextRentDueDate"),
      status: formData.get("status") || "active",
      notes: formData.get("notes"),
    });

    await createManagerTenant(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/properties");

    return {
      ok: true,
      message: "Tenant created successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordManagerRentPaymentAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("payment.manage");

    const parsed = recordManagerRentPaymentSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      propertyId: formData.get("propertyId"),
      unitId: formData.get("unitId"),
      tenantId: formData.get("tenantId"),
      amountPaid: formData.get("amountPaid"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReceiver: formData.get("paymentReceiver"),
      paymentReference: formData.get("paymentReference"),
      proofUrl: formData.get("proofUrl"),
      paymentDate: formData.get("paymentDate"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      notes: formData.get("notes"),
    });

    await recordManagerRentPayment(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/payments");
    revalidatePath("/manager/tenants");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message: "Rent payment recorded successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordManagerLandlordRemittanceAction(
  _previousState: ManagerActionState,
  formData: FormData,
): Promise<ManagerActionState> {
  try {
    await requireManagerWorkspacePermission("remittance.manage");

    const parsed = recordManagerLandlordRemittanceSchema.parse({
      landlordClientId: formData.get("landlordClientId"),
      payoutProfileId: formData.get("payoutProfileId"),
      amountRemitted: formData.get("amountRemitted"),
      remittanceDate: formData.get("remittanceDate"),
      periodStart: formData.get("periodStart"),
      periodEnd: formData.get("periodEnd"),
      paymentMethod: formData.get("paymentMethod"),
      paymentReference: formData.get("paymentReference"),
      proofUrl: formData.get("proofUrl"),
      notes: formData.get("notes"),
    });

    await recordManagerLandlordRemittance(parsed);

    revalidatePath("/manager");
    revalidatePath("/manager/overview");
    revalidatePath("/manager/remittances");

    return {
      ok: true,
      message: "Landlord remittance recorded successfully.",
    };
  } catch (error) {
    return toActionError(error);
  }
}
