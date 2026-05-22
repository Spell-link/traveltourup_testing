/**
 * Maps canonical `EmailType` (+ `EmailBookingSubType` when type is `booking`) to React Email HTML.
 * Uses switch/case; throws on invalid combinations or malformed data (Zod runs here per branch).
 */

import { EmailBookingSubType, EmailType } from "@/types/email";
import {
  bookingConfirmationPropsSchema,
  cancelPropsSchema,
  contactUsPropsSchema,
  forgotPasswordPropsSchema,
  paymentReceiptPropsSchema,
  refundPropsSchema,
  welcomePropsSchema,
} from "@/lib/validations/email.schema";
import { generateBookingConfirmationHtml } from "@/lib/email/templates/bookingConfirmation";
import { generateCancelBookingHtml } from "@/lib/email/templates/cancelBooking";
import { generateContactUsHtml } from "@/lib/email/templates/contactUs";
import { generatePaymentReceiptHtml } from "@/lib/email/templates/paymentReceipt";
import { generatePasswordResetHtml } from "@/lib/email/templates/passwordReset";
import { generateRefundHtml } from "@/lib/email/templates/refund";
import { generateWelcomeHtml } from "@/lib/email/templates/welcomeRegister";

function bookingSubTypeToProductLabel(subType: EmailBookingSubType): string {
  switch (subType) {
    case EmailBookingSubType.flight:
      return "Flight";
    case EmailBookingSubType.hotel:
      return "Hotel";
    case EmailBookingSubType.car:
      return "Car";
    default: {
      const _exhaustive: never = subType;
      throw new Error(`Invalid EmailBookingSubType: ${_exhaustive}`);
    }
  }
}

/**
 * Default subject lines when the API does not pass `subject`.
 */
function defaultSubjectForBooking(destination: string, bookingReference: string): string {
  return `Booking confirmed — ${destination} (${bookingReference})`;
}

/**
 * Resolves template + default subject for generic (`EmailType`) requests.
 * @throws Error if `type`/`subType` is invalid or `data` fails validation.
 */
export async function resolveTemplate(
  type: EmailType,
  subType: EmailBookingSubType | undefined,
  data: unknown,
): Promise<{ subject: string; html: string }> {
  switch (type) {
    case EmailType.register: {
      const props = welcomePropsSchema.parse(data);
      const html = await generateWelcomeHtml(props);
      return { subject: "Welcome to TravelTourUp", html };
    }
    case EmailType.forgotPassword: {
      const props = forgotPasswordPropsSchema.parse(data);
      const html = await generatePasswordResetHtml(props);
      return { subject: "Reset your TravelTourUp password", html };
    }
    case EmailType.paymentConfirmation: {
      const props = paymentReceiptPropsSchema.parse(data);
      const html = await generatePaymentReceiptHtml(props);
      return { subject: `Payment receipt ${props.receiptId} — TravelTourUp`, html };
    }
    case EmailType.cancel: {
      const props = cancelPropsSchema.parse(data);
      const html = await generateCancelBookingHtml(props);
      return { subject: `Cancellation confirmed — ${props.bookingReference}`, html };
    }
    case EmailType.refund: {
      const props = refundPropsSchema.parse(data);
      const html = await generateRefundHtml(props);
      return { subject: `Refund processed — ${props.refundId}`, html };
    }
    case EmailType.contactUs: {
      const props = contactUsPropsSchema.parse(data);
      const html = await generateContactUsHtml(props);
      return { subject: "We received your message — TravelTourUp", html };
    }
    case EmailType.booking: {
      if (subType === undefined) {
        throw new Error("EmailType.booking requires subType (flight | hotel | car)");
      }
      const props = bookingConfirmationPropsSchema.parse(data);
      const productLabel = bookingSubTypeToProductLabel(subType);
      const html = await generateBookingConfirmationHtml({
        ...props,
        productLabel,
      });
      return {
        subject: defaultSubjectForBooking(props.destination, props.bookingReference),
        html,
      };
    }
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported EmailType: ${_exhaustive}`);
    }
  }
}
