"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import SectionHeading from "./shared/SectionHeading";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";

/** Static headline USD amounts (trip bundles); formatted via CurrencyProvider. */
const SPECIAL_USD_AMOUNTS = [5000, 3500, 4200, 2800, 3200] as const;

const SpecialCard = () => {
  const locale = useLocale();
  const rtl = isRtlLocale(locale);
  const t = useTranslations("WinterSpecial");
  const { formatFromUsd } = useCurrency();

  const names = useMemo(
    () => ({
      destSwitzerland: t("destSwitzerland"),
      destNorway: t("destNorway"),
      destIceland: t("destIceland"),
      destAustria: t("destAustria"),
      destFinland: t("destFinland"),
    }),
    [t],
  );

  const priceFrom = (index: number) =>
    t("priceFrom", { price: formatFromUsd(SPECIAL_USD_AMOUNTS[index], locale) });

  const imgAlt = t("cardImageAlt");

  return (
    <div>
      <div className="container mx-auto px-4 md:px-10">
        {/* Heading */}
        <div className={cn("mb-12", !rtl && "text-center")}>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} align="center" />
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1  lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="grid grid-cols-2 md:grid-cols-1 grid-rows-1 md:grid-rows-2 gap-4">
            <div className="relative group overflow-hidden rounded-xl">
              <Image
                src="/images/categories/category1.jpg"
                alt={imgAlt}
                width={800}
                height={600}
                className="w-full h-[200px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute top-4 start-4 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                <h3 className="font-semibold text-sm">{names.destSwitzerland}</h3>
                <p className="text-xs">{priceFrom(0)}</p>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-xl">
              <Image
                src="/images/categories/category2.jpg"
                alt={imgAlt}
                width={800}
                height={600}
                className="w-full h-[200px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute top-4 start-4 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                <h3 className="font-semibold text-sm">{names.destNorway}</h3>
                <p className="text-xs">{priceFrom(1)}</p>
              </div>
            </div>
          </div>

        
          <div className="row-span-1 relative group overflow-hidden rounded-xl h-[320px] md:h-full">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="h-full w-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
            >
              <source src="/videos/winterSpecial.mp4" type="video/mp4" />
            </video>

         
          </div>
          {/* Right column */}
          <div className="grid grid-cols-2 md:grid-cols-1 grid-rows-1 md:grid-rows-2 gap-4">
            <div className="relative group overflow-hidden rounded-xl">
              <Image
                src="/images/categories/category4.jpg"
                alt={imgAlt}
                width={800}
                height={600}
                className="w-full h-[200px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute top-4 start-4 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                <h3 className="font-semibold text-sm">{names.destAustria}</h3>
                <p className="text-xs">{priceFrom(3)}</p>
              </div>
            </div>

            <div className="relative group overflow-hidden rounded-xl">
              <Image
                src="/images/categories/category5.jpg"
                alt={imgAlt}
                width={800}
                height={600}
                className="w-full h-[200px] object-cover rounded-xl transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute top-4 start-4 bg-black/40 backdrop-blur-sm text-white px-3 py-2 rounded-lg">
                <h3 className="font-semibold text-sm">{names.destFinland}</h3>
                <p className="text-xs">{priceFrom(4)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialCard;
