"use client";
import React, { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Snowflake,
  Bluetooth,
  Navigation,
  Camera,
  Car,
  Gauge,
  Plug,
  Baby,
  Filter,
  ChevronDown,
  ChevronUp,
  Star,
  Check,
  X,
  Users,
  Luggage,
  Settings,
  Fuel,
  Key,
  MapPin,
  Search,
  TrendingUp,
  Shield,
  LayoutGrid,
  List,
  BadgeCheck,
} from "lucide-react";
import type { CarListing } from "@/types";
import { MOCK_CARS } from "@/data/mock-cars";
import { Input } from "@/components/ui/Input";
import {
  useComparison,
  ComparisonCheckbox,
  GenericComparison
} from "../shared/GenericComparison";
import { createCarComparisonConfig } from "../shared/ComparisonConfigs";
import DualSlider from "@/components/ui/DualSlider";
import { useLocale } from "next-intl";
import { useCurrency } from "@/components/providers/CurrencyProvider";

const CAR_TRUST_POINTS: {
  title: string;
  description: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  ring: string;
}[] = [
  {
    title: "Best Price Guarantee",
    description: "Found the same car for less? We'll match the price.",
    Icon: Shield,
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    ring: "ring-primary/30",
  },
  {
    title: "No Hidden Fees",
    description: "No booking fees. The price you see is what you pay.",
    Icon: Key,
    iconBg: "bg-success/15",
    iconColor: "text-success",
    ring: "ring-success/35",
  },
  {
    title: "24/7 Support",
    description: "Our customer service team is here to help anytime.",
    Icon: Check,
    iconBg: "bg-muted",
    iconColor: "text-primary-700 dark:text-primary",
    ring: "ring-border",
  },
];

const CAR_RENTAL_TIPS: {
  title: string;
  Icon: LucideIcon;
  items: string[];
}[] = [
  {
    title: "Driving Requirements",
    Icon: BadgeCheck,
    items: [
      "Minimum age: 21 years (25 for premium cars)",
      "Valid driver's license required",
      "International driving permit recommended",
      "Credit card for security deposit",
    ],
  },
  {
    title: "Local Information",
    Icon: MapPin,
    items: [
      "Drive on the right side of the road",
      "Speed limits: 40–120 km/h",
      "Fuel stations accept cash & credit cards",
      "Free parking available in most areas",
    ],
  },
];

