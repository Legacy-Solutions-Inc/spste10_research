"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, RefreshCw, Search, UserCheck, UserX, Users, type LucideIcon } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabaseBrowser";
import ConfirmStatusDialog, { type ConfirmState } from "./ConfirmStatusDialog";
import ResponderAccountsTable, { ResponderAccountsSkeleton } from "./ResponderAccountsTable";
import {
  NEXT_STATUS,
  officeName,
  type AccountAction,
  type AccountStatus,
  type ConfirmableAction,
  type ResponderAccount,
} from "./types";

type Tab = AccountStatus | "all";

const TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

type ResponderProfileRow = {
  municipality: string | null;
  province: string | null;
  office_address: string | null;
  contact_number: string | null;
  account_status: AccountStatus;
};

type ProfileWithResponderProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  responder_profiles: ResponderProfileRow | ResponderProfileRow[] | null;
};

/** The update matched no rows (e.g. the account was removed), so nothing changed. */
class NoRowsUpdatedError extends Error {}

async function fetchResponderAccounts(): Promise<ResponderAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      created_at,
      responder_profiles (
        municipality,
        province,
        office_address,
        contact_number,
        account_status
      )
    `
    )
    .eq("role", "responder")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const profiles = (data ?? []) as unknown as ProfileWithResponderProfile[];

  return profiles
    .filter((profile) => profile.responder_profiles !== null)
    .map((profile) => {
      const responder = Array.isArray(profile.responder_profiles)
        ? profile.responder_profiles[0]
        : profile.responder_profiles;

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        municipality: responder?.municipality || null,
        province: responder?.province || null,
        office_address: responder?.office_address || null,
        contact_number: responder?.contact_number || null,
        account_status: responder?.account_status || "pending",
        created_at: profile.created_at,
      };
    });
}

async function updateAccountStatus(accountId: string, status: AccountStatus): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("responder_profiles")
    // @ts-ignore - generated types lack Relationships, so Update resolves to never
    .update({ account_status: status })
    .eq("id", accountId)
    .select("id");

  if (error) throw error;
  if (!data || data.length === 0) throw new NoRowsUpdatedError();
}

const SUCCESS_TOAST: Record<AccountAction, (name: string) => { title: string; description: string }> = {
  approve: (name) => ({
    title: "Account approved",
    description: `${name} can now sign in to the dashboard.`,
  }),
  reject: (name) => ({
    title: "Request rejected",
    description: `${name} can't sign in. You can still approve them from the Rejected tab.`,
  }),
  revoke: (name) => ({
    title: "Access revoked",
    description: `${name} will lose access the next time they open or refresh AGAP.`,
  }),
};

const FAILURE_TITLE: Record<AccountAction, string> = {
  approve: "Couldn't approve account",
  reject: "Couldn't reject request",
  revoke: "Couldn't revoke access",
};

