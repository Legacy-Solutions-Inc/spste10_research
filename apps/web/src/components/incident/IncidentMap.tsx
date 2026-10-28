"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Incident } from "@/types/incident";

// Lucide icon paths, inlined because Leaflet markers are plain HTML
const SIREN_PATH =
  '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>';
const CAMERA_PATH =
  '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>';
const BUILDING_PATH =
  '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>';

// OpenStreetMap's own tiles are fine for development and demos but not for production
// traffic (tile usage policy). For a pilot, point these at a keyed provider such as
// Stadia Maps or MapTiler (free tiers): NEXT_PUBLIC_MAP_TILE_URL / NEXT_PUBLIC_MAP_TILE_ATTRIBUTION.
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

type PinVariant = "alert" | "report" | "active";

const iconCache = new Map<string, L.DivIcon>();

function pinIcon(variant: PinVariant, type: Incident["type"], selected: boolean, pulse: boolean): L.DivIcon {
  const key = `${variant}-${type}-${selected}-${pulse}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const size = 34;
  const classes = ["agap-pin", `agap-pin--${variant}`, selected && "agap-pin--selected", pulse && "agap-pin--pulse"]
    .filter(Boolean)
    .join(" ");
  const icon = L.divIcon({
    className: "agap-marker",
    html: `<div class="${classes}"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${type === "alert" ? SIREN_PATH : CAMERA_PATH}</svg></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, 0],
  });
  iconCache.set(key, icon);
  return icon;
}

const officeIcon = L.divIcon({
  className: "agap-marker",
  html: `<div class="agap-pin agap-pin--office"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${BUILDING_PATH}</svg></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  tooltipAnchor: [15, 0],
});

interface IncidentMapProps {
  incidents: Incident[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** "active" draws pins in navy (incidents this office is handling) */
  variant?: "incoming" | "active";
  office?: { coordinates: [number, number]; located: boolean; approximate?: boolean } | null;
  fallbackCenter: [number, number];
  /** Space covered by an overlay on the left (the detail panel), so focused pins stay visible */
  leftInset?: number;
  /** Changes to this key re-fit the map to all pins (e.g. when switching tabs) */
  fitKey?: string;
  interactive?: boolean;
  /** Pulse Emergency Alert pins (they're waiting for someone); off for past incidents */
  pulseAlerts?: boolean;
}

/** Fits to all pins whenever fitKey changes or pins first appear. */
function FitToPins({ points, fitKey, leftInset }: { points: [number, number][]; fitKey: string; leftInset: number }) {
  const map = useMap();
  const lastFit = useRef<string | null>(null);

  useEffect(() => {
    const key = `${fitKey}:${points.length > 0}`;
    if (lastFit.current === key || points.length === 0) return;
    lastFit.current = key;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [leftInset + 48, 64], paddingBottomRight: [48, 48], maxZoom: 15 });
    }
  }, [map, points, fitKey, leftInset]);

  return null;
}

/** Redraw tiles when the container changes size (e.g. the sidebar collapses). */
function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function FocusSelected({ target, leftInset }: { target: [number, number] | null; leftInset: number }) {
  const map = useMap();
  const lat = target?.[0];
  const lng = target?.[1];

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const zoom = Math.max(map.getZoom(), 15);
    // Center the pin in the part of the map the detail panel doesn't cover
    const point = map.project([lat, lng], zoom).subtract([leftInset / 2, 0]);
    map.flyTo(map.unproject(point, zoom), zoom, { duration: 0.6 });
  }, [map, lat, lng, leftInset]);

  return null;
}

export default function IncidentMap({
  incidents,
  selectedId = null,
  onSelect,
  variant = "incoming",
  office,
  fallbackCenter,
  leftInset = 0,
  fitKey = "default",
  interactive = true,
  pulseAlerts = true,
}: IncidentMapProps) {
  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;

  const points = useMemo<[number, number][]>(() => {
    const pins = incidents.map((incident) => [incident.latitude, incident.longitude] as [number, number]);
    if (office?.located) pins.push(office.coordinates);
    return pins;
  }, [incidents, office]);

  return (
    <MapContainer
      center={office?.located ? office.coordinates : fallbackCenter}
      zoom={13}
      zoomControl={false}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={19} />
      {interactive && <ZoomControl position="bottomright" />}
      <InvalidateOnResize />
      <FitToPins points={points} fitKey={fitKey} leftInset={leftInset} />
      <FocusSelected target={selected ? [selected.latitude, selected.longitude] : null} leftInset={leftInset} />

      {office?.located && (
        <Marker position={office.coordinates} icon={officeIcon} keyboard={false} zIndexOffset={-100}>
          <Tooltip direction="right" className="agap-tooltip">
            {office.approximate ? "Your office (approximate area)" : "Your office"}
          </Tooltip>
        </Marker>
      )}

      {incidents.map((incident) => {
        const isSelected = incident.id === selectedId;
        const pinVariant: PinVariant = variant === "active" ? "active" : incident.type;
        const pulse = pulseAlerts && variant === "incoming" && incident.type === "alert";
        return (
          <Marker
            key={incident.id}
            position={[incident.latitude, incident.longitude]}
            icon={pinIcon(pinVariant, incident.type, isSelected, pulse)}
            zIndexOffset={isSelected ? 1000 : incident.type === "alert" ? 500 : 0}
            eventHandlers={onSelect ? { click: () => onSelect(incident.id) } : undefined}
            title={incident.location_name || "Incident"}
          >
            <Tooltip direction="right" className="agap-tooltip">
              {incident.location_name || "Location not named"}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
