import { z } from "zod";

const amountSchema = z.coerce
  .number()
  .int("Enter whole naira amounts only.")
  .min(0, "Amounts cannot be negative.");

export const updatePlatformPaymentSettingsSchema = z
  .object({
    agentProcessingFeeAmount: amountSchema,
    agentProcessingFeeAgentShare: amountSchema,
    agentProcessingFeePlatformShare: amountSchema,
    isAgentProcessingFeeEnabled: z.coerce.boolean(),
    landlordProcessingFeeAmount: amountSchema,
    landlordProcessingFeeLandlordShare: amountSchema,
    landlordProcessingFeePlatformShare: amountSchema,
    isLandlordProcessingFeeEnabled: z.coerce.boolean(),
    bopaBasicAnnualPriceNaira: amountSchema,
    bopaProAnnualPriceNaira: amountSchema,
    landlordTrialDays: amountSchema,
    expectedUpdatedAt: z.string().trim().min(1, "Settings reference is missing."),
  })
  .superRefine((value, context) => {
    if (
      value.agentProcessingFeeAmount !==
      value.agentProcessingFeeAgentShare +
        value.agentProcessingFeePlatformShare
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Total fee must equal the agent share plus the platform share.",
        path: ["agentProcessingFeeAmount"],
      });
    }

    if (
      value.landlordProcessingFeeAmount !==
      value.landlordProcessingFeeLandlordShare +
        value.landlordProcessingFeePlatformShare
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Total fee must equal the landlord share plus the platform share.",
        path: ["landlordProcessingFeeAmount"],
      });
    }
  });

export type UpdatePlatformPaymentSettingsSchemaInput = z.infer<
  typeof updatePlatformPaymentSettingsSchema
>;
