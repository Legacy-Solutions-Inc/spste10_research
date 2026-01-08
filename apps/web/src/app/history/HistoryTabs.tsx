"use client";

import { useState, useMemo } from "react";
import HistoryCard from "./HistoryCard";
import HistoryDetailModal from "./HistoryDetailModal";
import { useFetchHistory } from "@/hooks/useFetchHistory";
import { incidentToHistoryItem, type HistoryItem } from "./utils";

export default function HistoryTabs() {
  const [activeTab, setActiveTab] = useState<"accepted" | "dismissed">("accepted");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  
  const { incidents, reporterNames, loading, error } = useFetchHistory();

  // Convert incidents to HistoryItem format
  const historyItems = useMemo(() => {
    return incidents.map((incident) => incidentToHistoryItem(incident, reporterNames));
  }, [incidents, reporterNames]);

  // Filter by status
  const acceptedItems = useMemo(() => {
    return historyItems.filter((item) => item.status === "accepted");
  }, [historyItems]);

  const dismissedItems = useMemo(() => {
    return historyItems.filter((item) => item.status === "dismissed");
  }, [historyItems]);

  const acceptedCount = acceptedItems.length;
  const dismissedCount = dismissedItems.length;

  const handleCardClick = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading history...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <p className="text-gray-500 text-sm">Failed to load history. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 rounded-full font-medium shadow transition ${
            activeTab === "accepted"
              ? "bg-blue-900 text-white"
              : "bg-gray-100 text-blue-900 hover:bg-gray-200"
          }`}
        >
          Accepted {acceptedCount > 0 && (
            <span className="ml-2 bg-white text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold">
              {acceptedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("dismissed")}
          className={`px-4 py-2 rounded-full font-medium shadow transition ${
            activeTab === "dismissed"
              ? "bg-blue-900 text-white"
              : "bg-gray-100 text-blue-900 hover:bg-gray-200"
          }`}
        >
          Dismissed {dismissedCount > 0 && (
            <span className="ml-2 bg-white text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold">
              {dismissedCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === "accepted" ? (
          acceptedItems.length > 0 ? (
            acceptedItems.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => setSelectedItem(report)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No accepted reports found.</p>
            </div>
          )
        ) : (
          dismissedItems.length > 0 ? (
            dismissedItems.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => setSelectedItem(report)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No dismissed reports found.</p>
            </div>
          )
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <HistoryDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

