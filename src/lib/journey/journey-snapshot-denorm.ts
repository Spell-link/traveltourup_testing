import type { JourneyTripSnapshot } from "@/lib/journey/journey-trip-snapshot";
import { formatTravelersSummary } from "@/lib/journey/journey-trip-snapshot";

export type JourneyInterestDenormFields = {
  origin_label: string | null;
  destination_label: string | null;
  start_date: string | null;
  end_date: string | null;
  travelers_summary: string | null;
  trip_type: string | null;
};

export function denormFieldsFromSnapshot(
  snapshot: JourneyTripSnapshot | null | undefined,
): JourneyInterestDenormFields {
  if (!snapshot) {
    return {
      origin_label: null,
      destination_label: null,
      start_date: null,
      end_date: null,
      travelers_summary: null,
      trip_type: null,
    };
  }

  if (snapshot.product_type === "hotel") {
    return {
      origin_label: snapshot.hotel_name?.trim() || null,
      destination_label: snapshot.location_label?.trim() || null,
      start_date: snapshot.start_date?.trim() || null,
      end_date: snapshot.end_date?.trim() || null,
      travelers_summary: formatTravelersSummary(snapshot) || null,
      trip_type: null,
    };
  }

  return {
    origin_label: snapshot.origin_label?.trim() || snapshot.origin_code?.trim() || null,
    destination_label:
      snapshot.destination_label?.trim() || snapshot.destination_code?.trim() || null,
    start_date: snapshot.start_date?.trim() || null,
    end_date: snapshot.end_date?.trim() || null,
    travelers_summary: formatTravelersSummary(snapshot) || null,
    trip_type: snapshot.trip_type?.trim() || null,
  };
}
