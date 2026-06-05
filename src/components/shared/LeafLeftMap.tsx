"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Location = {
  id?: string | number;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  locations: Location[];
  height?: string;
  zoom?: number;
};

const JEDDAH_CENTER: [number, number] = [21.4858, 39.1925];

type LeafletElement = HTMLElement & { _leaflet_id?: number };

function cleanupLeafletOnElement(el: LeafletElement) {
  const id = el._leaflet_id;
  if (id == null) return;
  try {
    const existing = L.DomUtil.get(el) as unknown as L.Map | undefined;
    if (existing && typeof existing.remove === "function") {
      existing.off();
      existing.remove();
    }
  } catch {
    /* container already detached */
  } finally {
    delete el._leaflet_id;
  }
}

function isMapUsable(map: L.Map | null | undefined): map is L.Map {
  if (!map) return false;
  const removed = (map as L.Map & { _removed?: boolean })._removed;
  if (removed) return false;
  try {
    const container = map.getContainer();
    return Boolean(container?.isConnected);
  } catch {
    return false;
  }
}

function safeInvalidateSize(map: L.Map) {
  if (!isMapUsable(map)) return;
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* torn down mid-frame */
  }
}

function safeRemoveMap(map: L.Map | null) {
  if (!map) return;
  try {
    map.off();
    if (typeof map.stop === "function") map.stop();
    map.remove();
  } catch {
    /* already removed */
  }
}

function normalizeLocations(locations: Location[]): Location[] {
  return locations.filter(
    (l) =>
      typeof l.lat === "number" &&
      typeof l.lng === "number" &&
      !Number.isNaN(l.lat) &&
      !Number.isNaN(l.lng) &&
      !(l.lat === 0 && l.lng === 0),
  );
}

function locationsSignature(locations: Location[]): string {
  return normalizeLocations(locations)
    .map((l) => `${l.id ?? ""}:${l.lat},${l.lng}:${l.name}`)
    .join("|");
}

export default function LeafletMap({
  locations,
  height = "500px",
  zoom = 12,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const markerIconRef = useRef<L.Icon | null>(null);

  const validLocations = useMemo(() => normalizeLocations(locations), [locations]);
  const locSignature = useMemo(() => locationsSignature(locations), [locations]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    cleanupLeafletOnElement(el);

    const map = L.map(el, {
      zoomAnimation: false,
      markerZoomAnimation: false,
      fadeAnimation: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    markerIconRef.current = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      safeInvalidateSize(map);
    });

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!cancelled) safeInvalidateSize(map);
          })
        : null;
    resizeObserver?.observe(el);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      markersLayer.current = null;
      markerIconRef.current = null;
      safeRemoveMap(mapInstance.current);
      mapInstance.current = null;
      cleanupLeafletOnElement(el);
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const group = markersLayer.current;
    const icon = markerIconRef.current;
    if (!map || !group || !icon || !isMapUsable(map)) return;

    let cancelled = false;

    const applyMarkers = () => {
      if (cancelled || !isMapUsable(map)) return;

      try {
        group.clearLayers();

        for (const loc of validLocations) {
          const safeName = String(loc.name)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          L.marker([loc.lat, loc.lng], { icon })
            .addTo(group)
            .bindPopup(`<b>${safeName}</b>`);
        }

        if (validLocations.length > 1) {
          map.fitBounds(
            L.latLngBounds(validLocations.map((l) => [l.lat, l.lng] as [number, number])),
            { padding: [28, 28], maxZoom: 14, animate: false },
          );
        } else if (validLocations.length === 1) {
          map.setView([validLocations[0].lat, validLocations[0].lng], zoom, { animate: false });
        } else {
          map.setView(JEDDAH_CENTER, 11, { animate: false });
        }

        safeInvalidateSize(map);
      } catch {
        /* map removed while updating markers (filter change / modal close) */
      }
    };

    if (map.whenReady) {
      map.whenReady(applyMarkers);
    } else {
      applyMarkers();
    }

    return () => {
      cancelled = true;
    };
  }, [locSignature, zoom, validLocations]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%" }}
      className="z-0 rounded-lg border border-border"
      aria-label="Map"
    />
  );
}
