export type PaystackPayoutVerificationState =
  | "missing"
  | "unverified"
  | "verified"
  | "failed";

export type PayoutVerificationStatusPayload = {
  state: PaystackPayoutVerificationState;
  verifiedAt: string | null;
  updatedAt: string | null;
};
