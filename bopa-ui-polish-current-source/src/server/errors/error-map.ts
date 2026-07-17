export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Please sign in to continue.",
  FORBIDDEN: "You do not have permission to do this.",
  NOT_FOUND: "We could not find this record. Please check and try again.",
  VALIDATION_FAILED: "Please check the highlighted fields.",
  PAYMENT_ALREADY_PROCESSED: "This payment has already been recorded.",
  INVALID_WEBHOOK_SIGNATURE: "Invalid payment notification.",
  ONBOARDING_LINK_EXPIRED:
    "This onboarding link has expired. Please ask your landlord for a new link.",
  LEDGER_WRITE_FAILED: "Payment could not be saved. Please try again.",
  DOCUMENT_UPLOAD_FAILED: "Document could not be uploaded. Please try again.",
  WHATSAPP_FAILED: "Message could not be sent.",
  SERVER_ERROR: "Something went wrong. Please try again.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
