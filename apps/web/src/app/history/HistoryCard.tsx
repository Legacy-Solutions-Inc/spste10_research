"use client";

import type { HistoryItem } from "./utils";

interface HistoryCardProps {
  report: HistoryItem;
  onClick: () => void;
}

export default function HistoryCard({ report, onClick }: HistoryCardProps) {
  return (
    <div
      onClick={onClick}
      className="border rounded-md p-4 shadow-sm hover:shadow-md transition bg-white cursor-pointer"
    >
      <p className="text-sm font-semibold text-blue-900 mb-2">{report.type}</p>
      <p className="text-sm text-gray-700 mb-2">
        {report.name} – {report.location}
      </p>
      <p className="text-xs text-gray-500">
        {report.status === "accepted" ? "Accepted" : "Dismissed"} · {report.time}
      </p>
    </div>
  );
}

