"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Alert } from "@/types/alert";
import { isStoragePath, extractFilePath, getSignedUrl } from "@/lib/storageUtils";

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

// Helper function to create icon with fallback
const createIconWithFallback = (iconPath: string, fallback: L.Icon): L.Icon => {
  return new L.Icon({
    iconUrl: iconPath,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    shadowUrl: shadowUrl,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
    // If icon fails to load, Leaflet will show broken image
    // We'll handle this by checking if icon exists and using fallback
  });
};

// Custom icons for different alert types
// Note: Place icon files at /public/icons/alert-icon.png and /public/icons/report-icon.png
// If icons don't exist, markers will use DefaultIcon as fallback
const alertIconPath = "/icons/alert-icon.png";
const reportIconPath = "/icons/report-icon.png";

// Create icons - will fallback to DefaultIcon if custom icons don't exist
const alertIcon = createIconWithFallback(alertIconPath, DefaultIcon);
const reportIcon = createIconWithFallback(reportIconPath, DefaultIcon);

// Custom icon for responder location (blue marker)
const responderIcon = L.divIcon({
  className: "responder-marker",
  html: `<div style="
    width: 30px;
    height: 30px;
    background-color: #1e40af;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
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
  const [iconsAvailable, setIconsAvailable] = useState({ alert: false, report: false });
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // Check if custom icons exist and are loadable
  useEffect(() => {
    const checkIconExists = async (path: string, type: "alert" | "report") => {
      try {
        const response = await fetch(path, { method: "HEAD" });
        if (response.ok) {
          setIconsAvailable((prev) => ({ ...prev, [type]: true }));
        }
      } catch {
        // Icon doesn't exist or failed to load, use DefaultIcon
        setIconsAvailable((prev) => ({ ...prev, [type]: false }));
      }
    };

    checkIconExists(alertIconPath, "alert");
    checkIconExists(reportIconPath, "report");
  }, []);

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

  // Get the appropriate icon with fallback to DefaultIcon
  const getIcon = (isReport: boolean) => {
    if (isReport) {
      return iconsAvailable.report ? reportIcon : DefaultIcon;
    }
    return iconsAvailable.alert ? alertIcon : DefaultIcon;
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
              <div className="bg-blue-600 text-white p-2 rounded shadow">
                <p className="text-sm font-semibold">Your Location</p>
                <p className="text-xs text-blue-100">Responder Office</p>
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
                    <div className="bg-blue-900 text-white p-4 rounded-lg shadow-lg max-w-[260px]">
                      <p className="font-bold text-sm mb-2">Emergency Report</p>
                      <p className="text-sm text-white mb-1">
                        <span className="font-semibold">Location:</span> {alert.location}
                      </p>
                      {alert.name && (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Reporter:</span> {alert.name}
                        </p>
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
                            <div className="mb-3 mt-2 rounded overflow-hidden bg-gray-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt="Report"
                                className="w-full h-auto max-h-32 object-cover"
                                onError={(e) => {
                                  console.error(`[MapComponent] Image failed to load for ${alert.id}:`, imageUrl);
                                  console.error(`[MapComponent] Original imageUrl:`, alert.imageUrl);
                                  // If image fails to load, show placeholder
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="mb-3 mt-2 bg-gray-700 rounded p-2 text-xs text-gray-300 text-center min-h-[80px] flex items-center justify-center">Image failed to load</div>';
                                  }
                                }}
                                onLoad={() => {
                                  console.log(`[MapComponent] Image loaded successfully for ${alert.id}`);
                                }}
                              />
                            </div>
                          );
                        } else if (alert.imageUrl) {
                          // Has image URL but signed URL not ready yet or failed to generate
                          // Show loading state, but also log for debugging
                          console.log(`[MapComponent] Image URL exists but not loaded yet for ${alert.id}:`, alert.imageUrl);
                          return (
                            <div className="mb-3 mt-2 bg-gray-700 rounded p-2 text-xs text-gray-300 text-center min-h-[80px] flex items-center justify-center">
                              Loading image...
                            </div>
                          );
                        } else {
                          // No image URL in database
                          return (
                            <div className="mb-3 mt-2 bg-gray-700 rounded p-2 text-xs text-gray-300 text-center min-h-[80px] flex items-center justify-center">
                              No image available
                            </div>
                          );
                        }
                      })()}
                      {/* Report description */}
                      {alert.description ? (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Description:</span> {alert.description}
                        </p>
                      ) : (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Description:</span> No description provided
                        </p>
                      )}

                      <div className="flex justify-between mt-4 gap-2">
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="bg-white text-blue-900 font-semibold py-1 px-4 rounded-full text-sm shadow hover:opacity-90 transition flex-1"
                        >
                          DISMISS
                        </button>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          className="bg-white text-blue-900 font-semibold py-1 px-4 rounded-full text-sm shadow hover:opacity-90 transition flex-1"
                        >
                          APPROVE
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Emergency Alert expanded view
                    <div className="bg-blue-900 text-white p-4 rounded-lg shadow-lg max-w-[260px]">
                      <p className="font-bold text-sm mb-2">Emergency Alert</p>
                      {alert.name && (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Name:</span> {alert.name}
                        </p>
                      )}
                      <p className="text-sm text-white mb-1">
                        <span className="font-semibold">Location:</span> {alert.location}
                      </p>
                      {alert.age !== undefined && (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Age:</span> {alert.age}
                        </p>
                      )}
                      {alert.bloodType && (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Blood Type:</span> {alert.bloodType}
                        </p>
                      )}
                      {alert.sex && (
                        <p className="text-sm text-white mb-1">
                          <span className="font-semibold">Sex:</span> {alert.sex}
                        </p>
                      )}

                      <div className="flex justify-between mt-4 gap-2">
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="bg-white text-blue-900 font-semibold py-1 px-4 rounded-full text-sm shadow hover:opacity-90 transition flex-1"
                        >
                          DISMISS
                        </button>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          className="bg-white text-blue-900 font-semibold py-1 px-4 rounded-full text-sm shadow hover:opacity-90 transition flex-1"
                        >
                          APPROVE
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  // Compact view
                  <div className="bg-blue-900 text-white p-3 rounded-lg shadow-lg">
                    <p className="text-sm font-bold mb-1">{alert.type}</p>
                    <p className="text-sm font-medium mb-2">{alert.location}</p>
                    <p
                      className="text-xs text-gray-200 mt-1 cursor-pointer hover:text-white transition"
                      onClick={() => handleViewDetails(alert.id)}
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

