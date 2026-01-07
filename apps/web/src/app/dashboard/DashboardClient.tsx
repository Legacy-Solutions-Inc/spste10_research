"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AlertsList from "@/components/AlertsList";
import type { Alert } from "@/types/alert";

// Dynamically import MapComponent to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

// Iloilo coordinates: 10.7202° N, 122.5621° E
const ILOILO_CENTER: [number, number] = [10.7202, 122.5621];

// Mock data - replace with actual data from Supabase
const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "Emergency Alert",
    location: "Poblacion Ilawod, Lambunao, Iloilo",
    timestamp: new Date().toISOString(),
    latitude: 10.7202,
    longitude: 122.5621,
    name: "Gary Bid",
    age: 32,
    bloodType: "O",
    sex: "Male",
  },
  {
    id: "2",
    type: "Emergency Report",
    location: "Poblacion mbun",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    latitude: 10.7302,
    longitude: 122.5721,
    name: "John Doe",
    description: "Road accident reported at the intersection. Multiple vehicles involved.",
    imageUrl: undefined, // Add image URL when available
  },
];

export default function DashboardClient() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleApprove = (alertId: string) => {
    // TODO: Update alert status in Supabase
    console.log("Approving alert:", alertId);
    // Example: Update alert status to 'approved'
    // const supabase = createClient();
    // await supabase.from('alerts').update({ status: 'approved' }).eq('id', alertId);
    
    // Remove alert from list or update its status
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const handleDismiss = (alertId: string) => {
    // TODO: Update alert status in Supabase
    console.log("Dismissing alert:", alertId);
    // Example: Update alert status to 'dismissed'
    // const supabase = createClient();
    // await supabase.from('alerts').update({ status: 'dismissed' }).eq('id', alertId);
    
    // Remove alert from list or update its status
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  // TODO: Fetch alerts from Supabase
  // useEffect(() => {
  //   const fetchAlerts = async () => {
  //     const supabase = createClient();
  //     const { data } = await supabase.from('alerts').select('*');
  //     if (data) setAlerts(data);
  //   };
  //   fetchAlerts();
  // }, []);

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Alerts List */}
        <div className="w-80 border-r border-gray-200 bg-white overflow-hidden flex flex-col">
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
            center={ILOILO_CENTER}
            onApprove={handleApprove}
            onDismiss={handleDismiss}
          />
        </div>
      </div>
    </div>
  );
}

