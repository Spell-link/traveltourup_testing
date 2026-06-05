import { EmailBookingSubType, EmailType } from "@/types/email";

/** Minimal valid `data` payloads for manual testing (recipient comes from the form `to` field). */
export function sampleDataForEmail(type: EmailType, subType: EmailBookingSubType | undefined, recipientEmail: string): unknown {
  switch (type) {
    case EmailType.register:
      return {
        firstName: "Test",
        lastName: "Traveler",
        appUrl: "https://traveltourup.com",
      };
    case EmailType.booking:
      return {
        bookingReference: "TTU-TEST-001",
        guestName: "Test Traveler",
        destination:
          subType === EmailBookingSubType.hotel
            ? "Kyoto"
            : subType === EmailBookingSubType.car
              ? "LAX"
              : "LHR → JFK",
        dates:
          subType === EmailBookingSubType.hotel
            ? "Check-in: Mon, May 18, 2026\nCheck-out: Wed, May 20, 2026"
            : "Departure: Mon, May 18, 2026, 10:00 AM\nReturn: Mon, May 25, 2026, 3:00 PM",
        total: "USD 406.82",
        manageUrl: "https://traveltourup.com/profile/bookings/sample-booking-id",
        airlineRecordLocator:
          subType === EmailBookingSubType.flight
            ? "X9ABC1"
            : subType === EmailBookingSubType.hotel
              ? "HTL-88421"
              : undefined,
        passengersSummary: "Test Traveler",
        statusNote:
          subType === EmailBookingSubType.flight
            ? "Your payment was received. Your itinerary and booking references below match what you booked."
            : subType === EmailBookingSubType.hotel
              ? "Your payment was received and your stay is confirmed. Present hotel confirmation HTL-88421 at check-in along with photo ID."
              : undefined,
      };
    case EmailType.paymentConfirmation:
      return {
        receiptId: "RCPT-TEST-001",
        guestName: "Test Traveler",
        amount: "USD 499.00",
        paidAt: new Date().toISOString(),
        itemSummary: "Sample itinerary — TravelTourUp test",
        receiptUrl: "https://traveltourup.com/receipts/RCPT-TEST-001",
        paymentMethodLabel: "Card",
      };
    case EmailType.cancel:
      return {
        bookingReference: "TTU-TEST-001",
        guestName: "Test Traveler",
        summary:
          "If you did not request this cancellation, contact us immediately at support@traveltourup.com with your booking reference.",
        manageUrl: "https://traveltourup.com/profile/bookings/sample-booking-id",
        airlineRecordLocator: "X9ABC1",
        refundAmountDisplay: "USD 218.58",
        refundTo: "original_form_of_payment",
      };
    case EmailType.refund:
      return {
        refundId: "REF-TEST-001",
        guestName: "Test Traveler",
        amount: "USD 499.00",
        summary: "Sample refund — test email",
        receiptUrl: "https://traveltourup.com/refunds/REF-TEST-001",
      };
    case EmailType.contactUs:
      return {
        name: "Test Traveler",
        replyEmail: recipientEmail,
        message: "This is a test message from the TravelTourUp email test page.",
        submittedAt: new Date().toLocaleString(),
      };
    case EmailType.forgotPassword:
      return {
        resetUrl: "https://traveltourup.com/auth/reset?token=test-token",
        expiresInMinutes: 60,
        firstName: "Test",
      };
  }
}
