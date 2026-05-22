import "server-only";

import { sendEmail } from "@/lib/email/sendEmail";
import { generateContactAdminHtml } from "@/lib/email/templates/contact-admin";

export type SendContactMessageInput = {
  name: string;
  email: string;
  message: string;
  userId: string | null;
  submissionId: string;
};

/**
 * Sends the contact form to the admin inbox.
 * Uses `ADMIN_EMAIL` when set; otherwise `EMAIL_FROM` so local/dev works with one env.
 * Caller must pass Zod-validated input.
 */
export async function sendContactMessage(input: SendContactMessageInput): Promise<void> {
  const to =
    process.env.ADMIN_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "";
  if (!to) {
    throw new Error("Set ADMIN_EMAIL or EMAIL_FROM for contact delivery");
  }

  const html = generateContactAdminHtml({
    name: input.name,
    email: input.email,
    message: input.message,
    userId: input.userId,
    submissionId: input.submissionId,
  });

  await sendEmail({
    to,
    subject: "New Contact Form Submission",
    html,
    replyTo: input.email,
  });
}
