import { Suspense } from "react";

import { FlightsRouteLoadingPicker } from "@/components/flights/FlightsRouteLoadingPicker";

export default function FlightsLoading() {
  return (
    <Suspense>
      <FlightsRouteLoadingPicker />
    </Suspense>
  );
}
