import type { FlightOfferDTO } from "@/lib/duffel/dto/flight-offer.dto";
import type { FlightListDisplay } from "@/lib/flights/list-display";
import type { FlightOrderChangeSliceOption } from "@/lib/http/flights.client";

export type FlowVariant = "new-booking" | "change-flight";

export type ChangePolicyInfo = {
  allowed: boolean;
  message: string;
};

export type OriginalBookingContext = {
  bookingId: string;
  bookingRefNo: string;
  flight: FlightListDisplay;
  offer: FlightOfferDTO | null;
  totalAmount: number;
  currency: string;
  itinerarySnapshot: unknown;
  orderRaw: unknown;
  /** Duffel slice being replaced */
  selectedSliceId: string;
  selectedSliceIndex: number;
  sliceOptions: FlightOrderChangeSliceOption[];
  changePolicy: ChangePolicyInfo;
};

export function isChangeFlow(variant: FlowVariant | undefined): boolean {
  return variant === "change-flight";
}
