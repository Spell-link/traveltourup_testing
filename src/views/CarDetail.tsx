"use client";

import React from "react";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebar } from "@/components/shared/BookingSidebar";
import { ReviewsSection } from "@/components/shared/ReviewsSection";
import { CarDetailContent } from "@/components/cars/CarDetailContent";
import type { CarListing } from "@/types";

export interface CarDetailProps {
  car: CarListing;
}

/**
 * Car detail page view.
 * Uses DetailPageLayout with CarDetailContent, BookingSidebar, ReviewsSection.
 */
export default function CarDetail({ car }: CarDetailProps) {
  const bookingItem = {
    id: car.id,
    price: car.totalPrice,
    currency: "USD",
    name: car.name,
    type: car.type,
    supplier: car.supplier,
  };

  // Car rating is typically 0-10, normalize to 1-5 for star display
  const starRating = car.rating / 2;

  return (
    <DetailPageLayout
      mainContent={
        <div>
          <CarDetailContent car={car} />
        </div>
      }
      sidebarContent={
        <BookingSidebar item={bookingItem} type="car" />
      }
      bottomContent={
        <ReviewsSection
          itemId={car.id}
          rating={starRating}
          itemType="car"
        />
      }
    />
  );
}
