import React, { Suspense } from "react";
import type { FlightsPageLayout } from "@/lib/flights/flights-page-layout";
import { HubPageH1 } from "@/components/seo/hub-page-h1";
import FlightsTab from "@/components/flights/FlightsTab";
import FlightList from "@/components/flights/FlightList";
import FeaturedFlights from "@/components/flights/FeaturedFlights";
import { FeaturedFlightsSectionFallback } from "@/components/flights/FlightSkeletons";

type Props = { layout: FlightsPageLayout };

const Flights = ({ layout }: Props): React.ReactElement => {
  const showResults = layout === "results";

  return (
    <div>
      <main>
        <HubPageH1 page="Flights" />
        {!showResults ? (
          <div id="flight-search" className="bg-muted pt-10 px-4 md:px-10 scroll-mt-16">
            <FlightsTab />
          </div>
        ) : null}
        {showResults ? <FlightList /> : null}
        <Suspense fallback={<FeaturedFlightsSectionFallback bgColor="bg-muted/40" />}>
          <FeaturedFlights bgColor="bg-muted/40" />
        </Suspense>
      </main>
    </div>
  );
};

export default Flights;
