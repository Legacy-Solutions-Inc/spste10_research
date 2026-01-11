"use client";

import type { HistoryItem } from "./utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, FileText, CheckCircle2, XCircle } from "lucide-react";

interface HistoryCardProps {
  report: HistoryItem;
  onClick: () => void;
}

export default function HistoryCard({ report, onClick }: HistoryCardProps) {
  const isAlert = report.type === "Emergency Alert";
  const isAccepted = report.status === "accepted";

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {isAlert ? (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            )}
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {report.type}
            </CardTitle>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isAccepted
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400"
            }`}
          >
            {isAccepted ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span>{isAccepted ? "Accepted" : "Dismissed"}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
          {report.name} – {report.location}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {report.time}
        </p>
      </CardContent>
    </Card>
  );
}

