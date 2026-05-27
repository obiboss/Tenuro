import { z } from "zod";

export const tenantKycApplicationSchema = z.object({
  agentPropertyListingId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Enter your full name."),
  phoneNumber: z.string().trim().min(8, "Enter a valid phone number."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  homeAddress: z.string().trim().min(5, "Enter your current home address."),
  occupation: z.string().trim().min(2, "Enter your occupation."),
  employer: z.string().trim().optional().or(z.literal("")),
  idType: z
    .enum(["nin", "passport", "drivers_license", "voters_card"])
    .optional(),
  idDocumentPath: z.string().trim().optional().or(z.literal("")),
  passportPhotoPath: z.string().trim().optional().or(z.literal("")),
  canProvideGuarantor: z.enum(["yes", "no", "not_sure"]),
});

export type TenantKycApplicationInput = z.infer<
  typeof tenantKycApplicationSchema
>;
