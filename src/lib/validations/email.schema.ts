import { z } from "zod";
import { EmailBookingSubType, EmailType as EmailKind } from "@/types/email";

/**
 * Request body for POST /api/email/send.
 * - Legacy: `type` is `welcome` | `otp_verification` | … with `props`.
 * - Generic: `type` is {@link EmailKind} with `data` (and `subType` when type is `booking`).
 */

export const welcomePropsSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  appUrl: z.string().url().optional(),
});

export const otpVerificationPropsSchema = z.object({
  code: z.string().min(1).max(256),
  purpose: z.string().min(1).max(200),
  actionUrl: z.string().url().optional(),
  expiresInMinutes: z.number().int().min(1).max(7 * 24 * 60).optional(),
});

export const passwordResetPropsSchema = z.object({
  resetUrl: z.string().url(),
  expiresInMinutes: z.number().int().min(1).max(7 * 24 * 60).optional(),
  firstName: z.string().max(120).optional(),
});

/** Same fields as password reset; used by generic `forgotPassword` type. */
export const forgotPasswordPropsSchema = passwordResetPropsSchema;

export const bookingConfirmationPropsSchema = z.object({
  bookingReference: z.string().min(1).max(120),
  guestName: z.string().min(1).max(200),
  destination: z.string().min(1).max(300),
  dates: z.string().min(1).max(500),
  total: z.string().min(1).max(80),
  manageUrl: z.string().url().optional(),
  productLabel: z.string().max(120).optional(),
  /** Airline / GDS record locator when issued (flights). */
  airlineRecordLocator: z.string().min(1).max(64).optional(),
  /** Comma-separated traveler names. */
  passengersSummary: z.string().min(1).max(500).optional(),
  /** Short status line (e.g. payment received vs hold). */
  statusNote: z.string().min(1).max(500).optional(),
  /** When true, template may show attachment hint (PDF sent separately). */
  itineraryAttached: z.boolean().optional(),
});

export const paymentReceiptPropsSchema = z.object({
  receiptId: z.string().min(1).max(120),
  guestName: z.string().min(1).max(200),
  amount: z.string().min(1).max(80),
  paidAt: z.string().min(1).max(200),
  itemSummary: z.string().min(1).max(500),
  receiptUrl: z.string().url().optional(),
  paymentMethodLabel: z.string().max(120).optional(),
});

export const cancelPropsSchema = z.object({
  bookingReference: z.string().min(1).max(120),
  guestName: z.string().min(1).max(200),
  /** Optional short note (e.g. security). */
  summary: z.string().max(500).optional(),
  manageUrl: z.string().url().optional(),
  /** GDS / airline record locator when known. */
  airlineRecordLocator: z.string().min(1).max(64).optional(),
  /** Amount quoted for this cancellation (display string, formatted server-side). */
  refundAmountDisplay: z.string().min(1).max(80).optional(),
  /** Duffel `refund_to` (e.g. `original_form_of_payment`, `airline_credits`). */
  refundTo: z.string().min(1).max(120).optional(),
});

export const refundPropsSchema = z.object({
  refundId: z.string().min(1).max(120),
  guestName: z.string().min(1).max(200),
  amount: z.string().min(1).max(80),
  summary: z.string().max(500).optional(),
  receiptUrl: z.string().url().optional(),
});

export const contactUsPropsSchema = z.object({
  name: z.string().min(1).max(200),
  replyEmail: z.email(),
  message: z.string().min(1).max(12000),
  submittedAt: z.string().min(1).max(200),
});

const legacyWelcome = z.object({
  type: z.literal("welcome"),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  props: welcomePropsSchema,
});

const legacyOtp = z.object({
  type: z.literal("otp_verification"),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  props: otpVerificationPropsSchema,
});

const legacyPasswordReset = z.object({
  type: z.literal("password_reset"),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  props: passwordResetPropsSchema,
});

const legacyBookingConfirmation = z.object({
  type: z.literal("booking_confirmation"),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  props: bookingConfirmationPropsSchema,
});

const legacyPaymentReceipt = z.object({
  type: z.literal("payment_receipt"),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  props: paymentReceiptPropsSchema,
});

const genericRegister = z.object({
  type: z.literal(EmailKind.register),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: welcomePropsSchema,
});

const genericBooking = z.object({
  type: z.literal(EmailKind.booking),
  subType: z.nativeEnum(EmailBookingSubType),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: bookingConfirmationPropsSchema,
});

const genericForgotPassword = z.object({
  type: z.literal(EmailKind.forgotPassword),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: forgotPasswordPropsSchema,
});

const genericPaymentConfirmation = z.object({
  type: z.literal(EmailKind.paymentConfirmation),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: paymentReceiptPropsSchema,
});

const genericCancel = z.object({
  type: z.literal(EmailKind.cancel),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: cancelPropsSchema,
});

const genericRefund = z.object({
  type: z.literal(EmailKind.refund),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: refundPropsSchema,
});

const genericContactUs = z.object({
  type: z.literal(EmailKind.contactUs),
  to: z.email(),
  subject: z.string().min(1).max(200).optional(),
  data: contactUsPropsSchema,
});

/**
 * Single flexible schema: legacy `props` + generic `data` + `subType` for bookings.
 */
export const emailSendRequestSchema = z.union([
  legacyWelcome,
  legacyOtp,
  legacyPasswordReset,
  legacyBookingConfirmation,
  legacyPaymentReceipt,
  genericRegister,
  genericBooking,
  genericForgotPassword,
  genericPaymentConfirmation,
  genericCancel,
  genericRefund,
  genericContactUs,
]);

export type EmailSendRequest = z.infer<typeof emailSendRequestSchema>;

/** All valid `type` values on {@link EmailSendRequest}. */
export type EmailSendRequestType = EmailSendRequest["type"];

export function parseEmailSendRequest(body: unknown): EmailSendRequest {
  return emailSendRequestSchema.parse(body);
}

/** Supabase Send Email Hook payload (subset; extra fields allowed). */
export const supabaseSendEmailHookSchema = z.object({
  user: z
    .object({
      id: z.string().uuid(),
      email: z.email().optional(),
      user_metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
  email_data: z
    .object({
      token: z.string(),
      token_hash: z.string().optional(),
      redirect_to: z.string().optional(),
      email_action_type: z.string(),
      site_url: z.string().optional(),
    })
    .passthrough(),
});

export type SupabaseSendEmailHookPayload = z.infer<typeof supabaseSendEmailHookSchema>;
