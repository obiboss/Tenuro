import { z } from "zod";

export const businessSubscriptionCheckoutSchema = z.object({
  workspaceType: z.enum(["manager", "developer"]),
  billingInterval: z.enum(["monthly", "annual"]),
  billingEmail: z
    .string()
    .trim()
    .min(1, "Enter a billing email address.")
    .email("Enter a valid billing email address."),
});

export const businessSubscriptionManageSchema = z.object({
  workspaceType: z.enum(["manager", "developer"]),
});
