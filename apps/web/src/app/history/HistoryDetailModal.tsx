"use client";

interface HistoryItem {
  id: string;
  name: string;
  location: string;
  time: string;
  type: "Emergency Alert" | "Emergency Report";
  status: "accepted" | "dismissed";
  age?: number;
  bloodType?: string;
  sex?: string;
  imageUrl?: string;
  description?: string;
}

interface HistoryDetailModalProps {
  item: HistoryItem;
  onClose: () => void;
}

export default function HistoryDetailModal({
  item,
  onClose,
}: HistoryDetailModalProps) {
  const isReport = item.type === "Emergency Report";

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-900 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{item.type}</h2>
              <p className="text-blue-200 text-sm">
                {item.status === "accepted" ? "Accepted" : "Dismissed"} · {item.time}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isReport ? (
            // Emergency Report Details
            <>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Reporter</p>
                <p className="text-lg text-gray-900">{item.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Location</p>
                <p className="text-lg text-gray-900">{item.location}</p>
              </div>
              {item.imageUrl && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Image</p>
                  <div className="rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt="Report"
                      className="w-full h-auto max-h-64 object-cover"
                    />
                  </div>
                </div>
              )}
              {item.description && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{item.description}</p>
                </div>
              )}
            </>
          ) : (
            // Emergency Alert Details
            <>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Name</p>
                <p className="text-lg text-gray-900">{item.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Location</p>
                <p className="text-lg text-gray-900">{item.location}</p>
              </div>
              {item.age !== undefined && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Age</p>
                  <p className="text-lg text-gray-900">{item.age} years old</p>
                </div>
              )}
              {item.bloodType && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Blood Type</p>
                  <p className="text-lg text-gray-900">{item.bloodType}</p>
                </div>
              )}
              {item.sex && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Sex</p>
                  <p className="text-lg text-gray-900">{item.sex}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 rounded-b-lg border-t">
          <button
            onClick={onClose}
            className="w-full bg-blue-900 text-white font-semibold py-2 px-6 rounded-md hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

