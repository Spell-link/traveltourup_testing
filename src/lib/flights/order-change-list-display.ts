import type { FlightListDisplay } from "@/lib/flights/list-display";
import type { FlightOrderChangeOffer } from "@/lib/http/flights.client";
import {
  orderChangeOfferToListDisplay,
  orderChangeOffersToListDisplay,
} from "@/lib/flights/order-change-offer-adapter";

export type { FlightOrderChangeOffer };

/** Extended list row for change-flow results (keeps raw offer for detail/payment). */
export type FlightChangeListDisplay = FlightListDisplay & {
  changeOffer: FlightOrderChangeOffer;
  changeDelta: number;
};

export { orderChangeOfferToListDisplay, orderChangeOffersToListDisplay };