function matchesQuery(account: ResponderAccount, query: string): boolean {
  if (!query) return true;
  return [account.full_name, account.email, account.municipality, account.province].some((value) =>
    value?.toLowerCase().includes(query)
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12">
      <div className="max-w-md">
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

export default function AdminClient() {
  const [accounts, setAccounts] = useState<ResponderAccount[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<Record<string, AccountAction>>({});
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  // Ignore responses from loads that a newer load has superseded
  const latestLoad = useRef(0);

  const loadAccounts = useCallback(async ({ background = false }: { background?: boolean } = {}) => {
    const loadId = ++latestLoad.current;
    if (background) setRefreshing(true);
    else setLoadState("loading");

    try {
      const rows = await fetchResponderAccounts();
      if (loadId !== latestLoad.current) return;
      setAccounts(rows);
      setLoadState("ready");
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      console.error("Error loading responder accounts:", err);
      if (background) {
        toast({
          title: "Couldn't refresh accounts",
          description: "Showing the last loaded list. Check your connection and try again.",
          variant: "error",
        });
      } else {
        setLoadState("error");
      }
    } finally {
      if (loadId === latestLoad.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const runAction = useCallback(async (account: ResponderAccount, action: AccountAction) => {
    const nextStatus = NEXT_STATUS[action];
    setBusy((prev) => ({ ...prev, [account.id]: action }));

    try {
      await updateAccountStatus(account.id, nextStatus);
      setAccounts((prev) =>
        prev.map((item) => (item.id === account.id ? { ...item, account_status: nextStatus } : item))
      );
      toast({ ...SUCCESS_TOAST[action](officeName(account)), variant: "success" });
    } catch (err) {
      console.error(`Error trying to ${action} responder account:`, err);
      toast({
        title: FAILURE_TITLE[action],
        description:
          err instanceof NoRowsUpdatedError
            ? "This account may have been removed. Refresh the list and try again."
            : "Nothing was changed. Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setBusy((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
    }
  }, []);

  const handleRowAction = useCallback(
    (account: ResponderAccount, action: AccountAction) => {
      if (action === "approve") {
        runAction(account, action);
      } else {
        setConfirm({ open: true, action, account });
      }
    },
    [runAction]
  );

  const handleConfirm = useCallback(
    (account: ResponderAccount, action: ConfirmableAction) => {
      runAction(account, action);
    },
    [runAction]
  );

  const normalizedQuery = query.trim().toLowerCase();

  // Counts follow the search so each tab shows how many rows it will list
  const matching = useMemo(
    () => accounts.filter((account) => matchesQuery(account, normalizedQuery)),
    [accounts, normalizedQuery]
  );

  const counts = useMemo(() => {
    const result: Record<Tab, number> = { pending: 0, approved: 0, rejected: 0, all: matching.length };
    for (const account of matching) result[account.account_status] += 1;
    return result;
  }, [matching]);

  const visible = tab === "all" ? matching : matching.filter((account) => account.account_status === tab);

  const renderEmpty = () => {
    if (normalizedQuery) {
      return (
        <EmptyState
          icon={Search}
          title={`No accounts match "${query.trim()}"`}
          description="Try another office name, email, municipality, or province."
          action={
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      );
    }

    switch (tab) {
      case "pending":
        return (
          <EmptyState
            icon={Inbox}
            title="No requests waiting"
            description="You're all caught up. New requests from response offices will appear here for review."
            action={
              accounts.length > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setTab("all")}>
                  View all accounts
                </Button>
              ) : undefined
            }
          />
        );
      case "approved":
        return (
          <EmptyState
            icon={UserCheck}
            title="No approved offices yet"
            description="Approve a request from the Pending tab to give an office access to the dashboard."
            action={
              counts.pending > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setTab("pending")}>
                  Review pending requests
                </Button>
              ) : undefined
            }
          />
        );
      case "rejected":
        return (
          <EmptyState
            icon={UserX}
            title="No rejected requests"
            description="Requests you reject, and offices whose access you revoke, will appear here. You can approve them again at any time."
          />
        );
      case "all":
        return (
          <EmptyState
            icon={Users}
            title="No responder accounts yet"
            description="When a response office registers for AGAP, its request will appear here for review."
          />
        );
    }
  };

  const renderContent = () => {
    if (loadState === "loading") return <ResponderAccountsSkeleton />;

    if (loadState === "error") {
      return (
        <div role="alert" className="rounded-xl border bg-card px-6 py-10">
          <div className="flex max-w-md items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-alert" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load responder accounts</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your connection, then try again. If this keeps happening, sign out and sign back in.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => loadAccounts()}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (visible.length === 0) return renderEmpty();

    return <ResponderAccountsTable accounts={visible} busy={busy} onAction={handleRowAction} />;
  };

  return (
    <AppShell>
      <div className="max-w-6xl px-8 py-8">
        <PageHeader
          title="Responder accounts"
          description="Review access requests from response offices. Approved offices can sign in to the dashboard."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAccounts({ background: true })}
              disabled={loadState !== "ready" || refreshing}
            >
              {refreshing ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              Refresh
            </Button>
          }
        />

        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <TabsList aria-label="Filter accounts by status">
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                  {loadState === "ready" && (
                    <span className="rounded-full bg-foreground/[0.06] px-1.5 text-xs tabular-nums text-muted-foreground">
                      {counts[value]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search office, email, or place"
                aria-label="Search responder accounts by office name, email, municipality, or province"
                className="pl-9"
              />
            </div>
          </div>

          {/* One panel for whichever tab is active; the table re-filters instead of mounting four copies */}
          <TabsContent value={tab} className="mt-0">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmStatusDialog
        state={confirm}
        onOpenChange={(open) => setConfirm((prev) => (prev ? { ...prev, open } : prev))}
        onConfirm={handleConfirm}
      />
    </AppShell>
  );
}
