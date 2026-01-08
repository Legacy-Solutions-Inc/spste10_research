"use client";

import { useState } from "react";
import HistoryCard from "./HistoryCard";
import HistoryDetailModal from "./HistoryDetailModal";

interface HistoryItem {
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
}

// Mock data for accepted reports
const acceptedReports: HistoryItem[] = [
  {
    id: "1",
    name: "Gary Bid",
    location: "Poblacion Ilawod, Lambunao, Iloilo",
    time: "Jan 7, 2026, 11:00 PM",
    type: "Emergency Alert",
    status: "accepted",
    age: 32,
    bloodType: "O",
    sex: "Male",
  },
  {
    id: "2",
    name: "Maria Santos",
    location: "Santa Barbara, Iloilo",
    time: "Jan 7, 2026, 10:30 PM",
    type: "Emergency Report",
    status: "accepted",
    description: "Road accident reported at the intersection. Multiple vehicles involved. Emergency services requested.",
    imageUrl: undefined,
  },
  {
    id: "3",
    name: "Juan Dela Cruz",
    location: "Pavia, Iloilo",
    time: "Jan 7, 2026, 9:15 PM",
    type: "Emergency Alert",
    status: "accepted",
    age: 45,
    bloodType: "A",
    sex: "Male",
  },
];

// Mock data for dismissed reports
const dismissedReports: HistoryItem[] = [
  {
    id: "4",
    name: "John Doe",
    location: "San Miguel, Iloilo",
    time: "Jan 7, 2026, 8:45 PM",
    type: "Emergency Report",
    status: "dismissed",
    description: "False alarm - no emergency situation found at the reported location.",
    imageUrl: undefined,
  },
  {
    id: "5",
    name: "Jane Smith",
    location: "Oton, Iloilo",
    time: "Jan 7, 2026, 7:20 PM",
    type: "Emergency Alert",
    status: "dismissed",
    age: 28,
    bloodType: "B",
    sex: "Female",
  },
];

export default function HistoryTabs() {
  const [activeTab, setActiveTab] = useState<"accepted" | "dismissed">("accepted");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const acceptedCount = acceptedReports.length;
  const dismissedCount = dismissedReports.length;

  const handleCardClick = (item: HistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

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
          acceptedReports.length > 0 ? (
            acceptedReports.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => handleCardClick(report)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No accepted reports found.</p>
            </div>
          )
        ) : (
          dismissedReports.length > 0 ? (
            dismissedReports.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => handleCardClick(report)}
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
        <HistoryDetailModal item={selectedItem} onClose={handleCloseModal} />
      )}
    </div>
  );
}

