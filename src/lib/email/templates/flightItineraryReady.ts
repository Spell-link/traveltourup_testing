import FlightItineraryReadyEmail, {
  type FlightItineraryReadyEmailProps,
} from "@/emails/templates/FlightItineraryReadyEmail";
import { renderEmailHtml } from "./renderEmailHtml";

export async function generateFlightItineraryReadyHtml(
  props: FlightItineraryReadyEmailProps,
): Promise<string> {
  return renderEmailHtml(FlightItineraryReadyEmail, props);
}
