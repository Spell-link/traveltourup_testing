import type { StaysCancellationStep, StaysRateCondition } from "@/lib/api/stays-dto";

/** Room option for hotel detail page */
export interface HotelRoom {
  id: string;
  name: string;
  image: string;
  features: { left: string[]; right: string[] };
  pricePerNight: number;
  photos?: string[];
  /** Duffel: `total_amount` for full stay on this rate (authoritative before quote). */
  totalStayAmount?: string;
  totalStayCurrency?: string;
  stayNights?: number;
  cancellationTimeline?: StaysCancellationStep[];
  boardType?: string | null;
  paymentType?: string | null;
  negotiatedRateId?: string | null;
  supportedLoyaltyProgramme?: string | null;
  rateConditions?: StaysRateCondition[];
}

/** Hotel search result item for HotelsList component */
export interface MockHotel {
  /** Numeric mock id or Duffel `search_result_id` string for live Stays. */
  id: number | string;
  name: string;
  rating: number;
  reviews: number;
  stars: number;
  address: string;
  area: string;
  distanceFromCenter: string;
  distanceFromAirport: string;
  description: string;
  price: number;
  originalPrice: number;
  discount: number;
  taxes: number;
  totalPrice: number;
  currency: string;
  images: string[];
  amenities: string[];
  mealPlan: string;
  freeCancellation: boolean;
  payAtHotel: boolean;
  instantConfirmation: boolean;
  roomsLeft: number;
  propertyType: string;
  tags: string[];
  guestRating: number;
  locationScore: number;
  cleanlinessScore: number;
  serviceScore: number;
  valueScore: number;
  deals: { type: string; text: string; highlight?: boolean }[];
  /** WGS84 coordinates for map display (Jeddah area) */
  lat: number;
  lng: number;
  /** Available room types for selection */
  rooms?: HotelRoom[];
  /** Row came from Duffel Stays search (list pricing/cancellation not in search step). */
  fromDuffelStays?: boolean;
  /** Search step has no total/nightly amount; show “see rates” until fetch_all_rates. */
  staysPricingPending?: boolean;
}

const ROOM_IMAGES = {
  standard: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
  superior: "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
  deluxe: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
  single: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80",
};

/** Shared room photos for gallery (multiple angles/views like hotel & car detail pages) */
const ROOM_GALLERY_PHOTOS = [
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
];

/** Default rooms for hotels - price scaled by hotel base price. Exported for use in detail page. */
export function getDefaultRooms(hotel: { price: number; currency: string }): HotelRoom[] {
  const base = hotel.price;
  return [
    {
      id: "standard-family",
      name: "Standard Family Room",
      image: ROOM_IMAGES.standard,
      features: { left: ["Free Wi-Fi", "15 m²"], right: ["2 Single beds", "Shower and bathtub"] },
      pricePerNight: Math.round(base * 0.35),
      photos: [ROOM_IMAGES.standard, ...ROOM_GALLERY_PHOTOS],
    },
    {
      id: "superior-double",
      name: "Superior Double Room",
      image: ROOM_IMAGES.superior,
      features: { left: ["Free Wi-Fi", "18 m²"], right: ["1 Double bed", "Shower and bathtub"] },
      pricePerNight: Math.round(base * 0.42),
      photos: [ROOM_IMAGES.superior, ...ROOM_GALLERY_PHOTOS],
    },
    {
      id: "deluxe-single",
      name: "Deluxe Single Room",
      image: ROOM_IMAGES.deluxe,
      features: { left: ["Free Wi-Fi", "22 m²"], right: ["2 Single beds", "Shower and bathtub"] },
      pricePerNight: Math.round(base * 0.5),
      photos: [ROOM_IMAGES.deluxe, ...ROOM_GALLERY_PHOTOS],
    },
    {
      id: "single-bed",
      name: "Single Bed Room",
      image: ROOM_IMAGES.single,
      features: { left: ["Free Wi-Fi", "12 m²"], right: ["1 Single bed", "Shower"] },
      pricePerNight: Math.round(base * 0.28),
      photos: [ROOM_IMAGES.single, ...ROOM_GALLERY_PHOTOS],
    },
  ];
}

