"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Alert } from "@/types/alert";
import { isStoragePath, extractFilePath, getSignedUrl } from "@/lib/storageUtils";
import { AlertCircle, FileText, MapPin, Clock, User, CheckCircle2, XCircle } from "lucide-react";

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

// Helper function to create custom Leaflet divIcon with SVG icon
const createLucideIconMarker = (
  iconSvgPath: string,
  color: string,
  size: number = 36
): L.DivIcon => {
  return L.divIcon({
    className: "custom-lucide-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="${size - 8}" height="${size - 8}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${iconSvgPath}
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

// SVG paths for lucide-react icons
// AlertCircle path
const alertCirclePath = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
// FileText path
const fileTextPath = '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>';

// Custom icons using lucide-react paths
const alertMarkerIcon = createLucideIconMarker(alertCirclePath, "#ef4444", 36); // Red
const reportMarkerIcon = createLucideIconMarker(fileTextPath, "#f97316", 36); // Orange

// Custom icon for responder location (blue marker)
const responderIcon = L.divIcon({
  className: "responder-marker",
  html: `<div style="
    width: 36px;
    height: 36px;
    background-color: #2563eb;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapComponentProps {
  alerts: Alert[];
  selectedAlert: Alert | null;
  center: [number, number];
  responderLocation?: [number, number] | null;
  onApprove?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

// Component to handle map view updates when alert is selected
function MapViewUpdater({ selectedAlert }: { selectedAlert: Alert | null }) {
  const map = useMap();

  useEffect(() => {
    if (selectedAlert) {
      map.setView([selectedAlert.latitude, selectedAlert.longitude], 15);
    }
  }, [selectedAlert, map]);

  return null;
}

// Component to handle map center updates when center prop changes
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      console.log(`[MapCenterUpdater] Updating map center to:`, center);
      map.setView(center, 13);
    }
  }, [center, map]);

  return null;
}

export default function MapComponent({
  alerts,
  selectedAlert,
  center,
  responderLocation,
  onApprove,
  onDismiss,
}: MapComponentProps) {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for report images
  useEffect(() => {
    const fetchImageUrls = async () => {
      const urlMap: Record<string, string> = {};

      for (const alert of alerts) {
        if (alert.imageUrl && alert.type === "Emergency Report") {
          console.log(`[MapComponent] Processing image for alert ${alert.id}:`, alert.imageUrl);

          // If it's already a full HTTP/HTTPS URL that's not a storage URL, use as-is
          if (alert.imageUrl.startsWith("http://") || alert.imageUrl.startsWith("https://")) {
            // Check if it's a Supabase storage URL (needs signed URL) or external URL (use as-is)
            if (alert.imageUrl.includes("/storage/v1/object/public/")) {
              // Public URL, use as-is
              urlMap[alert.id] = alert.imageUrl;
              console.log(`[MapComponent] Using public URL for ${alert.id}`);
            } else if (!alert.imageUrl.includes("/storage/v1/")) {
              // External URL, use as-is
              urlMap[alert.id] = alert.imageUrl;
              console.log(`[MapComponent] Using external URL for ${alert.id}`);
            } else {
              // Signed URL, use as-is
              urlMap[alert.id] = alert.imageUrl;
              console.log(`[MapComponent] Using signed URL for ${alert.id}`);
            }
          } else {
            // It's a storage path, need to get signed URL
            const filePath = extractFilePath(alert.imageUrl, "report-images");
            console.log(`[MapComponent] Extracted file path for ${alert.id}:`, filePath);

            if (filePath) {
              try {
                const signedUrl = await getSignedUrl("report-images", filePath);
                if (signedUrl) {
                  urlMap[alert.id] = signedUrl;
                  console.log(`[MapComponent] Got signed URL for ${alert.id}`);
                } else {
                  console.warn(`[MapComponent] Failed to get signed URL for ${alert.id}, path: ${filePath}. This may be due to RLS policies.`);
                }
              } catch (err) {
                console.error(`[MapComponent] Exception getting signed URL for ${alert.id}:`, err);
              }
            } else {
              console.error(`[MapComponent] Could not extract file path for ${alert.id}, original: ${alert.imageUrl}`);
            }
          }
        }
      }

      console.log(`[MapComponent] Final image URLs:`, urlMap);
      setImageUrls(urlMap);
    };

    if (alerts.length > 0) {
      fetchImageUrls();
    }
  }, [alerts]);

  // Get the appropriate icon
  const getIcon = (isReport: boolean) => {
    return isReport ? reportMarkerIcon : alertMarkerIcon;
  };

  const handleViewDetails = (alertId: string) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };

  const handleApprove = (alertId: string) => {
    if (onApprove) {
      onApprove(alertId);
    }
    setExpandedAlertId(null);
  };

  const handleDismiss = (alertId: string) => {
    if (onDismiss) {
      onDismiss(alertId);
    }
    setExpandedAlertId(null);
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
        <MapCenterUpdater center={center} />
        <MapViewUpdater selectedAlert={selectedAlert} />
        {/* Responder location marker */}
        {responderLocation && (
          <Marker position={responderLocation} icon={responderIcon}>
            <Popup>
              <div className="bg-blue-600 text-white p-3 rounded-xl shadow-lg">
                <p className="text-sm font-semibold">Your Location</p>
                <p className="text-xs text-blue-100 mt-1">Responder Office</p>
              </div>
            </Popup>
          </Marker>
        )}
        {alerts.map((alert) => {
          const isExpanded = expandedAlertId === alert.id;
          const isReport = alert.type === "Emergency Report";
          // Use custom icon based on alert type, fallback to DefaultIcon if custom icons not available
          const icon = getIcon(isReport);

          return (
            <Marker
              key={alert.id}
              position={[alert.latitude, alert.longitude]}
              icon={icon}
            >
              <Popup>
                {isExpanded ? (
                  // Expanded view - different content for alerts vs reports
                  isReport ? (
                    // Emergency Report expanded view
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl max-w-[280px]">
                      {/* Header with Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Emergency Report</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{alert.location}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>

                      {/* Reporter */}
                      {alert.name && (
                        <div className="flex items-start gap-2 mb-3">
                          <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">Reporter:</span> {alert.name}
                          </p>
                        </div>
                      )}
                      {/* Report image */}
                      {(() => {
                        // Check if we have a signed URL ready
                        const signedUrl = imageUrls[alert.id];
                        // Check if it's already a full URL
                        const fullUrl = alert.imageUrl && (alert.imageUrl.startsWith("http://") || alert.imageUrl.startsWith("https://")) ? alert.imageUrl : null;
                        const imageUrl = signedUrl || fullUrl;

                        if (imageUrl) {
                          return (
                            <div className="mb-3 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt="Report"
                                className="w-full h-auto max-h-40 object-cover"
                                onError={(e) => {
                                  console.error(`[MapComponent] Image failed to load for ${alert.id}:`, imageUrl);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="mb-3 rounded-lg bg-slate-100 dark:bg-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400 text-center min-h-[100px] flex items-center justify-center border border-slate-200 dark:border-slate-600">Image failed to load</div>';
                                  }
                                }}
                              />
                            </div>
                          );
                        } else if (alert.imageUrl) {
                          return (
                            <div className="mb-3 rounded-lg bg-slate-100 dark:bg-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400 text-center min-h-[100px] flex items-center justify-center border border-slate-200 dark:border-slate-600">
                              Loading image...
                            </div>
                          );
                        } else {
                          return (
                            <div className="mb-3 rounded-lg bg-slate-100 dark:bg-slate-700 p-4 text-xs text-slate-500 dark:text-slate-400 text-center min-h-[100px] flex items-center justify-center border border-slate-200 dark:border-slate-600">
                              No image available
                            </div>
                          );
                        }
                      })()}

                      {/* Report description */}
                      {alert.description && (
                        <div className="mb-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {alert.description}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold py-2 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Emergency Alert expanded view
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl max-w-[280px]">
                      {/* Header with Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Emergency Alert</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{alert.location}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>

                      {/* Victim Details */}
                      {alert.name && (
                        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{alert.name}</p>
                              {(alert.age || alert.bloodType || alert.sex) && (
                                <div className="mt-1.5 space-y-1">
                                  {alert.age !== undefined && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">Age:</span> {alert.age} years old
                                    </p>
                                  )}
                                  {alert.bloodType && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">Blood Type:</span> {alert.bloodType}
                                    </p>
                                  )}
                                  {alert.sex && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">Sex:</span> {alert.sex}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold py-2 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Dismiss</span>
                        </button>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-sm hover:shadow transition-all duration-200"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  // Compact view
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      {isReport ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <FileText className="w-3 h-3" />
                          <span>Report</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>Alert</span>
                        </div>
                      )}
                    </div>
                    <div className="mb-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{alert.location}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      </p>
                    </div>
                    <p
                      className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(alert.id);
                      }}
                    >
                      Click to view details
                    </p>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

