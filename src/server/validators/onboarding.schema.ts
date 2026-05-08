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

export type SubmitTenantOnboardingInput = z.infer<
  typeof submitTenantOnboardingSchema
>;
