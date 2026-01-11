// Unified incident types matching database schema

export type IncidentStatus = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'completed';
export type ResponseStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';

// Database alert structure
export interface AlertRow {
  id: string;
  user_id: string;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  location_name: string | null;
  victim_name: string | null;
  victim_age: number | null;
  victim_blood_type: string | null;
  victim_sex: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

// Database report structure
export interface ReportRow {
  id: string;
  user_id: string;
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  location_name: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
}

// Responder assignment structure
export interface ResponderAssignment {
  id: string;
  alert_id: string | null;
  report_id: string | null;
  responder_id: string;
  assigned_at: string;
  response_status: ResponseStatus;
  responded_at: string | null;
}

// Unified incident type for display
export interface Incident {
  id: string;
  type: 'alert' | 'report';
  status: IncidentStatus;
  latitude: number;
  longitude: number;
  location_name: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
  canceled_at: string | null;
  user_id?: string; // User who created the alert/report
  // Alert-specific fields
  victim_name?: string | null;
  victim_age?: number | null;
  victim_blood_type?: string | null;
  victim_sex?: string | null;
  // Report-specific fields
  image_url?: string | null;
  description?: string | null;
  // Assignment info
  assignment?: ResponderAssignment | null;
  isAssigned?: boolean;
  assignmentStatus?: ResponseStatus;
}

// Helper function to convert alert to incident
export function alertToIncident(alert: AlertRow, assignment?: ResponderAssignment | null): Incident {
  return {
    id: alert.id,
    type: 'alert',
    status: alert.status,
    latitude: alert.latitude,
    longitude: alert.longitude,
    location_name: alert.location_name,
    timestamp: alert.created_at,
    created_at: alert.created_at,
    updated_at: alert.updated_at,
    canceled_at: alert.canceled_at,
    user_id: alert.user_id,
    victim_name: alert.victim_name,
    victim_age: alert.victim_age,
    victim_blood_type: alert.victim_blood_type,
    victim_sex: alert.victim_sex,
    assignment: assignment || null,
    isAssigned: !!assignment,
    assignmentStatus: assignment?.response_status,
  };
}

// Helper function to convert report to incident
export function reportToIncident(report: ReportRow, assignment?: ResponderAssignment | null): Incident {
  return {
    id: report.id,
    type: 'report',
    status: report.status,
    latitude: report.latitude,
    longitude: report.longitude,
    location_name: report.location_name,
    timestamp: report.created_at,
    created_at: report.created_at,
    updated_at: report.updated_at,
    canceled_at: report.canceled_at,
    user_id: report.user_id,
    image_url: report.image_url,
    description: report.description,
    assignment: assignment || null,
    isAssigned: !!assignment,
    assignmentStatus: assignment?.response_status,
  };
}
