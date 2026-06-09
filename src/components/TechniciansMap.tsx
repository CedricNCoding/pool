"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface TechPoint {
  id: string;
  name: string;
  service: string;
  lat: number | null;
  lng: number | null;
  company: string;
  color: string;
}

export default function TechniciansMap({
  points,
  onSelect,
}: {
  points: TechPoint[];
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [46.6, 2.5], // centre France
      zoom: 5,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // (Re)draw markers when points change
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds: [number, number][] = [];
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 5,
        color: p.color,
        fillColor: p.color,
        fillOpacity: 0.75,
        weight: 1,
      });
      marker.bindTooltip(`${p.name} — ${p.company}`, { direction: "top" });
      marker.on("click", () => onSelectRef.current?.(p.id));
      marker.addTo(layer);
      bounds.push([p.lat, p.lng]);
    }
    if (bounds.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(bounds).pad(0.15), { maxZoom: 8 });
      } catch {
        /* ignore */
      }
    }
  }, [points]);

  return <div ref={containerRef} className="w-full h-full rounded-lg" />;
}
