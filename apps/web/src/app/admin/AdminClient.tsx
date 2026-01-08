"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import ResponderAccountCard from "./ResponderAccountCard";
import { createClient } from "@/lib/supabaseBrowser";

interface ResponderAccount {
  id: string;
  email: string | null;
  full_name: string | null;
  municipality: string | null;
  province: string | null;
  office_address: string | null;
  contact_number: string | null;
  account_status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminClient() {
  const [allAccounts, setAllAccounts] = useState<ResponderAccount[]>([]);
  const [accounts, setAccounts] = useState<ResponderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const supabase = createClient();

      // Fetch profiles with responder_profiles joined
      // Only get profiles that have responder_profiles (role='responder')
      // @ts-ignore - Supabase types may not be fully generated
      const { data: profilesRaw, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          role,
          created_at,
          responder_profiles (
            municipality,
            province,
            office_address,
            contact_number,
            account_status,
            created_at
          )
        `)
        .eq("role", "responder")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setError("Failed to fetch accounts: " + profilesError.message);
        setAllAccounts([]);
        setAccounts([]);
        return;
      }

      // Type assertion for profiles data
      type ProfileWithResponderProfile = {
        id: string;
        email: string | null;
        full_name: string | null;
        role: string | null;
        created_at: string;
        responder_profiles: {
          municipality: string | null;
          province: string | null;
          office_address: string | null;
          contact_number: string | null;
          account_status: "pending" | "approved" | "rejected";
          created_at: string;
        } | {
          municipality: string | null;
          province: string | null;
          office_address: string | null;
          contact_number: string | null;
          account_status: "pending" | "approved" | "rejected";
          created_at: string;
        }[] | null;
      };

      const profiles = profilesRaw as ProfileWithResponderProfile[] | null;

      // Transform the data to match ResponderAccount interface
      const allAccountsData: ResponderAccount[] = (profiles || [])
        .filter((profile): profile is ProfileWithResponderProfile => 
          profile !== null && profile !== undefined && profile.responder_profiles !== null
        ) // Only include profiles with responder_profiles
        .map((profile) => {
          const responderProfile = Array.isArray(profile.responder_profiles)
            ? profile.responder_profiles[0]
            : profile.responder_profiles;

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            municipality: responderProfile?.municipality || null,
            province: responderProfile?.province || null,
            office_address: responderProfile?.office_address || null,
            contact_number: responderProfile?.contact_number || null,
            account_status: responderProfile?.account_status || "pending",
            created_at: profile.created_at,
          };
        });

      // Store all accounts
      setAllAccounts(allAccountsData);

      // Apply filter to get displayed accounts
      if (filter !== "all") {
        const filtered = allAccountsData.filter(
          (account) => account.account_status === filter
        );
        setAccounts(filtered);
      } else {
        setAccounts(allAccountsData);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Failed to fetch accounts: " + (err instanceof Error ? err.message : "Unknown error"));
      setAllAccounts([]);
      setAccounts([]);
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
      // Update responder_profiles account_status to 'approved'
      // Profile role is already 'responder' (set during registration)
      const { error: updateError } = await supabase
        .from("responder_profiles")
        // @ts-ignore - Supabase types may not be fully generated
        .update({ account_status: "approved" })
        .eq("id", accountId);

      if (updateError) {
        console.error("Error approving account:", updateError);
        alert("Failed to approve account: " + updateError.message);
      } else {
        alert("Account approved successfully!");
        // Refresh data from server to get updated counts
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Error approving account:", err);
      alert("Failed to approve account. Please try again.");
    }
  };

  const handleReject = async (accountId: string) => {
    try {
      const supabase = createClient();
      // Update responder_profiles account_status to 'rejected'
      const { error: updateError } = await supabase
        .from("responder_profiles")
        // @ts-ignore - Supabase types may not be fully generated
        .update({ account_status: "rejected" })
        .eq("id", accountId);

      if (updateError) {
        console.error("Error rejecting account:", updateError);
        alert("Failed to reject account: " + updateError.message);
      } else {
        alert("Account rejected.");
        // Refresh data from server to get updated counts
        await fetchAccounts();
      }
    } catch (err) {
      console.error("Error rejecting account:", err);
      alert("Failed to reject account. Please try again.");
    }
  };

  // Calculate counts from all accounts, not filtered accounts
  const pendingCount = allAccounts.filter((a) => a.account_status === "pending").length;
  const approvedCount = allAccounts.filter((a) => a.account_status === "approved").length;
  const rejectedCount = allAccounts.filter((a) => a.account_status === "rejected").length;

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

