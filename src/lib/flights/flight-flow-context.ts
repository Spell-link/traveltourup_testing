import type { OriginalBookingContext } from "@/lib/flights/flow-variant";

export type FlightFlowContext =
  | { variant: "new-booking" }
  | {
      variant: "change-flight";
      bookingId: string;
      originalBooking: OriginalBookingContext;
      changeId?: string;
    };

export const NEW_BOOKING_FLOW: FlightFlowContext = { variant: "new-booking" };

export function isChangeFlightFlow(
  ctx: FlightFlowContext | undefined,
): ctx is Extract<FlightFlowContext, { variant: "change-flight" }> {
  return ctx?.variant === "change-flight";
}

export function defaultFlowContext(ctx?: FlightFlowContext): FlightFlowContext {
  return ctx ?? NEW_BOOKING_FLOW;
}
