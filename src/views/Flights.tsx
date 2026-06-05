import React, { Suspense } from "react";
import type { FlightsPageLayout } from "@/lib/flights/flights-page-layout";
import { HubPageH1 } from "@/components/seo/hub-page-h1";
import FlightsTab from "@/components/flights/FlightsTab";
import FlightList from "@/components/flights/FlightList";
import FeaturedFlights from "@/components/flights/FeaturedFlights";
import { FeaturedFlightsSectionFallback } from "@/components/flights/FlightSkeletons";
import { cn } from "@/lib/utils";

type Props = { layout: FlightsPageLayout };

const Flights = ({ layout }: Props): React.ReactElement => {
  const showResults = layout === "results";

  return (
    <main>
      <HubPageH1 page="Flights" />

      {/* Search card overlapping the top section */}
      {!showResults && (
        <div className="relative top-0 bg-muted p-2 sm:p-0">
          <div className="relative  sm:top-[-50px] top-[-40px]   z-20  ">
            <div id="flight-search" className="max-w-7xl  mx-auto bg-background/80 rounded-xl shadow-xl border border-border/50">
              <div className="p-4 sm:p-6">
                <FlightsTab />
              </div>
            </div>
          </div>
        </div>
      )}
      {showResults && <FlightList />}

      <Suspense fallback={<FeaturedFlightsSectionFallback bgColor="bg-muted/40" />}>
        <div className="bg-muted">
          <FeaturedFlights bgColor="bg-muted" mainPading="pt-1" />
        </div>
      </Suspense>
    </main>
  );
};

export default Flights;
