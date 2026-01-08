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
    <div className="flex min-h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-6">Settings</h1>
          <SettingsForm initialData={initialData} userEmail={userEmail} />
        </div>
      </div>
    </div>
  );
}

