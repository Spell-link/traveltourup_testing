import type React from "react";
import {
  Plane,
  Wifi,
  UtensilsCrossed,
  Tv,
  Coffee,
  Wine,
  ShoppingBag,
  Gamepad2,
  Wind,
} from "lucide-react";

export const AIRLINE_DESCRIPTIONS: Record<string, string> = {
  Saudia:
    "Saudia is the flag carrier of Saudi Arabia, offering premium service across the Middle East and beyond. Known for modern fleet and excellent hospitality.",
  "Pakistan International Airlines":
    "Pakistan International Airlines (PIA) connects Pakistan with the world. With decades of experience, PIA offers reliable service on regional and international routes.",
  Emirates:
    "Emirates is one of the world's leading airlines, renowned for luxury inflight experience, extensive route network, and award-winning service.",
  "Qatar Airways":
    "Qatar Airways is a five-star airline offering world-class comfort and service. Based in Doha, it connects passengers to over 160 destinations worldwide.",
  "Etihad Airways":
    "Etihad Airways is the national airline of the UAE, providing premium travel experience with innovative cabins and exceptional service.",
  Flydubai:
    "Flydubai is a low-cost carrier based in Dubai, offering affordable travel across the Middle East, Africa, and Asia with modern aircraft.",
};

export const INFLIGHT_FEATURES: Record<string, { icon: React.ReactNode; label: string }> = {
  wifi: { icon: <Wifi className="w-4 h-4" />, label: "Wi-Fi" },
  meals: { icon: <UtensilsCrossed className="w-4 h-4" />, label: "Meals" },
  entertainment: { icon: <Tv className="w-4 h-4" />, label: "Entertainment" },
  luxury: { icon: <Plane className="w-4 h-4" />, label: "Premium Cabin" },
};

export const ALL_INFLIGHT_ICONS = [
  { icon: <Wifi className="w-4 h-4" />, label: "Wi-Fi" },
  { icon: <Tv className="w-4 h-4" />, label: "Entertainment" },
  { icon: <Tv className="w-4 h-4" />, label: "Television" },
  { icon: <Wind className="w-4 h-4" />, label: "Air Conditioning" },
  { icon: <Coffee className="w-4 h-4" />, label: "Drinks" },
  { icon: <Gamepad2 className="w-4 h-4" />, label: "Games" },
  { icon: <Coffee className="w-4 h-4" />, label: "Coffee" },
  { icon: <Wine className="w-4 h-4" />, label: "Wines" },
  { icon: <ShoppingBag className="w-4 h-4" />, label: "Shopping" },
];

export function formatFlightDate(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[parseInt(m || "1", 10) - 1];
  const [h, min] = timeStr.split(":");
  const hour = parseInt(h || "0", 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${d} ${month} ${y}, ${hour12}:${min || "00"} ${ampm}`;
}
