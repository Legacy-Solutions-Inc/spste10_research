"use client";

import type { Alert } from "@/types/alert";

interface AlertsListProps {
  alerts: Alert[];
  selectedAlert: Alert | null;
  onSelectAlert: (alert: Alert) => void;
}

export default function AlertsList({
  alerts,
  selectedAlert,
  onSelectAlert,
}: AlertsListProps) {
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
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">
          {alerts.length}
        </h2>
        <h3 className="text-lg font-semibold text-gray-800">
          Current Incident
        </h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert(alert)}
            className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-md ${
              selectedAlert?.id === alert.id
                ? "border-blue-900 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span
                className={`text-sm font-semibold ${
                  alert.type === "Emergency Alert"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {alert.type}
              </span>
              {alert.isAssigned && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    alert.assignmentStatus === "accepted"
                      ? "bg-green-100 text-green-700"
                      : alert.assignmentStatus === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {alert.assignmentStatus === "accepted"
                    ? "Accepted"
                    : alert.assignmentStatus === "rejected"
                    ? "Rejected"
                    : "Pending"}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">Location:</p>
              <p className="text-gray-600">{alert.location}</p>
            </div>
            {alert.name && (
              <div className="text-sm text-gray-700 mt-2">
                <p className="font-medium mb-1">Victim:</p>
                <p className="text-gray-600">
                  {alert.name}
                  {alert.age && `, ${alert.age} years old`}
                  {alert.bloodType && `, Blood Type: ${alert.bloodType}`}
                </p>
              </div>
            )}
            {alert.description && (
              <div className="text-sm text-gray-700 mt-2">
                <p className="font-medium mb-1">Description:</p>
                <p className="text-gray-600 line-clamp-2">{alert.description}</p>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              {formatTimestamp(alert.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

