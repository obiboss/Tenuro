import { z } from "zod";

const optionalTextSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}, z.string().max(500));

const optionalEmailSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().toLowerCase();
  },
  z.union([
    z.literal(""),
    z.string().email("Enter a valid email address.").max(254),
  ]),
);

export const tenantKycApplicationSchema = z.object({
  agentPropertyListingId: z.string().uuid(),

  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Name is too long."),

  phoneNumber: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number.")
    .max(30, "Phone number is too long."),

  email: optionalEmailSchema,

  dateOfBirth: optionalTextSchema,

  homeAddress: z
    .string()
    .trim()
    .min(5, "Enter your current home address.")
    .max(300, "Home address is too long."),

  occupation: z
    .string()
    .trim()
    .min(2, "Enter your occupation.")
    .max(120, "Occupation is too long."),

  employer: optionalTextSchema,

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

  canProvideGuarantor: z.enum(["yes", "no", "not_sure"], {
    message: "Select whether you can provide a guarantor if required.",
  }),
});

export type TenantKycApplicationInput = z.infer<
  typeof tenantKycApplicationSchema
>;
