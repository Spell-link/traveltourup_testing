"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

const images: string[] = [
  "/images/hotels/hotel6.jpg",
  "/images/categories/category3.jpg",
  "/images/categories/category9.jpg",
  "/images/categories/category11.jpg",
];

const imageAlts: string[] = [
  "Luxury resort and coastline at golden hour",
  "Boutique hotel pool and palm trees",
  "Mountain view lodge and serene landscape",
  "Urban skyline hotel and twilight city lights",
];

type FadePreset = {
  initial: { opacity: number; x: string };
  animate: { opacity: number; x: string };
  exit: { opacity: number; x: string };
};

type SlideState = {
  image: string;
  imageIndex: number;
  preset: FadePreset;
  key: number;
};

/** Opacity + gentle horizontal drift only — no blur or scale on the photo layer (avoids soft/pixelated frames). */
const fadePresets: FadePreset[] = [
  {
    initial: { opacity: 0, x: "2.5%" },
    animate: { opacity: 1, x: "0%" },
    exit: { opacity: 0, x: "-1.5%" },
  },
  {
    initial: { opacity: 0, x: "-2.5%" },
    animate: { opacity: 1, x: "0%" },
    exit: { opacity: 0, x: "1.5%" },
  },
  {
    initial: { opacity: 0, x: "1.5%" },
    animate: { opacity: 1, x: "0%" },
    exit: { opacity: 0, x: "-2%" },
  },
  {
    initial: { opacity: 0, x: "-1.5%" },
    animate: { opacity: 1, x: "0%" },
    exit: { opacity: 0, x: "2%" },
  },
];

const fadePresetsReduced: FadePreset[] = fadePresets.map((p) => ({
  initial: { opacity: 0, x: "0%" },
  animate: { opacity: 1, x: "0%" },
  exit: { opacity: 0, x: "0%" },
}));

function getRandomItem<T>(items: T[], excludeIndex?: number): { item: T; index: number } {
  if (items.length === 1) {
    return { item: items[0], index: 0 };
  }

  let nextIndex = Math.floor(Math.random() * items.length);

  if (excludeIndex !== undefined) {
    while (nextIndex === excludeIndex) {
      nextIndex = Math.floor(Math.random() * items.length);
    }
  }

  return { item: items[nextIndex], index: nextIndex };
}

const SLIDE_INTERVAL_MS = 5500;
const CROSSFADE_DURATION_S = 1.1;
const travelEase = [0.4, 0, 0.2, 1] as const;

export default function RandomImageAnimation() {
  const reduceMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const presets = reduceMotion ? fadePresetsReduced : fadePresets;

  const [slide, setSlide] = useState<SlideState>(() => ({
    image: images[0],
    imageIndex: 0,
    preset: presets[0],
    key: 0,
  }));

  const advanceSlide = useCallback(() => {
    setSlide((current) => {
      const { item: nextImage, index: nextImageIndex } = getRandomItem(images, current.imageIndex);
      const presetIndex = presets.indexOf(current.preset);
      const { item: nextPreset } = getRandomItem(presets, presetIndex >= 0 ? presetIndex : undefined);

      return {
        image: nextImage,
        imageIndex: nextImageIndex,
        preset: nextPreset,
        key: current.key + 1,
      };
    });
  }, [presets]);

  useEffect(() => {
    images.forEach((src, i) => {
      if (i === 0) return;
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(advanceSlide, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPaused, advanceSlide]);

  const crossfadeDuration = reduceMotion ? 0.4 : CROSSFADE_DURATION_S;
  const kenBurnsDuration = reduceMotion ? 0 : (SLIDE_INTERVAL_MS - crossfadeDuration * 1000) / 1000;

  return (
    <div
      className="group relative h-full min-h-[inherit] w-full overflow-hidden rounded-2xl ring-1 ring-border/60 shadow-lg"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl ring-1 ring-inset ring-white/10"
        aria-hidden
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide.key}
          className="absolute inset-0 overflow-hidden"
          initial={slide.preset.initial}
          animate={slide.preset.animate}
          exit={slide.preset.exit}
          transition={{
            duration: crossfadeDuration,
            ease: travelEase,
          }}
        >
          {/* Overscan wrapper: image is larger than the frame so Ken Burns zoom stays sharp */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2 will-change-transform [transform:translateZ(0)] relative"
            initial={reduceMotion ? { scale: 1 } : { scale: 1 }}
            animate={reduceMotion ? { scale: 1 } : { scale: 1.06 }}
            transition={{
              duration: kenBurnsDuration > 0 ? kenBurnsDuration : 0.01,
              ease: "linear",
            }}
          >
            <Image
              src={slide.image}
              alt={imageAlts[slide.imageIndex] ?? "Travel destination showcase"}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 720px"
              className="object-cover"
              quality={92}
              priority={slide.key === 0}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/50 via-black/5 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-primary/12 via-transparent to-primary/5"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-transparent via-transparent to-black/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-0 z-10 h-2/3 w-2/3 rounded-full bg-white/[0.06] blur-3xl"
        aria-hidden
      />

      {/* Progress dots */}
      <div
        className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
        role="tablist"
        aria-label="Slideshow position"
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            role="tab"
            aria-selected={i === slide.imageIndex}
            aria-label={`Slide ${i + 1}`}
            onClick={() => {
              if (i === slide.imageIndex) return;
              setSlide((current) => ({
                image: images[i],
                imageIndex: i,
                preset: getRandomItem(presets).item,
                key: current.key + 1,
              }));
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === slide.imageIndex
                ? "w-5 bg-white/90"
                : "w-1.5 bg-white/40 hover:bg-white/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
