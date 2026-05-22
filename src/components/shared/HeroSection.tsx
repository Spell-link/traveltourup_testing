"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import { Plane, Car, Building2, LayoutGrid } from "lucide-react";
import FlightsTab from "@/components/flights/FlightsTab";
import CarsTab from "@/components/cars/CarsTab";
import HotelsTab from "@/components/hotels/HotelsTab";
import MoreServicesTab from "@/components/MoreServicesTab";

function HeroSection() {
  const t = useTranslations("Hero");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState("flights");
  const [tripType, setTripType] = useState("one-way");
  const [cabinClass, setCabinClass] = useState("economy");
  const [travelers, setTravelers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [showTravelerDropdown, setShowTravelerDropdown] = useState(false);

  const rotatingWords = useMemo(
    () => Array.from({ length: 11 }, (_, i) => t(`rotate${i}`)),
    [t],
  );
  const [wordIndex, setWordIndex] = useState(0);
  const [animState, setAnimState] = useState("enter"); // "enter" | "exit"

  useEffect(() => {
    const displayDuration = 2400;
    const exitDuration = 500;

    const timer = setInterval(() => {
      setAnimState("exit");
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % rotatingWords.length);
        setAnimState("enter");
      }, exitDuration);
    }, displayDuration);

    return () => clearInterval(timer);
  }, [rotatingWords.length]);

  const tabs = [
    {
      id: "flights",
      label: t("tabFlights"),
      icon: <Plane className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />,
    },
    {
      id: "hotels",
      label: t("tabHotels"),
      icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />,
    },
    {
      id: "cars",
      label: t("tabCars"),
      icon: <Car className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />,
    },
    {
      id: "more",
      label: t("tabMore"),
      icon: <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />,
    },
  ];

  return (
    <div className="relative w-full bg-muted/60">
      {/* Hero background - Next/Image with priority for LCP optimization */}
      <div
        className={cn(
          "relative flex w-full flex-col justify-center overflow-hidden",
          "min-h-[min(48vh,360px)] sm:min-h-[400px] md:min-h-[480px]",
          "pt-8 pb-20 sm:pt-12 sm:pb-24 md:pt-20 md:pb-28",
          "[clip-path:ellipse(150%_100%_at_50%_0%)] md:[clip-path:ellipse(120%_100%_at_50%_0%)]",
          isRtlLocale(locale) ? "items-end" : "items-center",
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <video
            autoPlay
            muted
            loop
            playsInline
            ref={(el) => {
              if (el) el.playbackRate = 0.6;
            }}
        
            className="
              absolute inset-0
             h-full w-full
              object-cover
              object-[50%_62%]P
               scale-[1.34]
              sm:object-[50%_58%]
               sm:scale-[1.2]
                md:object-center
                md:scale-100
            "
          >
            <source src="/videos/bgVideo.mp4" type="video/mp4" />
          </video>
          {/* <div className="absolute inset-0 bg-primary/60" /> */}
        </div>

        {/* Content */}
        <div className="relative z-10 w-full container mx-auto px-4 sm:px-4 max-w-7xl">
          <div dir={rtlDirProp(locale)} className={rtlTypographyClass(locale)}>
            <h1 className="text-2xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-sm">
              {t("headlinePrefix")}{" "}
              <span className="inline-block italic font-extrabold ps-1" style={{ verticalAlign: "bottom" }}>
                <span
                  key={wordIndex}
                  className={`inline-block drop-shadow-md ${animState === "enter" ? "hero-word-enter" : "hero-word-exit"
                    }`}
                >
                  {rotatingWords[wordIndex]}
                </span>
              </span>
            </h1>
            <p className="text-sm sm:text-lg md:text-2xl text-white/95 mb-4 sm:mb-6 max-w-xl">
              {t("tagline")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs container - positioned to overlap curved edge */}
      <div className="relative z-20 -mt-16 sm:-mt-20 md:-mt-36 container mx-auto px-3 sm:px-4 pb-6">
        <div className="max-w-7xl mx-auto bg-background rounded-xl shadow-xl border border-border/50">
          {/* Tab Headers - Same for both mobile and desktop */}
          <div className="grid grid-cols-4 md:flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 py-2.5 px-2.5 sm:py-4 sm:px-6 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 ${activeTab === tab.id
                  ? "border-primary text-primary bg-primary/10 rounded-t-lg -mb-px"
                  : "border-transparent text-foreground hover:text-primary hover:bg-muted"
                  }`}
              >
                <div className="text-primary">{tab.icon}</div>
                <span
                  className={
                    activeTab === tab.id ? "text-primary" : "text-foreground"
                  }
                >
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {activeTab === "flights" && (
              <FlightsTab
                tripType={tripType}
                setTripType={setTripType}
                cabinClass={cabinClass}
                setCabinClass={setCabinClass}
                travelers={travelers}
                setTravelers={setTravelers}
                showTravelerDropdown={showTravelerDropdown}
                setShowTravelerDropdown={setShowTravelerDropdown}
              />
            )}
            {activeTab === "hotels" && <HotelsTab />}
            {activeTab === "cars" && <CarsTab />}
            {activeTab === "more" && <MoreServicesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;