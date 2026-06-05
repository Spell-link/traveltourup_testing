import type { HotelRoom } from "@/data/mock-hotels";
import type { StaysQuoteSessionContext } from "@/lib/stays/stays-quote-session";
import { readStaysSearchFormSnapshot } from "@/lib/hotels/stays-search-snapshot";

export function buildStaysQuoteSessionContext(input: {
  hotelName: string;
  hotelAddress?: string;
  room?: HotelRoom | null;
}): StaysQuoteSessionContext {
  const snap = readStaysSearchFormSnapshot();
  const room = input.room;
  return {
    adults: snap?.adults ?? 1,
    children: snap?.children ?? 0,
    rooms: snap?.rooms ?? 1,
    hotel_name: input.hotelName,
    hotel_address: input.hotelAddress,
    room_name: room?.name,
    board_type: room?.boardType ?? null,
    payment_type: room?.paymentType ?? null,
    cancellation_timeline: room?.cancellationTimeline,
    supported_loyalty_programme: room?.supportedLoyaltyProgramme ?? null,
  };
}
