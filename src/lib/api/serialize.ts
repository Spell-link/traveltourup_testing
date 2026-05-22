import type {
  AdminCar,
  Booking,
  BookingAncillary,
  CarBooking,
  FlightBooking,
  FlightOrderCancellation,
  HotelBooking,
  Prisma,
} from "@/generated/prisma";

type Decimal = Prisma.Decimal;
import type {
  BookingWithChildren,
  BookingWithListChildren,
} from "@/lib/db/repositories/booking.repository";

function decimalToApi(value: Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

export type BookingApiShape = Omit<Booking, "total_amount"> & { total_amount: string };

export function serializeBooking<T extends Booking>(row: T): BookingApiShape {
  const { total_amount, ...rest } = row;
  return { ...rest, total_amount: decimalToApi(total_amount)! };
}

export type AdminCarApiShape = Omit<AdminCar, "price_per_day"> & { price_per_day: string };

export function serializeAdminCar<T extends AdminCar>(row: T): AdminCarApiShape {
  const { price_per_day, ...rest } = row;
  return { ...rest, price_per_day: decimalToApi(price_per_day)! };
}

type FlightBookingSerialized = FlightBooking & {
  ancillaries?: BookingAncillary[];
  orderCancellations?: FlightOrderCancellation[];
};

function serializeFlightOrderCancellationRow(row: FlightOrderCancellation) {
  return {
    id: row.id,
    flight_booking_id: row.flight_booking_id,
    order_cancellation_id: row.duffel_cancellation_id,
    duffel_order_id: row.duffel_order_id,
    status: row.status,
    refund_amount: row.refund_amount,
    refund_currency: row.refund_currency,
    refund_to: row.refund_to,
    quote_expires_at: row.quote_expires_at?.toISOString() ?? null,
    confirmed_at: row.confirmed_at?.toISOString() ?? null,
    raw: row.raw,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function serializeBookingAncillaryRow(row: BookingAncillary) {
  return {
    id: row.id,
    flight_booking_id: row.flight_booking_id,
    type: row.type,
    duffel_service_id: row.duffel_service_id,
    passenger_id: row.passenger_id,
    segment_id: row.segment_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    raw: row.raw,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeCarBookingRow(row: CarBooking) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    payload: row.payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeHotelBookingRow(row: HotelBooking) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    duffel_booking_id: row.duffel_booking_id,
    duffel_quote_id: row.duffel_quote_id,
    stays_search_result_id: row.stays_search_result_id,
    duffel_accommodation_id: row.duffel_accommodation_id,
    booking_reference: row.booking_reference,
    quote_expires_at: row.quote_expires_at?.toISOString() ?? null,
    accommodation_snapshot: row.accommodation_snapshot,
    stays_raw: row.stays_raw,
    payload: row.payload,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeFlightBookingRow(row: FlightBookingSerialized) {
  const ticketReady = Boolean(row.ticket_pdf_storage_path);
  const ticketGenerationFailed =
    Boolean(row.ticket_pdf_generation_failed_at) && !row.ticket_pdf_storage_path;
  return {
    id: row.id,
    booking_id: row.booking_id,
    duffel_order_id: row.duffel_order_id,
    duffel_offer_id: row.duffel_offer_id,
    duffel_offer_request_id: row.duffel_offer_request_id,
    booking_reference: row.booking_reference,
    live_mode: row.live_mode,
    last_offer_total_amount: decimalToApi(row.last_offer_total_amount),
    last_offer_total_currency: row.last_offer_total_currency,
    offer_expires_at: row.offer_expires_at?.toISOString() ?? null,
    itinerary_snapshot: row.itinerary_snapshot,
    order_raw: row.order_raw,
    payload: row.payload,
    ancillaries: (row.ancillaries ?? []).map(serializeBookingAncillaryRow),
    order_cancellations: (row.orderCancellations ?? []).map(serializeFlightOrderCancellationRow),
    ticket_ready: ticketReady,
    ticket_generated_at: row.ticket_pdf_generated_at?.toISOString() ?? null,
    ticket_generation_failed: ticketGenerationFailed,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeBookingWithRelations(row: BookingWithChildren) {
  const { flightBooking, hotelBooking, carBooking, ...bookingRow } = row;
  return {
    ...serializeBooking(bookingRow),
    flight_booking: flightBooking ? serializeFlightBookingRow(flightBooking) : null,
    hotel_booking: hotelBooking ? serializeHotelBookingRow(hotelBooking) : null,
    car_booking: carBooking ? serializeCarBookingRow(carBooking) : null,
  };
}

/** List API: omit `order_raw`, ancillaries, cancellations, and `stays_raw` / hotel `payload`. */
export function serializeFlightBookingListRow(
  row: NonNullable<BookingWithListChildren["flightBooking"]>,
) {
  const ticketReady = Boolean(row.ticket_pdf_storage_path);
  const ticketGenerationFailed =
    Boolean(row.ticket_pdf_generation_failed_at) && !row.ticket_pdf_storage_path;
  return {
    id: row.id,
    booking_id: row.booking_id,
    duffel_order_id: row.duffel_order_id,
    duffel_offer_id: row.duffel_offer_id,
    duffel_offer_request_id: row.duffel_offer_request_id,
    booking_reference: row.booking_reference,
    live_mode: row.live_mode,
    last_offer_total_amount: decimalToApi(row.last_offer_total_amount),
    last_offer_total_currency: row.last_offer_total_currency,
    offer_expires_at: row.offer_expires_at?.toISOString() ?? null,
    itinerary_snapshot: row.itinerary_snapshot,
    ticket_ready: ticketReady,
    ticket_generated_at: row.ticket_pdf_generated_at?.toISOString() ?? null,
    ticket_generation_failed: ticketGenerationFailed,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeHotelBookingListRow(
  row: NonNullable<BookingWithListChildren["hotelBooking"]>,
) {
  return {
    id: row.id,
    booking_id: row.booking_id,
    duffel_booking_id: row.duffel_booking_id,
    duffel_quote_id: row.duffel_quote_id,
    stays_search_result_id: row.stays_search_result_id,
    duffel_accommodation_id: row.duffel_accommodation_id,
    booking_reference: row.booking_reference,
    quote_expires_at: row.quote_expires_at?.toISOString() ?? null,
    accommodation_snapshot: row.accommodation_snapshot,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeBookingListWithRelations(row: BookingWithListChildren) {
  const { flightBooking, hotelBooking, carBooking, ...bookingRow } = row;
  return {
    ...serializeBooking(bookingRow),
    flight_booking: flightBooking ? serializeFlightBookingListRow(flightBooking) : null,
    hotel_booking: hotelBooking ? serializeHotelBookingListRow(hotelBooking) : null,
    car_booking: carBooking ? serializeCarBookingRow(carBooking) : null,
  };
}
