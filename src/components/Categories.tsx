"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/navigation";

interface Category {
  id: number;
  name: string;
  image: string | { src: string };
}

interface CategoriesProps {
  categories: Category[];
}

const Categories = ({ categories }: CategoriesProps) => {
  const t = useTranslations("Categories");
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!swiperInstance || !prevRef.current || !nextRef.current) return;
    const nav = swiperInstance?.params?.navigation;
    if (nav && typeof nav === "object") {
      (nav as { prevEl?: HTMLElement; nextEl?: HTMLElement }).prevEl = prevRef.current;
      (nav as { prevEl?: HTMLElement; nextEl?: HTMLElement }).nextEl = nextRef.current;
      if (!swiperInstance.navigation) return;
      swiperInstance.navigation.destroy();
      swiperInstance.navigation.init();
      swiperInstance.navigation.update();
    }
  }, [swiperInstance]);

  useEffect(() => {
    if (!swiperInstance) return;
    const updateNav = () => {
      setCurrentIndex(swiperInstance.realIndex);
    };
    updateNav();
    swiperInstance.on("slideChange", updateNav);
    swiperInstance.on("resize", updateNav);
    return () => {
      swiperInstance.off("slideChange", updateNav);
      swiperInstance.off("resize", updateNav);
    };
  }, [swiperInstance]);

  if (!categories?.length) return null;

  return (
    <section className="py-8 md:py-16   bg-background">
      <div className="container mx-auto  px-4 md:px-10">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="relative">
          <Swiper
            modules={[Navigation, Autoplay]}
            loop
            spaceBetween={24}
            slidesPerView={1}
            slidesPerGroup={1}
            grabCursor
            speed={400}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            breakpoints={{
              480: { slidesPerView: 2, spaceBetween: 20 },
              640: { slidesPerView: 2.5, spaceBetween: 24 },
              768: { slidesPerView: 3, spaceBetween: 24 },
              1024: { slidesPerView: 4, spaceBetween: 24 },
              1280: { slidesPerView: 5, spaceBetween: 24 },
            }}
            navigation={{
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            }}
            onSwiper={setSwiperInstance}
            className="!pb-4"
          >
            {categories.map((category) => (
              <SwiperSlide key={category.id}>
                <div className="w-full max-w-full mx-auto sm:max-w-none">
                  <Card
                    variant="category"
                    data={category}
                    actionHref="/flights"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Prev button — on top of leftmost card */}
          <button
            ref={prevRef}
            type="button"
            aria-label={t("prevAria")}
            className="absolute left-2 top-[45%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-primary hover:text-primary-foreground text-white flex items-center justify-center transition-colors shadow-md"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} aria-hidden />
          </button>

          {/* Next button — on top of rightmost card */}
          <button
            ref={nextRef}
            type="button"
            aria-label={t("nextAria")}
            className="absolute right-2 top-[45%] -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-primary hover:text-primary-foreground text-white flex items-center justify-center transition-colors shadow-md"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} aria-hidden />
          </button>

          {/* Pagination — pill-style indicators */}
          <div className="flex justify-center gap-2 mt-6 mb-0">
            {categories.map((_, index) => (
              <button
                key={index}
                onClick={() => swiperInstance?.slideToLoop(index)}
                aria-label={t("goToSlide", { n: index + 1 })}
                className={`rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-10 h-2.5 bg-primary"
                    : "w-2.5 h-2.5 bg-muted hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;