export type CaretakerAssignmentPermissions = {
  can_view_payments: boolean;
  can_view_tenant_profiles: boolean;
};

export const DEFAULT_CARETAKER_PERMISSIONS: CaretakerAssignmentPermissions = {
  can_view_payments: true,
  can_view_tenant_profiles: true,
};

export const CARETAKER_INVITE_EXPIRY_HOURS = 7 * 24;
