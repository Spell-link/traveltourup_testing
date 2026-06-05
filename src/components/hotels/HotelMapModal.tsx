"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { MapPin, X } from "lucide-react";

const LeafletMap = dynamic(() => import("@/components/shared/LeafLeftMap"), {
  ssr: false,
  loading: () => (
    <div
      className="h-[280px] w-full animate-pulse rounded-lg border border-border bg-muted"
      aria-hidden
    />
  ),
});

export type HotelMapLocation = {
  id?: string | number;
  name: string;
  lat: number;
  lng: number;
};

type HotelMapModalProps = {
  open: boolean;
  onClose: () => void;
  locations: HotelMapLocation[];
};

export default function HotelMapModal({
  open,
  onClose,
  locations,
}: HotelMapModalProps) {
  const hr = useTranslations("Hotels.results");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={hr("closeMapAria")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-map-dialog-title"
        className="relative z-10 flex max-h-[min(90vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <h2
              id="hotel-map-dialog-title"
              className="truncate text-lg font-bold text-foreground"
            >
              {hr("mapLocationsTitle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={hr("closeMapAria")}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="shrink-0 border-b border-border px-4 py-2 text-xs text-muted-foreground sm:px-5">
          {hr("mapModalFootnote", { count: locations.length })}
        </p>
        <div className="min-h-[280px] flex-1 overflow-hidden p-4 sm:p-5">
          <LeafletMap locations={locations} height="min(55vh, 480px)" zoom={12} />
        </div>
      </div>
    </div>
  );
}
