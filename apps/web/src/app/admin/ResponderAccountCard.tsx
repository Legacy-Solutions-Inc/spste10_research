"use client";

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

interface ResponderAccountCardProps {
  account: ResponderAccount;
  onApprove: (accountId: string) => void;
  onReject: (accountId: string) => void;
}

export default function ResponderAccountCard({
  account,
  onApprove,
  onReject,
}: ResponderAccountCardProps) {
  const status = account.account_status;
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition bg-white ${
        isApproved ? "border-green-300" : isRejected ? "border-red-300" : "border-gray-200"
      }`}
    >
      {/* Header with Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 mb-1">
            {account.full_name || "Unnamed User"}
          </h3>
          <p className="text-sm text-gray-600">{account.email || "No email"}</p>
        </div>
        <div>
          {isPending && (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
              Pending
            </span>
          )}
          {isApproved && (
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
              Approved
            </span>
          )}
          {isRejected && (
            <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Account Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {account.municipality && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Municipality</p>
            <p className="text-sm text-gray-900">{account.municipality}</p>
          </div>
        )}
        {account.province && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Province</p>
            <p className="text-sm text-gray-900">{account.province}</p>
          </div>
        )}
        {account.office_address && (
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-700 mb-1">Office Address</p>
            <p className="text-sm text-gray-900">{account.office_address}</p>
          </div>
        )}
        {account.contact_number && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Contact Number</p>
            <p className="text-sm text-gray-900">{account.contact_number}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">Registered</p>
          <p className="text-sm text-gray-900">{formatDate(account.created_at)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (confirm(`Approve account for ${account.email}?`)) {
                onApprove(account.id);
              }
            }}
            className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition shadow-sm"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => {
              if (confirm(`Reject account for ${account.email}?`)) {
                onReject(account.id);
              }
            }}
            className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 transition shadow-sm"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {/* Status Message for Non-Pending Accounts */}
      {!isPending && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Account {status} on {formatDate(account.created_at)}
          </p>
        </div>
      )}
    </div>
  );
}

