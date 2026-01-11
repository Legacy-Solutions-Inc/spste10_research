"use client";

import { useState, useMemo } from "react";
import HistoryCard from "./HistoryCard";
import HistoryDetailModal from "./HistoryDetailModal";
import { useFetchHistory } from "@/hooks/useFetchHistory";
import { incidentToHistoryItem, type HistoryItem } from "./utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox } from "lucide-react";

export default function HistoryTabs() {
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

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading history...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg">
        <p className="text-red-600 dark:text-red-400 mb-4 font-medium">Error: {error}</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Failed to load history. Please try refreshing the page.
        </p>
      </div>
    );
  }

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
        {message}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-500">
        Check back later for new incidents.
      </p>
    </div>
  );

  return (
    <div>
      <Tabs defaultValue="accepted" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-200 dark:bg-slate-800">
          <TabsTrigger
            value="accepted"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-700 dark:data-[state=inactive]:text-slate-300 data-[state=inactive]:border data-[state=inactive]:border-slate-300 dark:data-[state=inactive]:border-slate-600"
          >
            Accepted
            {acceptedCount > 0 && (
              <span className="ml-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 text-xs font-semibold">
                {acceptedCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="dismissed"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-700 dark:data-[state=inactive]:text-slate-300 data-[state=inactive]:border data-[state=inactive]:border-slate-300 dark:data-[state=inactive]:border-slate-600"
          >
            Dismissed
            {dismissedCount > 0 && (
              <span className="ml-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 text-xs font-semibold">
                {dismissedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accepted" className="space-y-4 mt-0">
          {acceptedItems.length > 0 ? (
            acceptedItems.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => setSelectedItem(report)}
              />
            ))
          ) : (
            <EmptyState message="No accepted alerts yet." />
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4 mt-0">
          {dismissedItems.length > 0 ? (
            dismissedItems.map((report) => (
              <HistoryCard
                key={report.id}
                report={report}
                onClick={() => setSelectedItem(report)}
              />
            ))
          ) : (
            <EmptyState message="No dismissed alerts yet." />
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedItem && (
        <HistoryDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

