export type FlightOfferTripType = "single" | "round_trip" | "multi_city";

export function getFlightOfferTripType(sliceCount: number): FlightOfferTripType {
  if (sliceCount <= 1) return "single";
  if (sliceCount === 2) return "round_trip";
  return "multi_city";
}
