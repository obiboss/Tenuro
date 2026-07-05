import { z } from "zod";
import { passwordSchema } from "@/server/validators/auth.schema";

export const registerManagerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Name is too long."),
    email: z.string().trim().email("Enter a valid work email address."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const managerLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email address."),
  password: passwordSchema,
});

export type RegisterManagerInput = z.infer<typeof registerManagerSchema>;
export type ManagerLoginInput = z.infer<typeof managerLoginSchema>;
