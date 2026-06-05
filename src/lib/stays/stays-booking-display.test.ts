import { describe, expect, it } from "vitest";

import { parseStaysBookingDisplay } from "@/lib/stays/stays-booking-display";

describe("parseStaysBookingDisplay billing", () => {
  it("uses checkout payment for room, service fee, and total paid", () => {
    const display = parseStaysBookingDisplay({
      staysRaw: {
        data: {
          due_at_accommodation_amount: "50.00",
          due_at_accommodation_currency: "USD",
          total_amount: "973.00",
          total_currency: "USD",
        },
      },
      accommodationSnapshot: null,
      guestData: {
        email: "guest@example.com",
        guests: [{ given_name: "Ada", family_name: "Lovelace" }],
        customer_charge: { amount: "1187.00", currency: "USD" },
        accommodation_special_requests: "High floor",
        loyalty_programme_account_number: "LY123",
      },
      bookingReference: "HOTEL-1",
      duffelBookingId: "duf_1",
      totalAmount: "973.00",
      totalCurrency: "USD",
      createdAt: "2026-06-01T12:00:00Z",
      status: "confirmed",
      checkoutPayment: {
        supplier_amount: "973.00",
        supplier_currency: "USD",
        markup_amount: "214.00",
        charge_amount: "1187.00",
        charge_currency: "USD",
      },
    });

    expect(display.billing.supplierAmount).toBe("973.00");
    expect(display.billing.serviceFeeAmount).toBe("214.00");
    expect(display.billing.totalPaidAmount).toBe("1187.00");
    expect(display.billing.dueAtAccommodationAmount).toBe("50.00");
    expect(display.specialRequests).toBe("High floor");
    expect(display.loyaltyProgrammeAccountNumber).toBe("LY123");
    expect(display.guests).toHaveLength(1);
  });

  it("falls back to customer_charge when checkout payment is missing", () => {
    const display = parseStaysBookingDisplay({
      staysRaw: null,
      accommodationSnapshot: null,
      guestData: {
        customer_charge: { amount: "500.00", currency: "EUR" },
      },
      bookingReference: null,
      duffelBookingId: null,
      totalAmount: "450.00",
      totalCurrency: "EUR",
      createdAt: null,
      status: "confirmed",
    });

    expect(display.billing.totalPaidAmount).toBe("500.00");
    expect(display.billing.totalPaidCurrency).toBe("EUR");
  });
});
