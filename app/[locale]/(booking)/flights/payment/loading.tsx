import { FlightCheckoutPageSkeleton } from "@/components/flights/FlightSkeletons";

/** Shown instantly on navigation to `/flights/payment` while the server shell resolves. */
export default function FlightsPaymentLoading() {
  return <FlightCheckoutPageSkeleton />;
}
