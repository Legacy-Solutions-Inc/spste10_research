export type AccountStatus = "pending" | "approved" | "rejected";

/** What an admin can do to a responder account from the table. */
export type AccountAction = "approve" | "reject" | "revoke";

/** Actions that ask for confirmation first. */
export type ConfirmableAction = Exclude<AccountAction, "approve">;

export interface ResponderAccount {
  id: string;
  email: string | null;
  full_name: string | null;
  municipality: string | null;
  province: string | null;
  office_address: string | null;
  contact_number: string | null;
  account_status: AccountStatus;
  /** When the account registered (profiles.created_at), not when it was reviewed. */
  created_at: string;
}

/** Revoking access reuses the rejected status so the office can be approved again later. */
export const NEXT_STATUS: Record<AccountAction, AccountStatus> = {
  approve: "approved",
  reject: "rejected",
  revoke: "rejected",
};

export function officeName(account: Pick<ResponderAccount, "full_name">): string {
  return account.full_name?.trim() || "Unnamed office";
}

export function officeLocation(account: Pick<ResponderAccount, "municipality" | "province">): string {
  return [account.municipality, account.province].filter(Boolean).join(", ");
}