const CarBook = () => {
  const locale = useLocale();
  const { formatFromUsd } = useCurrency();
  // State for search parameters
  const [searchParams, setSearchParams] = useState({
    pickupLocation: 'Jeddah, Saudi Arabia',
    dropoffLocation: 'Same as pickup',
    pickupDate: '2026-04-17',
    pickupTime: '10:00',
    dropoffDate: '2026-04-24',
    dropoffTime: '10:00',
    driverAge: '30-65'
  });

  const [cars, setCars] = useState<CarListing[]>([]);
  const [filteredCars, setFilteredCars] = useState<CarListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState('best');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [expandedCar, setExpandedCar] = useState<number | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [mobileSortChosen, setMobileSortChosen] = useState(false);
  const reduceMotion = useReducedMotion();

  const CAR_SORT_OPTIONS = [
    { id: "best", label: "Best" },
    { id: "price_low", label: "Price (lowest)" },
    { id: "price_high", label: "Price (highest)" },
    { id: "rating", label: "Customer rating" },
    { id: "car_name", label: "Car name" },
    { id: "supplier", label: "Supplier rating" },
  ] as const;

  useEffect(() => {
    if (!sortMenuOpen) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [sortMenuOpen]);

  // Comparison state
  const comparison = useComparison(3);

  const CAR_PRICE_SLIDER_MIN = 0;
  const CAR_PRICE_SLIDER_MAX = 2000;

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedCarTypes, setSelectedCarTypes] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Dummy car types
  const carTypes = [
    { id: 'economy', name: 'Economy', count: 12 },
    { id: 'compact', name: 'Compact', count: 15 },
    { id: 'midsize', name: 'Midsize', count: 10 },
    { id: 'suv', name: 'SUV', count: 8 },
    { id: 'van', name: 'Van/Minivan', count: 6 },
    { id: 'luxury', name: 'Luxury', count: 4 },
    { id: 'convertible', name: 'Convertible', count: 3 },
    { id: 'premium', name: 'Premium', count: 5 },
  ];

  // Dummy suppliers
  const suppliers = [
    { id: 'hertz', name: 'Hertz', rating: 8.4, reviews: 1245, logo: 'HZ' },
    { id: 'avis', name: 'Avis', rating: 8.2, reviews: 892, logo: 'AV' },
    { id: 'europcar', name: 'Europcar', rating: 8.0, reviews: 678, logo: 'EC' },
    { id: 'sixt', name: 'Sixt', rating: 8.6, reviews: 945, logo: 'SX' },
    { id: 'thrifty', name: 'Thrifty', rating: 7.8, reviews: 432, logo: 'TH' },
    { id: 'budget', name: 'Budget', rating: 7.9, reviews: 567, logo: 'BG' },
    { id: 'alamo', name: 'Alamo', rating: 8.1, reviews: 345, logo: 'AL' },
    { id: 'national', name: 'National', rating: 8.3, reviews: 789, logo: 'NT' },
  ];

  // Create comparison config after suppliers is defined
  const carComparisonConfig = createCarComparisonConfig(suppliers);

  const features = [
    { id: "ac", name: "Air Conditioning", icon: <Snowflake className="w-4 h-4" />, count: 45 },
    { id: "bluetooth", name: "Bluetooth", icon: <Bluetooth className="w-4 h-4" />, count: 38 },
    { id: "gps", name: "GPS Navigation", icon: <Navigation className="w-4 h-4" />, count: 25 },
    { id: "camera", name: "Backup Camera", icon: <Camera className="w-4 h-4" />, count: 22 },
    { id: "parking", name: "Parking Sensors", icon: <Car className="w-4 h-4" />, count: 18 },
    { id: "cruise", name: "Cruise Control", icon: <Gauge className="w-4 h-4" />, count: 40 },
    { id: "usb", name: "USB Ports", icon: <Plug className="w-4 h-4" />, count: 42 },
    { id: "child", name: "Child Seat", icon: <Baby className="w-4 h-4" />, count: 32 },
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCars(MOCK_CARS);
      setFilteredCars(MOCK_CARS);
      setLoading(false);
    }, 1000);
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...cars];

    // Price filter
    result = result.filter(car => car.totalPrice >= priceRange[0] && car.totalPrice <= priceRange[1]);

    // Car type filter
    if (selectedCarTypes.length > 0) {
      result = result.filter(car => selectedCarTypes.includes(car.type.toLowerCase()));
    }

    // Transmission filter
    if (selectedTransmissions.length > 0) {
      result = result.filter(car => selectedTransmissions.includes(car.transmission.toLowerCase()));
    }

    // Fuel type filter
    if (selectedFuelTypes.length > 0) {
      result = result.filter(car => selectedFuelTypes.includes(car.fuel.toLowerCase()));
    }

    // Supplier filter
    if (selectedSuppliers.length > 0) {
      result = result.filter(car => selectedSuppliers.includes(car.supplier.toLowerCase()));
    }

    // Features filter
    if (selectedFeatures.length > 0) {
      result = result.filter(car =>
        selectedFeatures.every(feature => car.features.includes(feature))
      );
    }

    // Seats filter
    if (selectedSeats.length > 0) {
      result = result.filter(car => selectedSeats.includes(car.seats.toString()));
    }

    // Sort results
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      case 'price_high':
        result.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'car_name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'supplier':
        result.sort((a, b) => b.supplierRating - a.supplierRating);
        break;
      default: // best
        result.sort((a, b) => {
          // Sort by best value: combination of rating and price
          const scoreA = (a.rating * 20) - (a.totalPrice / 10);
          const scoreB = (b.rating * 20) - (b.totalPrice / 10);
          return scoreB - scoreA;
        });
    }

    setFilteredCars(result);
  }, [cars, priceRange, selectedCarTypes, selectedTransmissions, selectedFuelTypes, selectedSuppliers, selectedFeatures, selectedSeats, sortBy]);

  const handleFilterToggle = (filterType: string, value: string) => {
    const setters = {
      carType: setSelectedCarTypes,
      transmission: setSelectedTransmissions,
      fuel: setSelectedFuelTypes,
      supplier: setSelectedSuppliers,
      feature: setSelectedFeatures,
      seats: setSelectedSeats,
    };

    const stateSetters = {
      carType: selectedCarTypes,
      transmission: selectedTransmissions,
      fuel: selectedFuelTypes,
      supplier: selectedSuppliers,
      feature: selectedFeatures,
      seats: selectedSeats,
    };

    const setter = setters[filterType as keyof typeof setters];
    const state = stateSetters[filterType as keyof typeof stateSetters];

    setter(prev =>
      prev.includes(value)
        ? prev.filter(item => item !== value)
        : [...prev, value]
    );
  };

  const handlePriceChange = (minMax: "min" | "max", raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const n = Math.max(
      CAR_PRICE_SLIDER_MIN,
      Math.min(CAR_PRICE_SLIDER_MAX, parsed)
    );
    if (minMax === "min") {
      setPriceRange([Math.min(n, priceRange[1]), priceRange[1]]);
    } else {
      setPriceRange([priceRange[0], Math.max(n, priceRange[0])]);
    }
  };

  const clearAllFilters = () => {
    setPriceRange([CAR_PRICE_SLIDER_MIN, 1000]);
    setSelectedCarTypes([]);
    setSelectedTransmissions([]);
    setSelectedFuelTypes([]);
    setSelectedSuppliers([]);
    setSelectedFeatures([]);
    setSelectedSeats([]);
  };

  const CarCard = ({ car, variant = 'list' }: { car: CarListing; variant?: 'list' | 'grid' }) => {
    const isExpanded = expandedCar === car.id;
    const isGrid = variant === 'grid';
    const isSelectedForComparison = comparison.isSelected(car.id);

    if (isGrid) {
      return (
        <div className="bg-card rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
          <div className="p-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">{(suppliers.find(s => s.name === car.supplier)?.logo || car.supplier.substring(0, 2))}</span>
                </div>
                <ComparisonCheckbox
                  isSelected={isSelectedForComparison}
                  onToggle={() => comparison.toggleItem(car)}
                />
              </div>
              <div className="flex items-center bg-primary/20 text-primary px-2 py-1 rounded-lg">
                <Star className="mr-1" />
                <span className="font-bold text-sm">{car.rating}</span>
              </div>
            </div>
            <h3 className="font-bold text-base hover:text-primary cursor-pointer line-clamp-2 mb-1">{car.name}</h3>
            <p className="text-muted-foreground text-sm mb-3">{car.category}</p>
            <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
              <div className="flex items-center">
                <Users className="text-muted-foreground mr-1" />
                <span>{car.seats} seats</span>
              </div>
              <div className="flex items-center">
                <Settings className="text-muted-foreground mr-1" />
                <span>{car.transmission}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {car.deals.slice(0, 2).map((deal, index) => (
                <span key={index} className={`px-2 py-0.5 rounded text-xs ${deal.highlight ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}>
                  {deal.text}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-3 border-t border-border">
              <div className="flex items-end justify-between mb-2">
                <div>
                  {(car.discount ?? 0) > 0 && (
                    <div className="text-muted-foreground line-through text-sm">{formatFromUsd(car.originalPrice ?? 0, locale)}</div>
                  )}
                  <div className="text-2xl font-bold text-foreground">{formatFromUsd(car.totalPrice ?? 0, locale)}</div>
                  <div className="text-muted-foreground text-xs">{formatFromUsd(car.pricePerDay ?? 0, locale)}/day</div>
                </div>
              </div>
              <Link href={`/cars/${car.id}`}><button className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors duration-300 mb-2">
                Select
              </button></Link>
              {car.freeCancellation && (
                <div className="text-success text-xs text-center">
                  <Check className="inline mr-1" />
                  Free cancellation
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl shadow-md border border-border hover:shadow-lg transition-shadow duration-300 mb-4">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row">
            {/* Car Info Header */}
            <div className="lg:w-3/4 lg:pr-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg hover:text-primary cursor-pointer"><Link href={`/cars/${car.id}`}>{car.name}</Link></h3>
                  <p className="text-muted-foreground text-sm">{car.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ComparisonCheckbox
                    isSelected={isSelectedForComparison}
                    onToggle={() => comparison.toggleItem(car)}
                  />
                  <button
                    onClick={() => setExpandedCar(isExpanded ? null : car.id)}
                    className="text-primary hover:text-primary-600"
                  >
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </button>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mr-3">
                  <span className="font-bold text-primary">
                    {suppliers.find(s => s.name === car.supplier)?.logo || car.supplier.substring(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{car.supplier}</div>
                  <div className="flex items-center text-sm">
                    <Star className="text-yellow-500 mr-1" />
                    <span>{car.supplierRating}</span>
                    <span className="text-muted-foreground ml-1">({car.supplierReviews} reviews)</span>
                  </div>
                </div>
                <div className="ml-auto flex items-center bg-primary/20 text-primary px-3 py-1 rounded-lg">
                  <Star className="mr-1" />
                  <div>
                    <div className="font-bold">{car.rating}</div>
                    <div className="text-xs">({car.reviews})</div>
                  </div>
                </div>
              </div>
              {/* Car Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center">
                  <Users className="text-muted-foreground mr-2" />
                  <div>
                    <div className="text-sm text-muted-foreground">Seats</div>
                    <div className="font-semibold">{car.seats}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Luggage className="text-muted-foreground mr-2" />
                  <div>
                    <div className="text-sm text-muted-foreground">Bags</div>
                    <div className="font-semibold">{car.bags}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Settings className="text-muted-foreground mr-2" />
                  <div>
                    <div className="text-sm text-muted-foreground">Transmission</div>
                    <div className="font-semibold">{car.transmission}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Fuel className="text-muted-foreground mr-2" />
                  <div>
                    <div className="text-sm text-muted-foreground">Fuel</div>
                    <div className="font-semibold">{car.fuel}</div>
                  </div>
                </div>
              </div>
              {/* Features */}
              <div className="mb-4">
                <h4 className="font-semibold text-sm mb-2">Top features:</h4>
                <div className="flex flex-wrap gap-2">
                  {car.features.slice(0, 4).map((featureId: string, index: number) => {
                    const feature = features.find(f => f.id === featureId);
                    return feature ? (
                      <div key={index} className="flex items-center bg-muted px-3 py-1 rounded-lg text-sm">
                        {feature.icon}
                        <span className="ml-2">{feature.name}</span>
                      </div>
                    ) : null;
                  })}
                  {car.features.length > 4 && (
                    <span className="text-primary text-sm">+{car.features.length - 4} more</span>
                  )}
                </div>
              </div>



              {/* Expanded Details */}
              {isExpanded && (
                <>


                  {/* Location Info */}
                  <div className="flex items-center text-muted-foreground text-sm mb-4">
                    <MapPin className="mr-2" />
                    <span>{car.location} • {car.distance}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {car.tags.map((tag: string, index: number) => (
                      <span key={index} className="bg-muted text-foreground px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Deals */}
                  <div className="flex flex-wrap gap-2">
                    {car.deals.map((deal, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-xs ${deal.highlight ? 'bg-success/20 text-success' : 'bg-primary/10 text-primary'}`}
                      >
                        {deal.text}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{car.score.value}/10</div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{car.score.condition}/10</div>
                        <div className="text-xs text-muted-foreground">Condition</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{car.score.comfort}/10</div>
                        <div className="text-xs text-muted-foreground">Comfort</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{car.score.features}/10</div>
                        <div className="text-xs text-muted-foreground">Features</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground">{car.score.valueScore ?? car.score.value}/10</div>
                        <div className="text-xs text-muted-foreground">Value</div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <h4 className="font-semibold mb-2">Included in this price:</h4>
                      <div className="flex flex-wrap gap-2">
                        {car.included.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center text-success">
                            <Check className="mr-2" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Price and Select Button */}
            <div className="lg:w-1/4 lg:border-l lg:pl-6 mt-4 lg:mt-0">
              <div className="text-right mb-4 flex flex-col items-start justify-center">
                {(car.discount ?? 0) > 0 && (
                  <div className="text-muted-foreground line-through text-sm mb-1">
                    {formatFromUsd(car.originalPrice ?? 0, locale)}
                  </div>
                )}
                <div className="flex items-end justify-end mb-1">
                  <div className="text-3xl font-bold text-foreground">{formatFromUsd(car.totalPrice ?? 0, locale)}</div>
                  <div className="text-muted-foreground text-sm ml-2 mb-1">total</div>
                </div>

                <div className="text-muted-foreground text-sm mb-2">
                  {formatFromUsd(car.pricePerDay ?? 0, locale)} per day • {car.mileage}
                </div>

                <div className="text-muted-foreground text-sm">
                  Pickup: {car.pickupTime}
                </div>
              </div>

              <Link href={`/cars/payment`}><button className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-colors duration-300 mb-2">
                Select
              </button></Link>

              <div className="space-y-2 flex flex-col items-start justify-center">
                {car.freeCancellation && (
                  <div className="text-center text-success text-sm">
                    <Check className="inline mr-1" />
                    Free cancellation
                  </div>
                )}
                {car.instantConfirmation && (
                  <div className="text-center text-success text-sm">
                    <Check className="inline mr-1" />
                    Instant confirmation
                  </div>
                )}
                <div className="text-center text-muted-foreground text-xs">
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FilterSidebar = () => (
    <div className="bg-card rounded-xl shadow-md border border-border lg:p-6  lg:mb-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-foreground ">Filters</h2>
        <button
          onClick={clearAllFilters}
          className="text-primary hover:text-primary-600 text-sm font-semibold"
        >
          Clear all
        </button>
      </div>

      {/* Price Range */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">Price total (USD)</h3>
        <div className="mb-4 flex space-x-4">
          <div className="flex-1">
            <Input
              label="Min"
              type="number"
              value={priceRange[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePriceChange("min", e.target.value)}
              min={CAR_PRICE_SLIDER_MIN}
              max={CAR_PRICE_SLIDER_MAX}
              className="py-2.5"
            />
          </div>
          <div className="flex-1">
            <Input
              label="Max"
              type="number"
              value={priceRange[1]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePriceChange("max", e.target.value)}
              min={CAR_PRICE_SLIDER_MIN}
              max={CAR_PRICE_SLIDER_MAX}
              className="py-2.5"
            />
          </div>
        </div>
        <DualSlider
          min={CAR_PRICE_SLIDER_MIN}
          max={CAR_PRICE_SLIDER_MAX}
          step={1}
          value={priceRange}
          onChange={setPriceRange}
          currencyPrefix=""
          formatRangeLabel={(n) => formatFromUsd(n, locale)}
        />
      </div>

      {/* Car Type */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">Car Type</h3>
        <div className="space-y-2">
          {carTypes.slice(0, 5).map((type) => (
            <label key={type.id} className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedCarTypes.includes(type.id)}
                  onChange={() => handleFilterToggle('carType', type.id)}
                  className="w-4 h-4 text-primary rounded focus:ring-ring"
                />
                <span className="ml-3 text-sm">{type.name}</span>
              </div>
              <span className="text-muted-foreground text-sm">{type.count}</span>
            </label>
          ))}
        </div>
    
      </div>
      {filterMenuOpen && (
        <>
          <h3 className="font-bold mb-4">Transmission</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTransmissions.includes('automatic')}
                  onChange={() => handleFilterToggle('transmission', 'automatic')}
                  className="w-4 h-4 text-primary rounded focus:ring-ring"
                />
                <span className="ml-3 text-sm">Automatic</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {MOCK_CARS.filter(c => c.transmission === 'Automatic').length}
              </span>
            </label>
          </div>
          <div className="mb-8">
            <h3 className="font-bold mb-4">Fuel Type</h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFuelTypes.includes('petrol')}
                    onChange={() => handleFilterToggle('fuel', 'petrol')}
                    className="w-4 h-4 text-primary rounded focus:ring-ring"
                  />
                  <span className="ml-3 text-sm">Petrol</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {MOCK_CARS.filter(c => c.fuel === 'Petrol').length}
                </span>
              </label>
              <label className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedFuelTypes.includes('diesel')}
                    onChange={() => handleFilterToggle('fuel', 'diesel')}
                    className="w-4 h-4 text-primary rounded focus:ring-ring"
                  />
                  <span className="ml-3 text-sm">Diesel</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  {MOCK_CARS.filter(c => c.fuel === 'Diesel').length}
                </span>
              </label>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className="font-bold mb-4">Features</h3>
            <div className="space-y-2">
              {features.slice(0, 5).map((feature) => (
                <label key={feature.id} className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feature.id)}
                      onChange={() => handleFilterToggle('feature', feature.id)}
                      className="w-4 h-4 text-primary rounded focus:ring-ring"
                    />
                    <span className="ml-2">{feature.icon}</span>
                    <span className="ml-2 text-sm">{feature.name}</span>
                  </div>
                  <span className="text-muted-foreground text-sm">{feature.count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Suppliers */}
          <div className="mb-8">
            <h3 className="font-bold mb-4">Rental Company</h3>
            <div className="space-y-2">
              {suppliers.slice(0, 4).map((supplier) => (
                <label key={supplier.id} className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier.name.toLowerCase())}
                      onChange={() => handleFilterToggle('supplier', supplier.name.toLowerCase())}
                      className="w-4 h-4 text-primary rounded focus:ring-ring"
                    />
                    <div className="w-6 h-6 bg-primary/20 text-primary rounded flex items-center justify-center text-xs font-bold ml-3">
                      {supplier.logo}
                    </div>
                    <span className="ml-3 text-sm">{supplier.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-2 text-sm">{supplier.rating}</span>
                    <span className="text-muted-foreground text-xs">({supplier.reviews})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Seats */}
          <div className="mb-8">
            <h3 className="font-bold mb-4">Passenger Capacity</h3>
            <div className="grid grid-cols-3 gap-2">
              {[2, 4, 5, 7, 8, 12].map((seats) => (
                <label key={seats} className={`border rounded-lg p-2 cursor-pointer hover:border-primary text-center ${selectedSeats.includes(seats.toString()) ? 'border-primary bg-primary/10' : 'border-input'}`}>
                  <input
                    type="checkbox"
                    checked={selectedSeats.includes(seats.toString())}
                    onChange={() => handleFilterToggle('seats', seats.toString())}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center">
                    <Users className="mr-1" />
                    <span className="font-semibold">{seats}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">seats</div>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setFilterMenuOpen(!filterMenuOpen)}
        className="mt-2 flex items-center text-sm font-medium text-primary hover:tex"
      >
        {filterMenuOpen ? (
          <>
            Show less <ChevronUp className="ml-1 inline w-4 h-4" />
          </>
        ) : (
          <>
            Show more <ChevronDown className="ml-1 inline w-4 h-4" />
          </>
        )}
      </button>
      {/* Fuel Type */}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Generic Comparison Component */}
      <GenericComparison
        items={cars}
        selectedItems={comparison.selectedItems}
        config={carComparisonConfig}
        isModalOpen={comparison.showModal}
        onToggleItem={comparison.toggleItem}
        onClearAll={comparison.clearAll}
        onOpenModal={comparison.openModal}
        onCloseModal={comparison.closeModal}
      />
      {/* Header */}
      <div className="bg-muted shadow-sm border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-4 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Car rentals in {searchParams.pickupLocation}</h1>
              <p className="text-muted-foreground">
                {searchParams.pickupDate} {searchParams.pickupTime} - {searchParams.dropoffDate} {searchParams.dropoffTime} • 7 days
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <button className="bg-primary hover:bg-primary-600 text-primary-foreground px-6 py-2 rounded-lg font-semibold transition-colors duration-300">
                <Search className="inline mr-2" />
                Modify Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-10 py-6">
        {/* Sort Options — same pattern as HotelsList */}
        <div className="mb-2 flex flex-col gap-3  sm:gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-4">
          <div className="w-full min-w-0 lg:w-auto">
            <div
              className="relative z-10 w-full min-w-0 overflow-visible lg:hidden"
              ref={sortMenuRef}
            >
              <button
                type="button"
                id="car-sort-trigger"
                onClick={() => setSortMenuOpen((o) => !o)}
                aria-expanded={sortMenuOpen}
                aria-haspopup="listbox"
                aria-label={
                  mobileSortChosen
                    ? `Sort: ${CAR_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? "Best"}`
                    : "Sort by, open menu"
                }
                className="flex h-12 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-card px-4 py-2 text-left text-base font-medium text-foreground shadow-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-11 sm:text-sm"
              >
                <span className="min-w-0 truncate text-left font-medium text-foreground">
                  {mobileSortChosen
                    ? CAR_SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? "Sort by"
                    : "Sort by"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:h-4 sm:w-4 ${sortMenuOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {sortMenuOpen && (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(20rem,55vh)] w-full min-w-0 overflow-hidden overflow-y-auto rounded-lg border border-input bg-card shadow-lg"
                  role="listbox"
                  aria-labelledby="car-sort-trigger"
                >
                  <div className="py-1">
                    {CAR_SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={sortBy === opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setMobileSortChosen(true);
                          setSortMenuOpen(false);
                        }}
                        className={`flex w-full min-w-0 px-4 py-3 text-left text-sm transition-colors sm:py-2.5 ${sortBy === opt.id
                            ? "bg-primary/10 font-semibold text-primary"
                            : "text-foreground hover:bg-muted active:bg-muted"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden flex-wrap items-center gap-2 lg:flex lg:mb-0">
              <span className="mr-2 text-foreground">Sort by:</span>
              {CAR_SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`rounded-lg px-4 py-2 ${sortBy === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground hover:bg-card/80"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4 lg:w-auto lg:flex-nowrap lg:justify-end py-2 ">
            <div className="text-muted-foreground">
              {filteredCars.length} of {cars.length} cars available
            </div>
            <div className="flex overflow-hidden rounded-lg border border-input">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}
                title="List view"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}
                title="Grid view"
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters - Desktop */}
          <div className="lg:w-1/4 hidden lg:block">
            <FilterSidebar />
          </div>

          {/* Mobile Filters Button */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold flex items-center justify-center"
            >
              <Filter className="mr-2" />
              Show Filters
            </button>
          </div>

          {/* Mobile Filters Modal */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
              <div className="absolute left-0 top-0 h-full w-3/4 bg-card overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Filters</h2>
                  <button onClick={() => setShowMobileFilters(false)}>
                    <X className="text-2xl" />
                  </button>
                </div>
                <FilterSidebar />
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold mt-4"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Car Listings */}
          <div className="lg:w-3/4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="bg-card rounded-xl shadow-md p-8 text-center border border-border">
                <X className="text-4xl text-destructive mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No cars found</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your filters to see more results</p>
                <button
                  onClick={clearAllFilters}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>

                {/* Car Cards */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredCars.map(car => (
                      <CarCard key={car.id} car={car} variant="grid" />
                    ))}
                  </div>
                ) : (
                  filteredCars.map(car => (
                    <CarCard key={car.id} car={car} variant="list" />
                  ))
                )}

                {/* Pagination */}
                <div className="flex justify-center items-center mt-8 space-x-2">
                  <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                    Previous
                  </button>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-600">
                    1
                  </button>
                  <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                    2
                  </button>

                  <span className="px-2">...</span>
                  <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                    5
                  </button>
                  <button className="px-4 py-2 border border-input rounded-lg hover:bg-muted">
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Trust — themed card + motion (no custom gradients) */}
        <section
          className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card px-5 py-10 shadow-md sm:px-8 sm:py-12"
          aria-labelledby="car-trust-heading"
        >
          <motion.h3
            id="car-trust-heading"
            className="relative z-10 mb-3 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Why book with us?
          </motion.h3>
          <motion.p
            className="relative z-10 mx-auto mb-10 max-w-lg text-center text-sm text-muted-foreground sm:text-base"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{
              duration: reduceMotion ? 0 : 0.45,
              delay: reduceMotion ? 0 : 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Transparent pricing, real support, and deals you can trust on every rental.
          </motion.p>

          <div className="relative z-10 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {CAR_TRUST_POINTS.map(({ title, description, Icon, iconBg, iconColor, ring }, index) => (
              <motion.article
                key={title}
                className="group relative rounded-2xl border border-border bg-background/80 p-6 text-center shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:bg-muted/50 motion-safe:hover:shadow-md"
                initial={reduceMotion ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.1 + index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div
                  className={`relative mx-auto mb-5 flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl ${iconBg} ring-1 ${ring} transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3`}
                >
                  <Icon
                    className={`h-8 w-8 ${iconColor}`}
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <h4 className="mb-2 text-lg font-bold text-foreground">{title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                  {description}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Tips — themed layout + light motion */}
        <section
          className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card px-5 py-8 shadow-md sm:px-8 sm:py-10"
          aria-labelledby="car-rental-tips-heading"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" aria-hidden />

          <div className="mb-8 flex flex-col gap-3 sm:mb-9 sm:flex-row sm:items-center sm:justify-between">
            <motion.div
              className="flex items-center gap-3"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: reduceMotion ? 0 : 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                <Car className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div>
                <h3
                  id="car-rental-tips-heading"
                  className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                >
                  Tips for renting a car
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Quick checks before you confirm your booking.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {CAR_RENTAL_TIPS.map(({ title, Icon, items }, index) => (
              <motion.div
                key={title}
                className="group rounded-xl border border-border bg-background/80 p-5 transition-[border-color,box-shadow] duration-300 hover:border-primary/35 motion-safe:hover:shadow-md sm:p-6"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  delay: reduceMotion ? 0 : 0.08 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border transition-colors duration-300 group-hover:bg-primary/10 group-hover:ring-primary/25">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden />
                  </div>
                  <h4 className="pt-1.5 text-base font-bold text-foreground sm:text-lg">
                    {title}
                  </h4>
                </div>
                <ul className="space-y-3">
                  {items.map((line) => (
                    <li
                      key={line}
                      className="flex gap-3 text-sm leading-snug text-muted-foreground"
                    >
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span className="text-foreground/90">{line}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CarBook;