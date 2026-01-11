import type { Incident } from "@/types/incident";

export interface HistoryItem {
  id: string;
  name: string;
  location: string;
  time: string;
  type: "Emergency Alert" | "Emergency Report";
  status: "accepted" | "dismissed";
  // For Emergency Alerts
  age?: number;
  bloodType?: string;
  sex?: string;
  // For Emergency Reports
  imageUrl?: string;
  description?: string;
  // Additional fields for modal
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convert Incident to HistoryItem format
 */
export function incidentToHistoryItem(
  incident: Incident,
  reporterNames?: Map<string, string>,
  alertCreatorNames?: Map<string, string>
): HistoryItem {
  // Map response_status to status
  const status: "accepted" | "dismissed" =
    incident.assignmentStatus === "accepted" ? "accepted" : "dismissed";

  // Extract name - for alerts use victim_name, fallback to alert creator name, then "Unknown"
  // For reports use reporter name from map
  const name =
    incident.type === "alert"
      ? incident.victim_name || alertCreatorNames?.get(incident.id) || "Unknown"
      : (reporterNames?.get(incident.id)) || "Unknown Reporter";

  return {
    id: incident.id,
    name,
    location: incident.location_name || "Unknown location",
    time: formatTimestamp(incident.created_at),
    type: incident.type === "alert" ? "Emergency Alert" : "Emergency Report",
    status,
    // Alert-specific fields
    age: incident.victim_age || undefined,
    bloodType: incident.victim_blood_type || undefined,
    sex: incident.victim_sex || undefined,
    // Report-specific fields
    imageUrl: incident.image_url || undefined,
    description: incident.description || undefined,
    // Additional fields for map/modal
    latitude: incident.latitude,
    longitude: incident.longitude,
    timestamp: incident.timestamp,
  };
}
