"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import HistoryTabs from "./HistoryTabs";

export default function HistoryClient() {
  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-6">Alert History</h1>
          <HistoryTabs />
        </div>
      </div>
    </div>
  );
}
