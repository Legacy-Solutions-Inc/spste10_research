"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import HistoryTabs from "./HistoryTabs";

export default function HistoryClient() {
  return (
    <div className="flex min-h-screen overflow-hidden bg-muted dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full py-8 px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            Alert History
          </h1>
          <HistoryTabs />
        </div>
      </div>
    </div>
  );
}
