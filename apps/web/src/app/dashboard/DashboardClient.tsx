"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AlertsList from "@/components/AlertsList";
import type { Alert } from "@/types/alert";
import { useFetchIncidents } from "@/hooks/useFetchIncidents";
import { useCreateAssignment } from "@/hooks/useCreateAssignment";
import { useUpdateAssignment } from "@/hooks/useUpdateAssignment";
import { useResponderLocation } from "@/hooks/useResponderLocation";
import { incidentToAlert } from "@/types/alert";
import type { Incident } from "@/types/incident";

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

// Iloilo coordinates: 10.7202° N, 122.5621° E (fallback)
const ILOILO_CENTER: [number, number] = [10.7202, 122.5621];

export default function DashboardClient() {
  const { incidents, loading, error, refetch } = useFetchIncidents();
  const { createAssignment, loading: creatingAssignment } = useCreateAssignment();
  const { updateAssignment, loading: updatingAssignment } = useUpdateAssignment();
  const { coordinates: responderCoordinates, loading: loadingLocation, address: responderAddress, error: locationError } = useResponderLocation();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Debug logging for responder location
  useEffect(() => {
    console.log("[DashboardClient] Responder location state:", {
      coordinates: responderCoordinates,
      loading: loadingLocation,
      address: responderAddress,
      error: locationError,
    });
  }, [responderCoordinates, loadingLocation, responderAddress, locationError]);

  // Convert incidents to alerts format for components
  useEffect(() => {
    const convertedAlerts = incidents.map(incidentToAlert);
    setAlerts(convertedAlerts);
  }, [incidents]);

  const handleApprove = async (alertId: string) => {
    setActionError(null);
    
    try {
      // Find the incident
      const incident = incidents.find((inc) => inc.id === alertId);
      if (!incident) {
        throw new Error("Incident not found");
      }

      // If already assigned, update the assignment
      if (incident.assignment) {
        await updateAssignment({
          assignmentId: incident.assignment.id,
          responseStatus: 'accepted',
        });
      } else {
        // Create new assignment with accepted status
        await createAssignment({
          incidentId: alertId,
          incidentType: incident.type,
          responseStatus: 'accepted',
        });
      }

      // Refetch incidents to get updated data
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to accept incident";
      setActionError(errorMessage);
      console.error("Error accepting incident:", err);
    }
  };

  const handleDismiss = async (alertId: string) => {
    setActionError(null);
    
    try {
      // Find the incident
      const incident = incidents.find((inc) => inc.id === alertId);
      if (!incident) {
        throw new Error("Incident not found");
      }

      // If already assigned, update the assignment
      if (incident.assignment) {
        await updateAssignment({
          assignmentId: incident.assignment.id,
          responseStatus: 'rejected',
        });
      } else {
        // Create new assignment with rejected status
        await createAssignment({
          incidentId: alertId,
          incidentType: incident.type,
          responseStatus: 'rejected',
        });
      }

      // Refetch incidents to get updated data
      refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reject incident";
      setActionError(errorMessage);
      console.error("Error rejecting incident:", err);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading incidents...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Alerts List */}
        <div className="w-80 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
          {actionError && (
            <div className="bg-red-50 border-b border-red-200 p-3">
              <p className="text-sm text-red-700">{actionError}</p>
            </div>
          )}
          <AlertsList
            alerts={alerts}
            selectedAlert={selectedAlert}
            onSelectAlert={setSelectedAlert}
          />
        </div>

        {/* Right Panel - Map */}
        <div className="flex-1 relative">
          <MapComponent
            alerts={alerts}
            selectedAlert={selectedAlert}
            center={loadingLocation ? ILOILO_CENTER : responderCoordinates}
            responderLocation={loadingLocation ? null : responderCoordinates}
            onApprove={handleApprove}
            onDismiss={handleDismiss}
          />
          {(creatingAssignment || updatingAssignment) && (
            <div className="absolute top-4 right-4 bg-blue-900 text-white px-4 py-2 rounded-md shadow-lg">
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

