"use client";

import { useState, useEffect } from "react";
import type { HistoryItem } from "./utils";
import { isStoragePath, extractFilePath, getSignedUrl } from "@/lib/storageUtils";

interface HistoryDetailModalProps {
  item: HistoryItem;
  onClose: () => void;
}

export default function HistoryDetailModal({
  item,
  onClose,
}: HistoryDetailModalProps) {
  const isReport = item.type === "Emergency Report";
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch signed URL for report images
  useEffect(() => {
    const fetchImageUrl = async () => {
      if (!item.imageUrl || !isReport) {
        setImageUrl(null);
        return;
      }

      // If it's already a full HTTP/HTTPS URL that's not a storage URL, use as-is
      if (item.imageUrl.startsWith("http://") || item.imageUrl.startsWith("https://")) {
        // Check if it's a Supabase storage URL (needs signed URL) or external URL (use as-is)
        if (item.imageUrl.includes("/storage/v1/object/public/")) {
          // Public URL, use as-is
          setImageUrl(item.imageUrl);
        } else if (!item.imageUrl.includes("/storage/v1/")) {
          // External URL, use as-is
          setImageUrl(item.imageUrl);
        } else {
          // Signed URL, use as-is
          setImageUrl(item.imageUrl);
        }
        return;
      }

      // It's a storage path, need to get signed URL
      setImageLoading(true);
      setImageError(false);
      
      const filePath = extractFilePath(item.imageUrl, "report-images");
      
      if (filePath) {
        try {
          const signedUrl = await getSignedUrl("report-images", filePath);
          if (signedUrl) {
            setImageUrl(signedUrl);
          } else {
            setImageError(true);
          }
        } catch (err) {
          console.error("Error fetching signed URL for history image:", err);
          setImageError(true);
        }
      } else {
        setImageError(true);
      }
      
      setImageLoading(false);
    };

    fetchImageUrl();
  }, [item.imageUrl, isReport]);

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
              {(item.imageUrl || imageLoading) && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Image</p>
                  <div className="rounded-lg overflow-hidden bg-gray-100">
                    {imageLoading ? (
                      <div className="w-full h-64 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-500">Loading image...</p>
                        </div>
                      </div>
                    ) : imageError || !imageUrl ? (
                      <div className="w-full h-64 flex items-center justify-center bg-gray-200">
                        <p className="text-sm text-gray-500">Image not available</p>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imageUrl}
                        alt="Report"
                        className="w-full h-auto max-h-64 object-cover"
                        onError={() => {
                          setImageError(true);
                        }}
                      />
                    )}
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

