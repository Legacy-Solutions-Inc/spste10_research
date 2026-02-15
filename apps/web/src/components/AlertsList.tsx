"use client";

import type { Alert } from "@/types/alert";
import { AlertCircle, FileText, MapPin, Clock, User, Inbox } from "lucide-react";

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
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) {
      return "Just now";
    } else if (diffInMins < 60) {
      return `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const formatFullTimestamp = (timestamp: string) => {
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
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-baseline gap-3 mb-2">
          <h2 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">
            {alerts.length}
          </h2>
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Current Incidents
        </h3>
      </div>

      {/* Incident Cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {alerts.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
              No incidents at this time
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              All clear! Check back later for new emergency incidents.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isAlert = alert.type === "Emergency Alert";
            const isSelected = selectedAlert?.id === alert.id;

            return (
              <div
                key={alert.id}
                onClick={() => onSelectAlert(alert)}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                  isSelected
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Header with Badge */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        isAlert
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {isAlert ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>{isAlert ? "Alert" : "Report"}</span>
                    </div>
                  </div>
                  {alert.isAssigned && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        alert.assignmentStatus === "accepted"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : alert.assignmentStatus === "rejected"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
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

                {/* Location */}
                <div className="flex items-start gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {alert.location}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTimestamp(alert.timestamp)}
                  </p>
                </div>

                {/* Victim Details (for Alerts) */}
                {isAlert && alert.name && (
                  <div className="flex items-start gap-2 mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-medium">{alert.name}</p>
                      {(alert.age || alert.bloodType) && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {alert.age && `${alert.age} years old`}
                          {alert.age && alert.bloodType && " • "}
                          {alert.bloodType && `Blood Type: ${alert.bloodType}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Description (for Reports) */}
                {!isAlert && alert.description && (
                  <div className="mb-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                )}

                {/* Full Timestamp Tooltip */}
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  {formatFullTimestamp(alert.timestamp)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

