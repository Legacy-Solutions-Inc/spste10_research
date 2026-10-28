"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import {
  officeLocation,
  officeName,
  type AccountAction,
  type AccountStatus,
  type ResponderAccount,
} from "./types";

const STATUS_BADGE: Record<AccountStatus, { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "resolved" },
  rejected: { label: "Rejected", variant: "muted" },
};

/** "Oct 28, 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Muted({ children }: { children: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Office</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function ResponderAccountsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <TableFrame>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent" aria-hidden>
          <TableCell>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-8 w-20" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableFrame>
  );
}

interface RowActionsProps {
  account: ResponderAccount;
  busyAction: AccountAction | undefined;
  onAction: (account: ResponderAccount, action: AccountAction) => void;
}

function RowActions({ account, busyAction, onAction }: RowActionsProps) {
  const name = officeName(account);
  const busy = busyAction !== undefined;

  const button = (action: AccountAction, label: string, variant: "default" | "outline") => (
    <Button
      size="sm"
      variant={variant}
      disabled={busy}
      onClick={() => onAction(account, action)}
      aria-label={`${label} ${name}`}
    >
      {busyAction === action && <Loader2 className="animate-spin" aria-hidden />}
      {label}
    </Button>
  );

  switch (account.account_status) {
    case "pending":
      return (
        <>
          {button("approve", "Approve", "default")}
          {button("reject", "Reject", "outline")}
        </>
      );
    case "approved":
      return button("revoke", "Revoke access", "outline");
    case "rejected":
      return button("approve", "Approve", "outline");
  }
}

interface ResponderAccountsTableProps {
  accounts: ResponderAccount[];
  busy: Record<string, AccountAction>;
  onAction: (account: ResponderAccount, action: AccountAction) => void;
}

export default function ResponderAccountsTable({ accounts, busy, onAction }: ResponderAccountsTableProps) {
  return (
    <TableFrame>
      {accounts.map((account) => {
        const location = officeLocation(account);
        const status = STATUS_BADGE[account.account_status];
        const busyAction = busy[account.id];

        return (
          <TableRow key={account.id} aria-busy={busyAction !== undefined || undefined}>
            <TableCell className="min-w-[14rem]">
              <div className="font-medium text-foreground">{officeName(account)}</div>
              <div className="break-all text-13 text-muted-foreground">
                {account.email || "No email on file"}
              </div>
            </TableCell>
            <TableCell className="min-w-[10rem]">{location || <Muted>Not provided</Muted>}</TableCell>
            <TableCell className="min-w-[12rem] max-w-[18rem]">
              <div className="tabular-nums">{account.contact_number || <Muted>No number</Muted>}</div>
              {account.office_address && (
                <div className="line-clamp-2 text-13 text-muted-foreground" title={account.office_address}>
                  {account.office_address}
                </div>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <time dateTime={account.created_at} title={formatDateTime(account.created_at)}>
                {formatDate(account.created_at)}
              </time>
            </TableCell>
            <TableCell>
              <Badge variant={status.variant}>{status.label}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <RowActions account={account} busyAction={busyAction} onAction={onAction} />
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </TableFrame>
  );
}
