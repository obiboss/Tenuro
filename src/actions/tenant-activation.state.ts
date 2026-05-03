import type {
  TenantActivationActionState,
  TenantActivationInviteActionState,
} from "@/actions/tenant-activation.actions";

export const initialTenantActivationInviteActionState: TenantActivationInviteActionState =
  {
    ok: false,
    message: "",
  };

export const initialTenantActivationActionState: TenantActivationActionState = {
  ok: false,
  message: "",
};
