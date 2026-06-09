"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack bundling.
// Self-hosted under /public/leaflet so no external (unpkg) request is made —
// keeps the map working behind a hardened CSP.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface InterventionMapProps {
  lat: number;
  lng: number;
  radiusKm: number;
  name?: string;
}

export default function InterventionMap({
  lat,
  lng,
  radiusKm,
  name,
}: InterventionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: radiusKm > 200 ? 6 : radiusKm > 100 ? 7 : radiusKm > 50 ? 8 : 10,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    const marker = L.marker([lat, lng]);
    if (name) marker.bindPopup(`<strong>${name}</strong>`);
    marker.addTo(map);

    L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "#3B82F6",
      fillColor: "#3B82F6",
      fillOpacity: 0.12,
      weight: 2,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, radiusKm, name]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
