"use client";

import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Alert } from "@/types/alert";

// Fix for default marker icons in Next.js
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

// Blue icon for selected incidents - using a blue marker icon
const BlueIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentHistoryProps {
  incidents: Alert[];
  selectedIncident: Alert | null;
  center: [number, number];
  onMarkerClick: (incident: Alert) => void;
}

export interface MapComponentHistoryRef {
  zoomToIncident: (incident: Alert) => void;
}

// Component to handle map view updates
function MapViewUpdater({
  selectedIncident,
  onMapReady,
}: {
  selectedIncident: Alert | null;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (selectedIncident) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 15, {
        animate: true,
      });
    }
  }, [selectedIncident, map]);

  return null;
}

const MapComponentHistory = forwardRef<
  MapComponentHistoryRef,
  MapComponentHistoryProps
>(({ incidents, selectedIncident, center, onMarkerClick }, ref) => {
  const mapInstanceRef = useRef<L.Map | null>(null);

  useImperativeHandle(ref, () => ({
    zoomToIncident: (incident: Alert) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([incident.latitude, incident.longitude], 15, {
          animate: true,
        });
      }
    },
  }));

  const handleMapReady = (map: L.Map) => {
    mapInstanceRef.current = map;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full w-full">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewUpdater
          selectedIncident={selectedIncident}
          onMapReady={handleMapReady}
        />
        {incidents.map((incident) => {
          const isSelected = selectedIncident?.id === incident.id;
          return (
            <Marker
              key={incident.id}
              position={[incident.latitude, incident.longitude]}
              icon={isSelected ? BlueIcon : DefaultIcon}
              eventHandlers={{
                click: () => {
                  onMarkerClick(incident);
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <div className="mb-2">
                    <span className="text-red-600 font-semibold text-sm">
                      {incident.type}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm mb-1">{incident.location}</p>
                  <p className="text-gray-400 text-xs">
                    {formatTimestamp(incident.timestamp)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});

MapComponentHistory.displayName = "MapComponentHistory";

export default MapComponentHistory;

