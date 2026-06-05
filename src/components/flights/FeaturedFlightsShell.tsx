"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { isRtlLocale } from "@/lib/i18n/rtl";
import { rtlDirProp, rtlTypographyClass } from "@/lib/i18n/rtl-typography";
import SectionHeading from "@/components/shared/SectionHeading";
import { Video } from "@/components/Video";

export const FEATURED_FLIGHT_IMAGE = "/images/featured/featuredflights.jpg";

type Props = {
  /** Async grid (e.g. Suspense + server fetch) or client-loaded cards; heading + hero render immediately. */
  cardsSlot: ReactNode;
  bgColor?: string;
  mainPading?: string;
};

export function FeaturedFlightsShell({ cardsSlot, bgColor = "bg-muted", mainPading = "py-10" }: Props) {
  const locale = useLocale();
  const t = useTranslations("Featured");

  return (
    <section className={`${bgColor} ${mainPading}`}>
      <div className="container mx-auto px-4 md:px-10 ">
        <SectionHeading title={t("flightsHeading")} subtitle={t("flightsSubtitle")} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <div className="relative rounded-2xl overflow-hidden h-full min-h-[280px] group">
              <div className="absolute inset-0">
                <Video />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
              </div>

              <div className="relative h-full flex flex-col justify-end p-8 min-h-[50vh]">
                <div
                  dir={rtlDirProp(locale)}
                  className={cn(
                    "mb-6",
                    isRtlLocale(locale) && rtlTypographyClass(locale),
                  )}
                >
                  <h3 className="text-3xl font-bold text-primary-foreground mb-4">
                    {t("flightsHeroTitle")}
                  </h3>
                  <p className="text-primary-foreground/90 text-lg ">{t("flightsHeroDescription")}</p>
                </div>

                <Link href="/flights#flight-search">
                  <button
                    type="button"
                    className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] text-lg flex items-center justify-center group shadow-md hover:shadow-lg"
                  >
                    {t("flightsCta")}
                    <ArrowRight
                      className="w-5 h-5 ml-2 transition-transform duration-200 group-hover:translate-x-1"
                      strokeWidth={2}
                    />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">{cardsSlot}</div>
        </div>
      </div>
    </section>
  );
}
