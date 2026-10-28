"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { CheckCircle2, Inbox, RotateCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IncidentTypeIcon, WaitTimer, personFacts, personName } from "@/components/incident/IncidentBits";
import { formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/incident";

export type QueueTab = "incoming" | "active";

interface IncidentQueueProps {
  tab: QueueTab;
  onTabChange: (tab: QueueTab) => void;
  incoming: Incident[];
  active: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Emergency Alerts that arrived during this session and haven't been opened */
  unseenIds: Set<string>;
  now: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  live: boolean;
}

function LiveIndicator({ live }: { live: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium text-muted-foreground" tabIndex={0}>
          <span className={cn("h-2 w-2 rounded-full", live ? "bg-resolved" : "bg-amber-500")} aria-hidden="true" />
          {live ? "Live" : "Checking every 5s"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        {live
          ? "Connected. New incidents appear the moment citizens send them."
          : "The live connection is down. AGAP is checking for new incidents every 5 seconds."}
      </TooltipContent>
    </Tooltip>
  );
}

function IncidentRow({
  incident,
  tab,
  selected,
  unseen,
  now,
  onSelect,
}: {
  incident: Incident;
  tab: QueueTab;
  selected: boolean;
  unseen: boolean;
  now: number;
  onSelect: () => void;
}) {
  const name = personName(incident);
  const facts = personFacts(incident);
  const acceptedAt = incident.assignment?.responded_at || incident.assignment?.assigned_at;

  const secondary =
    incident.type === "alert"
      ? [name, ...facts].filter(Boolean).join(", ") || "No personal details"
      : incident.description || (incident.reporter_name ? `From ${incident.reporter_name}` : "Photo report");

  return (
    <li>
      <button
        data-incident-row={incident.id}
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "relative flex w-full items-start gap-3 py-3 pl-4 pr-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          selected ? "bg-accent" : "hover:bg-muted/60",
          unseen && !selected && "bg-alert-soft/70"
        )}
      >
        {/* Type stripe: red for Emergency Alerts, amber for Reports */}
        <span
          className={cn("absolute inset-y-2 left-0 w-1 rounded-r", incident.type === "alert" ? "bg-alert" : "bg-report")}
          aria-hidden="true"
        />
        <IncidentTypeIcon type={incident.type} className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("truncate text-sm text-foreground", unseen ? "font-semibold" : "font-medium")}>
              {incident.location_name || "Location not named"}
            </span>
            {unseen && <span className="sr-only">(new)</span>}
          </span>
          <span className="mt-0.5 block truncate text-13 text-muted-foreground">{secondary}</span>
        </span>
        {tab === "incoming" ? (
          <WaitTimer since={incident.created_at} now={now} className="mt-0.5" />
        ) : (
          acceptedAt && <span className="tabular mt-0.5 shrink-0 text-xs text-muted-foreground">{formatElapsed(acceptedAt, now)}</span>
        )}
      </button>
    </li>
  );
}

function GroupHeading({ children }: { children: ReactNode }) {
  return <li className="sticky top-0 z-10 border-b bg-card/95 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">{children}</li>;
}

export function IncidentQueue({
  tab,
  onTabChange,
  incoming,
  active,
  selectedId,
  onSelect,
  unseenIds,
  now,
  loading,
  error,
  onRetry,
  live,
}: IncidentQueueProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const items = tab === "incoming" ? incoming : active;
  const alerts = tab === "incoming" ? incoming.filter((i) => i.type === "alert") : [];
  const reports = tab === "incoming" ? incoming.filter((i) => i.type === "report") : [];

  // Up/Down arrows move through the queue and open each incident
  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!items.length) return;
    const index = items.findIndex((i) => i.id === selectedId);
    const nextIndex =
      index === -1 ? 0 : event.key === "ArrowDown" ? Math.min(items.length - 1, index + 1) : Math.max(0, index - 1);
    const next = items[nextIndex];
    onSelect(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-incident-row="${next.id}"]`)?.focus();
  };

  const renderRow = (incident: Incident) => (
    <IncidentRow
      key={incident.id}
      incident={incident}
      tab={tab}
      selected={incident.id === selectedId}
      unseen={unseenIds.has(incident.id)}
      now={now}
      onSelect={() => onSelect(incident.id)}
    />
  );

  return (
    <section className="flex h-full w-[360px] shrink-0 flex-col border-r bg-card" aria-label="Incident queue">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
        <LiveIndicator live={live} />
      </div>

      <div className="shrink-0 border-b px-4 pb-3">
        <Tabs value={tab} onValueChange={(value) => onTabChange(value as QueueTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming">
              Incoming
              <span className={cn("tabular rounded-full px-1.5 text-xs", incoming.length ? "bg-alert text-white" : "bg-border text-muted-foreground")}>
                {incoming.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              <span className="tabular rounded-full bg-border px-1.5 text-xs text-muted-foreground">{active.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul aria-label="Loading incidents" className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="space-y-3 px-4 py-6" role="alert">
            <p className="text-sm font-medium text-foreground">Incidents couldn&apos;t be loaded.</p>
            <p className="text-13 text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCw />
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-2 px-4 py-8">
            {tab === "incoming" ? (
              <>
                <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">No incidents waiting</p>
                <p className="max-w-[280px] text-13 text-muted-foreground">
                  New Emergency Alerts and Reports from citizens appear here the moment they arrive.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">Nothing in progress</p>
                <p className="max-w-[280px] text-13 text-muted-foreground">
                  Incidents you accept stay here until you mark them resolved.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul ref={listRef} onKeyDown={handleKeyDown} className="divide-y" aria-label={tab === "incoming" ? "Incoming incidents" : "Active incidents"}>
            {tab === "incoming" ? (
              <>
                {alerts.length > 0 && <GroupHeading>Emergency Alerts ({alerts.length})</GroupHeading>}
                {alerts.map(renderRow)}
                {reports.length > 0 && <GroupHeading>Reports ({reports.length})</GroupHeading>}
                {reports.map(renderRow)}
              </>
            ) : (
              items.map(renderRow)
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
