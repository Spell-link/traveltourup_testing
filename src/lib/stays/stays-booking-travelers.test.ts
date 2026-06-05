import { describe, expect, it } from "vitest";

import { parseStaysBookingDisplay } from "@/lib/stays/stays-booking-display";
import {
  buildStaysTravelerSections,
  formatGuestNamesComma,
  hasAdditionalInfo,
} from "@/lib/stays/stays-booking-travelers";

describe("stays-booking-travelers", () => {
  it("formats guest names and detects additional info", () => {
    const display = parseStaysBookingDisplay({
      staysRaw: null,
      accommodationSnapshot: null,
      guestData: {
        guests: [
          { given_name: "A", family_name: "One" },
          { given_name: "B", family_name: "Two" },
        ],
        accommodation_special_requests: "Quiet room",
      },
      bookingReference: null,
      duffelBookingId: null,
      totalAmount: "100",
      totalCurrency: "USD",
      createdAt: null,
      status: "confirmed",
    });

    const sections = buildStaysTravelerSections(display);
    expect(formatGuestNamesComma(sections.guests)).toBe("A One, B Two");
    expect(hasAdditionalInfo(sections)).toBe(true);
  });
});
