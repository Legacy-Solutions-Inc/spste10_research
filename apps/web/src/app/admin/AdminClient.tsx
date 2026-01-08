"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ResponderAccountCard from "./ResponderAccountCard";
import { createClient } from "@/lib/supabaseBrowser";

interface ResponderAccount {
  id: string;
  email: string;
  name?: string;
  municipality?: string;
  province?: string;
  office_address?: string;
  contact_number?: string;
  account_status?: "pending" | "approved" | "rejected";
  created_at?: string;
}

const getMockAccounts = (): ResponderAccount[] => {
  return [
    {
      id: "1",
      email: "responder1@example.com",
      name: "Municipality Office A",
      municipality: "Lambunao",
      province: "Iloilo",
      office_address: "Poblacion Ilawod, Lambunao, Iloilo",
      contact_number: "+63 912 345 6789",
      account_status: "pending",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "2",
      email: "responder2@example.com",
      name: "Municipality Office B",
      municipality: "Santa Barbara",
      province: "Iloilo",
      office_address: "Santa Barbara, Iloilo",
      contact_number: "+63 912 345 6790",
      account_status: "pending",
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "3",
      email: "responder3@example.com",
      name: "Municipality Office C",
      municipality: "Pavia",
      province: "Iloilo",
      office_address: "Pavia, Iloilo",
      contact_number: "+63 912 345 6791",
      account_status: "approved",
      created_at: new Date(Date.now() - 259200000).toISOString(),
    },
  ];
};

export default function AdminClient() {
  const [accounts, setAccounts] = useState<ResponderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const supabase = createClient();

      // Fetch all profiles (responders)
      // In production, add proper filtering and pagination
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      let accountsToFilter: ResponderAccount[] = [];

      if (fetchError) {
        // If profiles table doesn't exist, use mock data for demo
        console.warn("Profiles table may not exist. Using mock data:", fetchError);
        accountsToFilter = getMockAccounts();
      } else if (data && data.length > 0) {
        accountsToFilter = data as ResponderAccount[];
      } else {
        // Use mock data if no data found
        accountsToFilter = getMockAccounts();
      }

      // Apply filter
      if (filter !== "all") {
        accountsToFilter = accountsToFilter.filter(
          (account) => (account.account_status || "pending") === filter
        );
      }
      setAccounts(accountsToFilter);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Failed to fetch accounts. Using mock data for demonstration.");
      // Use mock data as fallback
      setAccounts(getMockAccounts());
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleApprove = async (accountId: string) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ account_status: "approved", updated_at: new Date().toISOString() })
        .eq("id", accountId);

      if (updateError) {
        console.error("Error approving account:", updateError);
        alert("Failed to approve account. This is a demo - in production, this would update the database.");
      } else {
        // Update local state and remove from list if filter is pending
      if (filter === "pending") {
        setAccounts((prev) => prev.filter((account) => account.id !== accountId));
      } else {
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, account_status: "approved" } : account
          )
        );
      }
      alert("Account approved successfully!");
      }
    } catch (err) {
      console.error("Error approving account:", err);
      alert("Failed to approve account. This is a demo - in production, this would update the database.");
      // Update local state anyway for demo purposes
      if (filter === "pending") {
        setAccounts((prev) => prev.filter((account) => account.id !== accountId));
      } else {
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, account_status: "approved" } : account
          )
        );
      }
    }
  };

  const handleReject = async (accountId: string) => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ account_status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", accountId);

      if (updateError) {
        console.error("Error rejecting account:", updateError);
        alert("Failed to reject account. This is a demo - in production, this would update the database.");
      } else {
        // Update local state and remove from list if filter is pending
      if (filter === "pending") {
        setAccounts((prev) => prev.filter((account) => account.id !== accountId));
      } else {
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, account_status: "rejected" } : account
          )
        );
      }
      alert("Account rejected.");
      }
    } catch (err) {
      console.error("Error rejecting account:", err);
      alert("Failed to reject account. This is a demo - in production, this would update the database.");
      // Update local state anyway for demo purposes
      if (filter === "pending") {
        setAccounts((prev) => prev.filter((account) => account.id !== accountId));
      } else {
        setAccounts((prev) =>
          prev.map((account) =>
            account.id === accountId ? { ...account, account_status: "rejected" } : account
          )
        );
      }
    }
  };

  const pendingCount = accounts.filter((a) => (a.account_status || "pending") === "pending").length;
  const approvedCount = accounts.filter((a) => a.account_status === "approved").length;
  const rejectedCount = accounts.filter((a) => a.account_status === "rejected").length;

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-6xl mx-auto py-8 px-6">
          <h1 className="text-2xl font-bold text-blue-900 mb-6">Admin Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Review and manage responder account requests
          </p>

          {/* Filter Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-full font-medium shadow transition ${
                filter === "pending"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-blue-900 hover:bg-gray-200"
              }`}
            >
              Pending {pendingCount > 0 && (
                <span className="ml-2 bg-white text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-4 py-2 rounded-full font-medium shadow transition ${
                filter === "approved"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-blue-900 hover:bg-gray-200"
              }`}
            >
              Approved {approvedCount > 0 && (
                <span className="ml-2 bg-white text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {approvedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-4 py-2 rounded-full font-medium shadow transition ${
                filter === "rejected"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-blue-900 hover:bg-gray-200"
              }`}
            >
              Rejected {rejectedCount > 0 && (
                <span className="ml-2 bg-white text-blue-900 rounded-full px-2 py-0.5 text-xs font-semibold">
                  {rejectedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full font-medium shadow transition ${
                filter === "all"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-blue-900 hover:bg-gray-200"
              }`}
            >
              All
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No {filter === "all" ? "" : filter} accounts found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <ResponderAccountCard
                  key={account.id}
                  account={account}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