export const MOCK_HOTELS: MockHotel[] = [
  {
    id: 1,
    name: "Jeddah Hilton",
    rating: 8.8,
    reviews: 2456,
    stars: 5,
    address: "Corniche Road, North Obhur",
    area: "North Jeddah",
    distanceFromCenter: "8 km",
    distanceFromAirport: "25 km",
    description: "Luxury beachfront hotel with private beach, multiple pools, and spa facilities.",
    price: 320,
    originalPrice: 380,
    discount: 16,
    taxes: 32,
    totalPrice: 352,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "spa", "gym", "parking", "breakfast", "restaurant", "bar", "ac", "business", "laundry"],
    mealPlan: "Breakfast included",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 5,
    propertyType: "hotel",
    tags: ["Beachfront", "Luxury", "Family-friendly", "Spa"],
    guestRating: 9.2,
    locationScore: 8.5,
    cleanlinessScore: 9.4,
    serviceScore: 9.1,
    valueScore: 8.3,
    deals: [
      { type: "discount", text: "Save 16%", highlight: true },
      { type: "freebie", text: "Free airport transfer" },
      { type: "benefit", text: "Book now, pay later" },
    ],
    lat: 21.5433,
    lng: 39.1728,
  },
  {
    id: 2,
    name: "Mövenpick Hotel Jeddah",
    rating: 8.5,
    reviews: 1872,
    stars: 5,
    address: "Al Madinah Al Munawarah Road",
    area: "Al Hamra District",
    distanceFromCenter: "3 km",
    distanceFromAirport: "18 km",
    description: "Modern hotel in commercial district with rooftop pool and panoramic city views.",
    price: 280,
    originalPrice: 320,
    discount: 13,
    taxes: 28,
    totalPrice: 308,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1564501049418-3c27787d01e8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "gym", "parking", "breakfast", "restaurant", "bar", "ac", "business", "laundry"],
    mealPlan: "Breakfast included",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 8,
    propertyType: "hotel",
    tags: ["City Center", "Business", "Modern", "Rooftop Pool"],
    guestRating: 8.9,
    locationScore: 9.2,
    cleanlinessScore: 8.8,
    serviceScore: 8.7,
    valueScore: 8.5,
    deals: [
      { type: "discount", text: "Save 13%", highlight: true },
      { type: "freebie", text: "Free room upgrade" },
      { type: "benefit", text: "No prepayment needed" },
    ],
    lat: 21.5811,
    lng: 39.1654,
  },
  {
    id: 3,
    name: "Radisson Blu Hotel",
    rating: 8.3,
    reviews: 1567,
    stars: 4,
    address: "Al Andalus Street",
    area: "Al Andalus",
    distanceFromCenter: "5 km",
    distanceFromAirport: "20 km",
    description: "Contemporary hotel with elegant rooms, multiple dining options, and conference facilities.",
    price: 220,
    originalPrice: 260,
    discount: 15,
    taxes: 22,
    totalPrice: 242,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "gym", "parking", "restaurant", "bar", "ac", "business", "laundry"],
    mealPlan: "Room Only",
    freeCancellation: true,
    payAtHotel: false,
    instantConfirmation: true,
    roomsLeft: 12,
    propertyType: "hotel",
    tags: ["Business", "Conference", "Modern", "Central"],
    guestRating: 8.4,
    locationScore: 8.1,
    cleanlinessScore: 8.6,
    serviceScore: 8.3,
    valueScore: 8.7,
    deals: [
      { type: "discount", text: "Save 15%", highlight: true },
      { type: "benefit", text: "Free cancellation" },
    ],
    lat: 21.5982,
    lng: 39.2115,
  },
  {
    id: 4,
    name: "Jeddah Marriott Hotel",
    rating: 8.7,
    reviews: 2134,
    stars: 5,
    address: "Al Madinah Al Munawarah Road",
    area: "Al Zahra District",
    distanceFromCenter: "4 km",
    distanceFromAirport: "22 km",
    description: "Luxury hotel with Mediterranean-inspired design, multiple restaurants, and spa.",
    price: 350,
    originalPrice: 420,
    discount: 17,
    taxes: 35,
    totalPrice: 385,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "spa", "gym", "parking", "breakfast", "restaurant", "bar", "ac", "business", "laundry"],
    mealPlan: "Breakfast included",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 3,
    propertyType: "hotel",
    tags: ["Luxury", "Spa", "Fine Dining", "Elegant"],
    guestRating: 9.0,
    locationScore: 8.8,
    cleanlinessScore: 9.1,
    serviceScore: 9.0,
    valueScore: 8.6,
    deals: [
      { type: "discount", text: "Save 17%", highlight: true },
      { type: "freebie", text: "Free spa access" },
      { type: "benefit", text: "Late checkout included" },
    ],
    lat: 21.5678,
    lng: 39.1589,
  },
  {
    id: 5,
    name: "Rosewood Jeddah",
    rating: 9.1,
    reviews: 987,
    stars: 5,
    address: "Corniche Road",
    area: "Corniche",
    distanceFromCenter: "6 km",
    distanceFromAirport: "28 km",
    description: "Ultra-luxury hotel with Red Sea views, private beach, and exclusive services.",
    price: 520,
    originalPrice: 650,
    discount: 20,
    taxes: 52,
    totalPrice: 572,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "spa", "gym", "parking", "breakfast", "restaurant", "bar", "ac", "business", "laundry", "airport-shuttle"],
    mealPlan: "All Inclusive",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 2,
    propertyType: "hotel",
    tags: ["Ultra Luxury", "Beachfront", "All Inclusive", "Boutique"],
    guestRating: 9.4,
    locationScore: 9.0,
    cleanlinessScore: 9.6,
    serviceScore: 9.5,
    valueScore: 8.8,
    deals: [
      { type: "discount", text: "Save 20%", highlight: true },
      { type: "freebie", text: "All inclusive package" },
      { type: "benefit", text: "Butler service included" },
    ],
    lat: 21.5294,
    lng: 39.1397,
  },
  {
    id: 6,
    name: "Al Hamra Apartment Hotel",
    rating: 8.0,
    reviews: 876,
    stars: 4,
    address: "Prince Sultan Street",
    area: "Al Hamra",
    distanceFromCenter: "2 km",
    distanceFromAirport: "15 km",
    description: "Modern apartment hotel with kitchenettes, living areas, and weekly housekeeping.",
    price: 180,
    originalPrice: 220,
    discount: 18,
    taxes: 18,
    totalPrice: 198,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "parking", "ac", "laundry"],
    mealPlan: "Room Only",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 15,
    propertyType: "apartment",
    tags: ["Apartment", "Self-catering", "Budget", "Family"],
    guestRating: 8.2,
    locationScore: 9.3,
    cleanlinessScore: 8.4,
    serviceScore: 8.1,
    valueScore: 8.9,
    deals: [
      { type: "discount", text: "Save 18%", highlight: true },
      { type: "benefit", text: "Weekly discount available" },
    ],
    lat: 21.5555,
    lng: 39.1488,
  },
  {
    id: 7,
    name: "Coral Jeddah Resort",
    rating: 8.4,
    reviews: 1345,
    stars: 4,
    address: "North Corniche",
    area: "North Obhur",
    distanceFromCenter: "10 km",
    distanceFromAirport: "30 km",
    description: "Beach resort with water sports, kids club, and multiple dining options.",
    price: 260,
    originalPrice: 310,
    discount: 16,
    taxes: 26,
    totalPrice: 286,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "pool", "gym", "parking", "breakfast", "restaurant", "bar", "ac"],
    mealPlan: "Half Board",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 7,
    propertyType: "resort",
    tags: ["Resort", "Beach", "Family", "All-inclusive"],
    guestRating: 8.6,
    locationScore: 7.8,
    cleanlinessScore: 8.7,
    serviceScore: 8.5,
    valueScore: 8.4,
    deals: [
      { type: "discount", text: "Save 16%", highlight: true },
      { type: "freebie", text: "Free water sports" },
    ],
    lat: 21.5122,
    lng: 39.0988,
  },
  {
    id: 8,
    name: "Jeddah Boutique Hotel",
    rating: 8.6,
    reviews: 765,
    stars: 4,
    address: "Tahlia Street",
    area: "Tahlia",
    distanceFromCenter: "1 km",
    distanceFromAirport: "17 km",
    description: "Boutique hotel in trendy district with contemporary design and personalized service.",
    price: 240,
    originalPrice: 290,
    discount: 17,
    taxes: 24,
    totalPrice: 264,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1559508551-44bff1de756b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    ],
    amenities: ["wifi", "parking", "breakfast", "restaurant", "bar", "ac", "business"],
    mealPlan: "Breakfast included",
    freeCancellation: true,
    payAtHotel: true,
    instantConfirmation: true,
    roomsLeft: 6,
    propertyType: "hotel",
    tags: ["Boutique", "Trendy", "Design", "Central"],
    guestRating: 8.8,
    locationScore: 9.5,
    cleanlinessScore: 8.9,
    serviceScore: 8.8,
    valueScore: 8.6,
    deals: [
      { type: "discount", text: "Save 17%", highlight: true },
      { type: "freebie", text: "Welcome drink" },
    ],
    lat: 21.6021,
    lng: 39.1544,
  },
];
