"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import SettingsForm from "./SettingsForm";

interface ProfileData {
  id?: string;
  full_name?: string | null;
  municipality?: string | null;
  province?: string | null;
  office_address?: string | null;
  email?: string | null;
  contact_number?: string | null;
}

interface SettingsClientProps {
  initialData: ProfileData | null;
  userEmail: string;
}

export default function SettingsClient({ initialData, userEmail }: SettingsClientProps) {
  return (
    <div className="flex min-h-screen overflow-hidden bg-muted dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative min-w-0 overflow-x-hidden">
        <div className="w-full py-6 px-4 md:px-6 lg:px-8">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Settings
          </h1>
          <SettingsForm initialData={initialData} userEmail={userEmail} />
        </div>
      </div>
    </div>
  );
}

