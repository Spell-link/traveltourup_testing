import type { StaysBookingDisplay, StaysBookingGuestDisplay } from "@/lib/stays/stays-booking-display";

export type StaysTravelerSections = {
  guests: StaysBookingGuestDisplay[];
  contactEmail: string | null;
  contactPhone: string | null;
  specialRequests: string | null;
  loyaltyProgrammeAccountNumber: string | null;
};

export function buildStaysTravelerSections(display: StaysBookingDisplay): StaysTravelerSections {
  return {
    guests: display.guests,
    contactEmail: display.contactEmail,
    contactPhone: display.contactPhone,
    specialRequests: display.specialRequests,
    loyaltyProgrammeAccountNumber: display.loyaltyProgrammeAccountNumber,
  };
}

export function formatGuestNamesComma(guests: StaysBookingGuestDisplay[]): string {
  return guests.map((g) => g.fullName).filter(Boolean).join(", ");
}

export function formatGuestNamesMultiline(guests: StaysBookingGuestDisplay[]): string {
  return guests
    .map((g) => {
      const lines = [g.fullName];
      if (g.bornOn) lines.push(`DOB: ${g.bornOn}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

export function hasTravelerOrContactContent(sections: StaysTravelerSections): boolean {
  return (
    sections.guests.length > 0 ||
    Boolean(sections.contactEmail) ||
    Boolean(sections.contactPhone) ||
    Boolean(sections.specialRequests) ||
    Boolean(sections.loyaltyProgrammeAccountNumber)
  );
}

export function hasAdditionalInfo(sections: StaysTravelerSections): boolean {
  return Boolean(sections.specialRequests) || Boolean(sections.loyaltyProgrammeAccountNumber);
}
