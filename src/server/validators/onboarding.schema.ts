import { z } from "zod";
import {
  optionalEmailSchema,
  phoneSchema,
} from "@/server/validators/common.schema";

const yesNoSchema = z.enum(["yes", "no"]).optional();

export const submitTenantOnboardingSchema = z.object({
  token: z.string().trim().min(20, "Invalid onboarding token."),

  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long."),
  phoneNumber: phoneSchema,
  email: optionalEmailSchema,

  dateOfBirth: z.coerce.date({
    message: "Enter your date of birth.",
  }),
  occupation: z
    .string()
    .trim()
    .min(2, "Enter your occupation.")
    .max(120, "Occupation is too long."),
  employer: z.string().trim().max(120).optional().or(z.literal("")),
  workMode: z.enum(["remote", "hybrid", "on_site"]).optional(),
  officeAddress: z.string().trim().max(300).optional().or(z.literal("")),
  homeAddress: z
    .string()
    .trim()
    .min(5, "Enter your current home address.")
    .max(300, "Home address is too long."),

  idType: z.enum(["nin", "passport", "drivers_license", "voters_card"], {
    message: "Select your ID type.",
  }),
  idNumber: z
    .string()
    .trim()
    .min(3, "Enter your ID number.")
    .max(80, "ID number is too long."),
  idDocumentPath: z
    .string()
    .trim()
    .min(3, "Upload your ID document.")
    .max(500, "Invalid ID document path."),
  passportPhotoPath: z
    .string()
    .trim()
    .min(3, "Upload your passport photo.")
    .max(500, "Invalid passport photo path."),

  guarantorFullName: z.string().trim().max(120).optional().or(z.literal("")),
  guarantorPhoneNumber: z.string().trim().max(20).optional().or(z.literal("")),
  guarantorEmail: optionalEmailSchema,
  guarantorAddress: z.string().trim().max(300).optional().or(z.literal("")),
  guarantorRelationship: z.string().trim().max(80).optional().or(z.literal("")),
  guarantorIdDocumentPath: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("")),

  hasPets: yesNoSchema,
  occupantCount: z.coerce.number().int().min(1).max(50).optional(),
  propertyUse: z.enum(["residential", "commercial"]).optional(),
  hasChildrenUnderFive: yesNoSchema,
  monthlyIncomeRange: z
    .enum([
      "below_100000",
      "100000_249999",
      "250000_499999",
      "500000_999999",
      "1000000_1999999",
      "2000000_and_above",
    ])
    .optional(),
  canProvideGuarantor: yesNoSchema,
  willUseShortlet: yesNoSchema,
  willSublet: yesNoSchema,
  willRunCustomerFacingBusiness: yesNoSchema,
  willUseHeavyGeneratorOrEquipment: yesNoSchema,
  willHostLargeGatherings: yesNoSchema,
});

export const landlordTenantAdditionalDetailsSchema = z.object({
  workMode: z.enum(["remote", "hybrid", "on_site"], {
    message: "Select how you normally work.",
  }),
  officeAddress: z
    .string()
    .trim()
    .min(5, "Enter your office or business address.")
    .max(300, "Office address is too long."),
  guarantorFullName: z
    .string()
    .trim()
    .min(2, "Enter the guarantor's full name.")
    .max(120, "Guarantor name is too long."),
  guarantorPhoneNumber: phoneSchema,
  guarantorEmail: optionalEmailSchema,
  guarantorAddress: z
    .string()
    .trim()
    .min(5, "Enter the guarantor's address.")
    .max(300, "Guarantor address is too long."),
  guarantorRelationship: z
    .string()
    .trim()
    .min(2, "Enter the guarantor's relationship to you.")
    .max(80, "Relationship is too long."),
  guarantorIdDocumentPath: z
    .string()
    .trim()
    .max(500, "Invalid guarantor ID document path.")
    .optional()
    .or(z.literal("")),
});

export type SubmitTenantOnboardingInput = z.infer<
  typeof submitTenantOnboardingSchema
>;

export type LandlordTenantAdditionalDetailsInput = z.infer<
  typeof landlordTenantAdditionalDetailsSchema
>;
