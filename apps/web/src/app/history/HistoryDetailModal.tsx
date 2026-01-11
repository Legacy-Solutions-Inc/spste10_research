"use client";

import { useState, useEffect } from "react";
import type { HistoryItem } from "./utils";
import { extractFilePath, getSignedUrl } from "@/lib/storageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertCircle,
  MapPin,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

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

  const handleDownloadImage = () => {
    if (!imageUrl) return;
    
    // Create anchor element and trigger download
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `report-image-${item.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAccepted = item.status === "accepted";

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl w-full md:w-[600px] p-0 bg-white dark:bg-slate-800">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {isReport ? (
                <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {item.type}
              </DialogTitle>
            </div>
            <DialogClose />
          </div>
          <DialogDescription className="flex items-center gap-2 mt-2">
            <Badge
              variant={isAccepted ? "default" : "secondary"}
              className={
                isAccepted
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600"
              }
            >
              {isAccepted ? (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {isAccepted ? "Accepted" : "Dismissed"}
            </Badge>
            <span className="text-sm text-muted-foreground" title={item.time}>
              {item.time}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[calc(90vh-200px)] px-6 py-4">
          <div className="space-y-6">
            {/* Reporter/Victim Name */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isReport ? "Reporter" : "Victim"}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {item.name}
              </p>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {item.location}
              </p>
            </div>

            {/* Image Section (for Reports) */}
            {isReport && (item.imageUrl || imageLoading) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Image</p>
                  <div className="space-y-2">
                    {imageLoading ? (
                      <div className="w-full h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Loading image...
                          </p>
                        </div>
                      </div>
                    ) : imageError || !imageUrl ? (
                      <div className="w-full h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Image not available
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Report"
                            className="w-full h-auto max-h-96 object-contain"
                            onError={() => {
                              setImageError(true);
                            }}
                          />
                        </div>
                        <Button
                          onClick={handleDownloadImage}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Image
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Description (for Reports) */}
            {isReport && item.description && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </>
            )}

            {/* Additional Fields (for Alerts) */}
            {!isReport && (
              <>
                {item.age !== undefined && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Age</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {item.age} years old
                      </p>
                    </div>
                  </>
                )}
                {item.bloodType && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Blood Type
                      </p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {item.bloodType}
                      </p>
                    </div>
                  </>
                )}
                {item.sex && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Sex</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {item.sex}
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <Button onClick={onClose} variant="secondary" className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

