"use client";

import type { Alert } from "@/types/alert";

interface HistoryListProps {
  history: Alert[];
  selectedIncident: Alert | null;
  onSelectIncident: (incident: Alert) => void;
}

export default function HistoryList({
  history,
  selectedIncident,
  onSelectIncident,
}: HistoryListProps) {
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
        <h2 className="text-2xl font-bold text-blue-900 mb-2">Current Incident</h2>
      </div>

      <div className="space-y-3">
        {history.map((incident) => (
          <div
            key={incident.id}
            id={`incident-${incident.id}`}
            onClick={() => onSelectIncident(incident)}
            className={`rounded-lg border p-4 mb-3 cursor-pointer transition ${
              selectedIncident?.id === incident.id
                ? "border-blue-900 bg-blue-50 shadow-md"
                : "border-gray-200 bg-white hover:shadow"
            }`}
          >
            <div className="mb-2">
              <span className="text-red-600 font-semibold text-sm">
                {incident.type}
              </span>
            </div>
            <div className="mb-2">
              <p className="text-gray-700 text-sm">{incident.location}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">{formatTimestamp(incident.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

