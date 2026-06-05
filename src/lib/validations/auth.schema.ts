import { z } from "zod";
import { e164PhoneSchema } from "@/lib/validations/phone.schema";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72)
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/\d/, "Password must include at least one number");

export const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  phone: e164PhoneSchema,
  redirect_to: z.string().url().optional(),
});

export const phoneOtpSendSchema = z.object({
  phone: e164PhoneSchema,
  resend: z.coerce.boolean().optional(),
});

export const phoneOtpVerifySchema = z.object({
  phone: e164PhoneSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your SMS"),
  next: z.string().max(2048).optional(),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  redirect_to: z.string().url().optional(),
});

/** @deprecated Use `loginSchema` */
export const signInFormSchema = loginSchema;
/** @deprecated Use `signupSchema` */
export const signUpFormSchema = signupSchema;
