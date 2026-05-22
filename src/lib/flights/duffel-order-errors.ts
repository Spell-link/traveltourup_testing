import type { DuffelApiError } from "@/lib/duffel/errors";

/** User-safe explanation for common Duffel order failures (shown after payment when applicable). */
export function duffelOrderFailureUserMessage(error: DuffelApiError): string {
  if (error.hasDuffelErrorCode("invalid_phone_number")) {
    return "The contact phone number was rejected by the airline. Use a valid mobile or landline number with country code (e.g. +442080160509).";
  }
  if (error.hasDuffelErrorCode("at_least_one_adult_for_each_infant")) {
    return "Each infant must travel with an accompanying adult. Select which adult is responsible for the infant.";
  }
  return error.clientMessage;
}

/** Whether every mapped Duffel passenger row includes contact fields required by Duffel. */
export function duffelPassengersMissingContact(
  passengers: Record<string, unknown>[],
): "phone" | "email" | null {
  for (const row of passengers) {
    const email = typeof row.email === "string" ? row.email.trim() : "";
    const phone = typeof row.phone_number === "string" ? row.phone_number.trim() : "";
    if (!email) return "email";
    if (!phone) return "phone";
  }
  return null;
}
