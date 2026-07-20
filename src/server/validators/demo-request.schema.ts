import { z } from "zod";

export const demoWorkspaceTypeSchema = z.enum(["manager", "developer"]);

export const demoTimeWindowSchema = z.enum(["morning", "afternoon", "evening"]);

export const demoRequestStatusSchema = z.enum([
  "pending",
  "contacted",
  "scheduled",
  "completed",
  "cancelled",
]);

const nigeriaPhoneInputSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid Nigerian phone number.")
  .max(20, "Enter a valid Nigerian phone number.")
  .refine((value) => {
    const digits = value.replace(/\D/g, "");

    return (
      /^0[789][01]\d{8}$/.test(digits) ||
      /^234[789][01]\d{8}$/.test(digits) ||
      /^[789][01]\d{8}$/.test(digits)
    );
  }, "Enter a valid Nigerian phone number.");

export const submitDemoRequestSchema = z.object({
  workspaceType: demoWorkspaceTypeSchema,
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Your name is too long."),
  companyName: z
    .string()
    .trim()
    .min(2, "Enter your company or business name.")
    .max(160, "Your company name is too long."),
  workEmail: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Your email address is too long."),
  phoneNumber: nigeriaPhoneInputSchema,
  preferredDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose your preferred demo date."),
  preferredTimeWindow: demoTimeWindowSchema,
  message: z
    .string()
    .trim()
    .max(1_000, "Keep the additional information below 1,000 characters.")
    .optional()
    .transform((value) => value || undefined),
  website: z.string().trim().max(200).optional(),
});

export const updateDemoRequestStatusSchema = z.object({
  requestId: z.string().uuid("The demo request reference is invalid."),
  status: demoRequestStatusSchema,
});

export type SubmitDemoRequestInput = z.infer<typeof submitDemoRequestSchema>;
export type DemoWorkspaceType = z.infer<typeof demoWorkspaceTypeSchema>;
export type DemoTimeWindow = z.infer<typeof demoTimeWindowSchema>;
export type DemoRequestStatus = z.infer<typeof demoRequestStatusSchema>;
