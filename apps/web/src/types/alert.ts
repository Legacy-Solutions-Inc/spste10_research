// Legacy Alert type - kept for backward compatibility
// New code should use Incident from types/incident.ts
export interface Alert {
  id: string;
  type: "Emergency Alert" | "Emergency Report";
  location: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  name?: string;
  age?: number;
  bloodType?: string;
  sex?: string;
  // For Emergency Reports
  imageUrl?: string;
  description?: string;
  // Assignment info
  isAssigned?: boolean;
  assignmentStatus?: string;
}

// Helper to convert Incident to legacy Alert format for components
// Note: imageUrl will be a storage path that needs to be converted to signed URL
export function incidentToAlert(incident: import('./incident').Incident): Alert {
  return {
    id: incident.id,
    type: incident.type === 'alert' ? 'Emergency Alert' : 'Emergency Report',
    location: incident.location_name || 'Unknown location',
    timestamp: incident.timestamp,
    latitude: incident.latitude,
    longitude: incident.longitude,
    name: incident.victim_name || undefined,
    age: incident.victim_age || undefined,
    bloodType: incident.victim_blood_type || undefined,
    sex: incident.victim_sex || undefined,
    imageUrl: incident.image_url || undefined, // This may be a storage path
    description: incident.description || undefined,
    isAssigned: incident.isAssigned,
    assignmentStatus: incident.assignmentStatus,
  };
}

