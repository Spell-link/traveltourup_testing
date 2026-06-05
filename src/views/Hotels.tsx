import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { HubPageH1 } from "@/components/seo/hub-page-h1";
import type { HotelsPageLayout } from "@/lib/hotels/hotels-page-layout";
import FeaturedHotelsWithFetch from "@/components/hotels/FeaturedHotelsWithFetch";
import { HotelsResultsLoadingShell } from "@/components/hotels/HotelsResultsLoadingShell";

const hotelsData = [
  { id: 1, name: "Luxury Beach Resort & Spa", location: "Bali, Indonesia", price: 299, rating: 4.8, reviews: "1.2k", image: "/images/assets/hotel1.jpg", facilities: ["WiFi", "Pool", "Spa", "Gym"] },
  { id: 2, name: "Grand Palace Hotel", location: "Paris, France", price: 320, rating: 4.9, reviews: "892", image: "/images/assets/hotel2.jpg", facilities: ["WiFi", "Restaurant", "Bar", "Spa"] },
  { id: 3, name: "Ocean View Paradise Resort", location: "Maldives", price: 450, rating: 4.7, reviews: "1.5k", image: "/images/assets/hotel3.jpg", facilities: ["Beach", "Pool", "Spa", "Diving"] },
  { id: 4, name: "Mountain Peak Retreat", location: "Swiss Alps", price: 280, rating: 4.6, reviews: "734", image: "/images/assets/hotel4.jpg", facilities: ["Skiing", "Spa", "Fireplace", "WiFi"] },
  { id: 5, name: "Urban Luxury Suites", location: "New York, USA", price: 380, rating: 4.8, reviews: "2.1k", image: "/images/assets/hotel5.png", facilities: ["WiFi", "Gym", "Bar", "Conference"] },
  { id: 6, name: "Desert Oasis Resort", location: "Dubai, UAE", price: 420, rating: 4.9, reviews: "1.8k", image: "/images/assets/hotel6.jpg", facilities: ["Pool", "Spa", "Golf", "Beach"] },
];

const featuredAd = {
  image: "/images/assets/featuredhotels.jpg",
};

const HotelsList = dynamic(() => import("@/components/hotels/HotelsList"), {
  loading: () => <HotelsResultsLoadingShell />,
});

const featuredFallback = (
  <div className="py-10 bg-muted/40">
    <div className="container mx-auto px-4 min-h-[200px] animate-pulse rounded-xl bg-muted/60" />
  </div>
);

const HotelsTab = dynamic(() => import("@/components/hotels/HotelsTab"), {
  ssr: true,
  loading: () => (
    <div className="bg-muted px-4 pt-10 md:px-10">
      <div className="rounded-xl border border-border/60 bg-background/80 p-6 min-h-[280px] animate-pulse" />
    </div>
  ),
});

type Props = { layout: HotelsPageLayout };

const Hotels = ({ layout }: Props): React.ReactElement => {
  const showResults = layout === "results";

  return (
 
      <main>
        <HubPageH1 page="Hotels" />
        {!showResults ? (
           <div className="relative sm:top-0 bg-muted p-2 sm:p-0">
          <div className="relative  top-[-40px]   z-20  ">
          <div id="hotel-search" className="max-w-7xl  mx-auto bg-background/80 rounded-xl shadow-xl border border-border/50">
            <div className="p-4 sm:p-6">
            <HotelsTab layout={layout} />
            </div>
          </div>
          </div>
          </div>
        ) : null}
        {showResults ? <HotelsList /> : null}
        <Suspense fallback={featuredFallback}>
        <div className=" bg-muted">

          <FeaturedHotelsWithFetch fallbackHotels={hotelsData} featuredAd={featuredAd} bgColor="bg-muted/40" mainPading="pt-1" />
          </div>
        </Suspense>
      </main>
  
  );
};

export default Hotels;
