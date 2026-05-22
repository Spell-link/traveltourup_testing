"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import HeroSection from "@/components/shared/HeroSection";
import AboutPageHistoryAnimation from "@/components/ui/AboutPageHistoryAnimation";
import { useAboutHistoryCard } from "@/components/About";
import { Card } from "@/components/ui";
import AboutAchievements from "@/components/ui/AboutAchievements";
import AnimatedReviews from "@/components/ui/AnimatedReviews";
import FaqS from "@/components/FaqS";
const FeaturedHotelsWithFetch = dynamic(() => import("@/components/hotels/FeaturedHotelsWithFetch"), {
  loading: () => <div className="py-10 bg-muted min-h-[200px] animate-pulse rounded-lg" />,
});
const Categories = dynamic(() => import("@/components/Categories"), {
  loading: () => <div className="py-8 bg-background min-h-[300px] animate-pulse rounded-lg" />,
});
const FeaturedFlights = dynamic(() => import("@/components/flights/FeaturedFlightsWithFetch"), {
  loading: () => <div className="py-10 bg-muted min-h-[200px] animate-pulse rounded-lg" />,
});
const RecommendedCars = dynamic(() => import("@/components/cars/RecommendedCars"), {
  loading: () => <div className="py-8 bg-background min-h-[200px] animate-pulse rounded-lg" />,
});
const StatsSection = dynamic(() => import("@/components/StatsSection"), {
  loading: () => <div className="py-8 md:py-16   bg-card min-h-[150px] animate-pulse rounded-lg" />,
});
const HOTEL_IMAGES = {
  hotel1: "/images/hotels/hotel1.jpg",
  hotel2: "/images/hotels/hotel2.jpg",
  hotel3: "/images/hotels/hotel3.jpg",
  hotel4: "/images/hotels/hotel4.jpg",
  hotel5: "/images/hotels/hotel5.png",
  hotel6: "/images/hotels/hotel6.jpg",
  featured: "/images/hotels/featuredhotels.jpg",
} as const;

const HOTEL_IMAGE_ORDER = [
  HOTEL_IMAGES.hotel1,
  HOTEL_IMAGES.hotel2,
  HOTEL_IMAGES.hotel3,
  HOTEL_IMAGES.hotel4,
  HOTEL_IMAGES.hotel5,
  HOTEL_IMAGES.hotel6,
] as const;

const CATEGORY_IMAGES = {
  beach: "/images/categories/category.jpg",
  desert: "/images/categories/category1.jpg",
  mountain: "/images/categories/category2.jpg",
  temple: "/images/categories/category3.jpg",
  tower: "/images/categories/category4.jpg",
  pyramid: "/images/categories/category5.jpg",
  city: "/images/categories/category6.jpg",
  forest: "/images/categories/category7.jpg",
  waterfall: "/images/categories/category8.jpg",
  lake: "/images/categories/category9.jpg",
  island: "/images/categories/category10.jpg",
  canyon: "/images/categories/category11.jpg",
} as const;

const CAR_IMAGES = {
  car1: "/images/cars/car1.jpg",
  car2: "/images/cars/car2.jpg",
  car3: "/images/cars/car3.jpg",
  car4: "/images/cars/car4.jpg",
  car5: "/images/cars/car5.jpg",
  car6: "/images/cars/car6.jpg",
  car7: "/images/cars/car7.jpg",
  car8: "/images/cars/car8.jpg",
  featured: "/images/cars/featuredcars.jpg",
} as const;

const CAR_IMAGE_ORDER = [
  CAR_IMAGES.car1,
  CAR_IMAGES.car2,
  CAR_IMAGES.car6,
  CAR_IMAGES.car5,
  CAR_IMAGES.car8,
  CAR_IMAGES.car7,
  CAR_IMAGES.car6,
  CAR_IMAGES.car5,
] as const;

const featuredAd = {
  image: HOTEL_IMAGES.featured,
};

type HomeHotelMsg = {
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: string;
  facilities: string[];
};

type HomeCarMsg = {
  name: string;
  type: string;
  passengers: number;
  luggage: number;
  price: number;
  originalPrice: number;
  features: string[];
};

type HomeViewProps = {
  blogSection?: React.ReactNode;
};

const HomeView = ({ blogSection }: HomeViewProps): React.ReactElement => {
  const tHome = useTranslations("Home");
  const historyCardData = useAboutHistoryCard();

  const hotelsData = useMemo(() => {
    const raw = tHome.raw("hotels") as HomeHotelMsg[];
    return raw.map((h, i) => ({
      id: i + 1,
      ...h,
      image: HOTEL_IMAGE_ORDER[i] ?? HOTEL_IMAGE_ORDER[0]!,
    }));
  }, [tHome]);

  const categoriesData = useMemo(() => {
    const raw = tHome.raw("categories") as Array<{ key: string; name: string }>;
    return raw.map((c, i) => ({
      id: i + 1,
      name: c.name,
      image: CATEGORY_IMAGES[c.key as keyof typeof CATEGORY_IMAGES],
    }));
  }, [tHome]);

  const featuredCarData = useMemo(() => {
    const fc = tHome.raw("featuredCar") as {
      title: string;
      description: string;
      buttonText: string;
    };
    return { ...fc, image: CAR_IMAGES.featured };
  }, [tHome]);

  const carsData = useMemo(() => {
    const raw = tHome.raw("cars") as HomeCarMsg[];
    return raw.map((c, i) => ({
      id: i + 1,
      ...c,
      image: CAR_IMAGE_ORDER[i] ?? CAR_IMAGE_ORDER[0]!,
    }));
  }, [tHome]);

  return (
    <div>
      <HeroSection />
      <section className="bg-muted/60">
        <div className="px-4 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 items-stretch container mx-auto">
          <div className="lg:col-span-6 h-full flex">
            <Card variant="history" data={historyCardData} className="my-auto w-full" />
          </div>

          <div className="lg:col-span-6 h-full flex">
            <AboutPageHistoryAnimation />
          </div>
        </div>
      </section>
      <FeaturedFlights />
      <FeaturedHotelsWithFetch fallbackHotels={hotelsData} featuredAd={featuredAd} bgColor="bg-muted/60"/>
      <RecommendedCars featuredCar={featuredCarData} cars={carsData} />
      <Categories categories={categoriesData} />
      {blogSection}
      <StatsSection />
      <section className="py-8 md:py-16   bg-muted ">
        <AboutAchievements />
      </section>
      <section className="bg-muted/40">
        <AnimatedReviews />
      </section>
      <section className="bg-muted">
        <FaqS limit={3} />
      </section>
    </div>
  );
};

export default HomeView;
