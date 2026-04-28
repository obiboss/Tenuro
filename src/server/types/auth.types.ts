export type UserRole = "landlord" | "tenant" | "caretaker";

export type OtpPurpose =
  | "login"
  | "register"
  | "device_verification"
  | "session_expired";

export type OtpDeliveryChannel = "whatsapp" | "sms";

export type OtpDeliveryStatus = "pending" | "sent" | "failed";

export type NormalizedPhoneNumber = {
  e164: string;
  local: string;
  countryCode: "NG";
};

export type OtpRequestResult = {
  phoneNumber: string;
  maskedPhoneNumber: string;
  deliveryChannel: OtpDeliveryChannel;
  expiresAt: string;
};

export type OtpVerifyResult = {
  userId: string;
  role: UserRole;
  phoneNumber: string;
};

export type ServerSessionUser = {
  id: string;
  role: UserRole;
  fullName: string;
  phoneNumber: string;
  email: string | null;
};

export type AuthActionState = {
  ok: boolean;
  message: string;
  phoneNumber?: string;
  maskedPhoneNumber?: string;
  fieldErrors?: Record<string, string[]>;
};
