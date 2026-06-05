"use client";

import React, { useState, useMemo, useEffect } from "react";
import { DetailPageLayout } from "@/components/shared/DetailPageLayout";
import { BookingSidebar } from "@/components/shared/BookingSidebar";
import { ReviewsSection } from "@/components/shared/ReviewsSection";
import { HotelDetailContent } from "@/components/hotels/HotelDetailContent";
import type { MockHotel, HotelRoom } from "@/data/mock-hotels";
import { getDefaultRooms } from "@/data/mock-hotels";
import { useBookingBreadcrumbHotelTitle } from "@/components/shared/BookingBreadcrumbHotelContext";

export interface HotelDetailProps {
  hotel: MockHotel;
}

/**
 * Hotel detail page view.
 * Uses DetailPageLayout with HotelDetailContent, BookingSidebar, ReviewsSection.
 */
export default function HotelDetail({ hotel }: HotelDetailProps) {
  const { setHotelDetailCrumbLabel } = useBookingBreadcrumbHotelTitle();
  const [selectedRooms, setSelectedRooms] = useState<HotelRoom[]>([]);

  useEffect(() => {
    setHotelDetailCrumbLabel(hotel.name);
    return () => setHotelDetailCrumbLabel(null);
  }, [hotel.name, setHotelDetailCrumbLabel]);

  const rooms = hotel.rooms ?? getDefaultRooms(hotel) ?? [];
  const basePrice = hotel.totalPrice ?? hotel.price;

  const handleAddRoom = (room: HotelRoom) => {
    setSelectedRooms((prev) => [...prev, room]);
  };

  const handleRemoveRoom = (room: HotelRoom) => {
    setSelectedRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === room.id);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const bookingItem = useMemo(
    () => ({
      id: hotel.id,
      price: basePrice,
      currency: hotel.currency,
      name: hotel.name,
      address: hotel.address,
    }),
    [hotel.id, hotel.currency, hotel.name, hotel.address, basePrice]
  );

  // Hotel rating is typically 0-10, normalize to 1-5 for star display
  const starRating = hotel.rating / 2;

  return (
    <DetailPageLayout
      mainContent={
        <div>
          <HotelDetailContent
            hotel={hotel}
            selectedRooms={selectedRooms}
            onAddRoom={handleAddRoom}
            onRemoveRoom={handleRemoveRoom}
          />
        </div>
      }
      sidebarContent={
        <BookingSidebar item={bookingItem} type="hotel" selectedRooms={selectedRooms} availableRooms={rooms} />
      }
      bottomContent={
        <ReviewsSection
          itemId={hotel.id}
          rating={starRating}
          itemType="hotel"
        />
      }
    />
  );
}
