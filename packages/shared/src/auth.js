import { z } from "zod";
import { MIN_PASSWORD_LENGTH, PASSWORD_NUMBER_PATTERN } from "./constants.js";

export const emailSchema = z.string().trim().email().max(255);

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .refine((value) => PASSWORD_NUMBER_PATTERN.test(value), {
    message: "Password must include at least one number."
  });

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.")
});
