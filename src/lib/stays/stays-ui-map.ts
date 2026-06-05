import type { StaysRateRow, StaysSearchResultCard } from "@/lib/api/stays-dto";
import type { HotelRoom, MockHotel } from "@/data/mock-hotels";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

/** Map Duffel search card to the rich list shape expected by `HotelsList` / `HotelCard`. */
export function staysSearchCardToMockHotel(card: StaysSearchResultCard): MockHotel {
  const price = Number.parseFloat(card.total_amount ?? card.nightly_from_amount ?? "0");
  const safePrice = Number.isFinite(price) ? price : 0;
  const lat = card.latitude ?? 0;
  const lng = card.longitude ?? 0;
  const locLabel = [card.city, card.country_code].filter(Boolean).join(", ") || "—";

  const hasAmount = Boolean(card.total_amount ?? card.nightly_from_amount);

  return {
    id: card.search_result_id,
    name: card.name,
    rating: card.review_score ?? 8,
    reviews: 0,
    stars: card.rating_stars ?? 4,
    address: card.address_line ?? locLabel,
    area: locLabel,
    distanceFromCenter: "—",
    distanceFromAirport: "—",
    description: "",
    price: safePrice,
    originalPrice: safePrice,
    discount: 0,
    taxes: 0,
    totalPrice: safePrice,
    currency: card.total_currency ?? card.nightly_from_currency ?? "USD",
    images: card.photo_url ? [card.photo_url] : [],
    amenities: [],
    mealPlan: "",
    freeCancellation: false,
    payAtHotel: false,
    instantConfirmation: false,
    roomsLeft: 999,
    propertyType: "hotel",
    tags: ["Duffel Stays"],
    fromDuffelStays: true,
    staysPricingPending: !hasAmount,
    guestRating: card.review_score ?? 8,
    locationScore: 8,
    cleanlinessScore: 8,
    serviceScore: 8,
    valueScore: 8,
    deals: [],
    lat,
    lng,
  };
}

export function staysFeaturedCardToFeaturedHotel(card: StaysSearchResultCard, index: number) {
  const price = Number.parseFloat(card.total_amount ?? card.nightly_from_amount ?? "0");
  const safePrice = Number.isFinite(price) ? Math.round(price) : 0;
  const loc = [card.city, card.country_code].filter(Boolean).join(", ") || "Featured stay";
  return {
    id: index + 1,
    name: card.name,
    location: loc,
    price: safePrice,
    rating: card.review_score ?? 8,
    reviews: "—",
    image: card.photo_url ?? PLACEHOLDER_IMG,
    facilities: ["Stays"],
    actionHref: `/hotels/${encodeURIComponent(card.search_result_id)}`,
  };
}

export function staysRateToHotelRoom(rate: StaysRateRow, nights: number): HotelRoom {
  const total = Number.parseFloat(rate.total_amount);
  const perNight =
    nights > 0 && Number.isFinite(total) ? Math.max(1, Math.round(total / nights)) : Math.round(total) || 0;
  const left = [
    rate.board_type ? `Board: ${rate.board_type}` : "",
    rate.payment_type ? `Payment: ${rate.payment_type}` : "",
    rate.rate_code ? `Rate code: ${rate.rate_code}` : "",
  ].filter(Boolean);
  const right = [
    rate.negotiated_rate_id ? "Corporate / negotiated rate" : "",
    rate.supported_loyalty_programme ? "Loyalty programme supported" : "",
  ].filter(Boolean);
  const condHints = (rate.conditions ?? []).slice(0, 2).map((c) => c.title);
  const rightCol = [...right, ...condHints].filter(Boolean);

  return {
    id: rate.rate_id,
    name: rate.room_name,
    image: rate.room_image_url ?? PLACEHOLDER_IMG,
    features: {
      left: left.length ? left : ["Rate"],
      right: rightCol.length ? rightCol : ["Duffel Stays rate"],
    },
    pricePerNight: perNight,
    photos: rate.room_image_url ? [rate.room_image_url] : undefined,
    totalStayAmount: rate.total_amount,
    totalStayCurrency: rate.total_currency,
    stayNights: nights,
    cancellationTimeline: rate.cancellation_timeline,
    boardType: rate.board_type,
    paymentType: rate.payment_type,
    negotiatedRateId: rate.negotiated_rate_id,
    supportedLoyaltyProgramme: rate.supported_loyalty_programme,
    rateConditions: rate.conditions,
  };
}
