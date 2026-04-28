export type OnboardingTokenStatus = "valid" | "expired" | "used" | "not_found";

export type TenantOnboardingStep =
  | "your_details"
  | "your_id"
  | "guarantor"
  | "balance_confirmation"
  | "review"
  | "done";

export type TenantOnboardingTokenResult = {
  token: string;
  tokenHash: string;
  expiresAt: string;
};

export type TenantOnboardingResolveResult = {
  tenantId: string;
  fullName: string;
  phoneNumber: string;
  onboardingStatus: string;
  unitId: string;
  unitIdentifier: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  landlordName: string;
};
