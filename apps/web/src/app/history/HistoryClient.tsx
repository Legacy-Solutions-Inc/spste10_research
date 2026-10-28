"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { History as HistoryIcon, RotateCw, Search, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { IncidentDetail, type IncidentOutcome } from "@/components/incident/IncidentDetail";
import { IncidentTypeIcon, personFacts, personName } from "@/components/incident/IncidentBits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useFetchHistory, type HistoryEntry } from "@/hooks/useFetchHistory";
import { useNow } from "@/hooks/useNow";
import { formatDayLabel, formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const IncidentMap = dynamic(() => import("@/components/incident/IncidentMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

type StatusFilter = "all" | "resolved" | "active" | "declined";
type TypeFilter = "all" | "alert" | "report";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "resolved", label: "Resolved" },
  { value: "active", label: "Active" },
  { value: "declined", label: "Declined" },
];

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "alert", label: "Emergency Alerts" },
  { value: "report", label: "Reports" },
];

const OUTCOME_BADGE: Record<IncidentOutcome, { label: string; variant: "active" | "resolved" | "muted" | "warning" }> = {
  active: { label: "Active", variant: "active" },
  resolved: { label: "Resolved", variant: "resolved" },
  declined: { label: "Declined", variant: "muted" },
  canceled: { label: "Canceled", variant: "warning" },
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-13 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

function responseSummary(entry: HistoryEntry): string {
  if (!entry.respondedAt) return entry.outcome === "declined" ? "Declined" : "Accepted";
  const verb = entry.outcome === "declined" ? "Declined" : "Accepted";
  return `${verb} after ${formatDuration(entry.incident.created_at, entry.respondedAt)}`;
}

function HistoryRow({ entry, onOpen }: { entry: HistoryEntry; onOpen: () => void }) {
  const { incident } = entry;
  const badge = OUTCOME_BADGE[entry.outcome];
  const who = personName(incident);
  const secondary =
    incident.type === "alert"
      ? [who, ...personFacts(incident)].filter(Boolean).join(", ") || "No personal details"
      : incident.description || (who ? `From ${who}` : "Photo report");

  return (
    <li>
      <button
        onClick={onOpen}
        className="grid w-full grid-cols-[72px_minmax(0,1fr)_200px_110px] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="tabular text-13 text-muted-foreground">{formatTime(incident.created_at)}</span>
        <span className="flex min-w-0 items-start gap-3">
          <IncidentTypeIcon type={incident.type} className="mt-0.5" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{incident.location_name || "Location not named"}</span>
            <span className="block truncate text-13 text-muted-foreground">{secondary}</span>
          </span>
        </span>
        <span className="text-13 text-muted-foreground">{responseSummary(entry)}</span>
        <span className="justify-self-start">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </span>
      </button>
    </li>
  );
}

export default function HistoryClient() {
  const now = useNow(30000);
  const { entries, loading, error, refetch } = useFetchHistory();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byOutcome = { all: entries.length, resolved: 0, active: 0, declined: 0 } as Record<StatusFilter, number>;
    entries.forEach((entry) => {
      if (entry.outcome in byOutcome) byOutcome[entry.outcome as StatusFilter] += 1;
    });
    return byOutcome;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (status !== "all" && entry.outcome !== status) return false;
      if (type !== "all" && entry.incident.type !== type) return false;
      if (!q) return true;
      const haystack = [entry.incident.location_name, personName(entry.incident), entry.incident.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, status, type, query]);

  const groups = useMemo(() => {
    const byDay = new Map<string, HistoryEntry[]>();
    filtered.forEach((entry) => {
      const label = formatDayLabel(entry.incident.created_at);
      byDay.set(label, [...(byDay.get(label) || []), entry]);
    });
    return Array.from(byDay.entries());
  }, [filtered]);

  const open = entries.find((entry) => entry.incident.id === openId) ?? null;
  const filtersActive = status !== "all" || type !== "all" || query.trim() !== "";

  const clearFilters = () => {
    setStatus("all");
    setType("all");
    setQuery("");
  };

  return (
    <AppShell>
      <div className="max-w-5xl px-8 py-8">
        <PageHeader title="History" description="Every incident your office accepted or declined, newest first." />

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((filter) => (
              <FilterChip key={filter.value} active={status === filter.value} onClick={() => setStatus(filter.value)}>
                {filter.label}
                <span className={cn("tabular text-xs", status === filter.value ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {counts[filter.value]}
                </span>
              </FilterChip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as TypeFilter)}
              aria-label="Filter by type"
              className="h-9 rounded-md border border-input bg-card px-2 text-13 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TYPE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search location or name"
                aria-label="Search history"
                className="h-9 pl-9"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {loading ? (
            <ul className="divide-y" aria-label="Loading history">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="grid grid-cols-[72px_1fr_200px_110px] items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-14" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </li>
              ))}
            </ul>
          ) : error ? (
            <div className="space-y-3 px-6 py-8" role="alert">
              <p className="text-sm font-medium text-foreground">History couldn&apos;t be loaded.</p>
              <p className="text-13 text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RotateCw />
                Try again
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-6 py-10">
              <HistoryIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">No history yet</p>
              <p className="max-w-prose text-13 text-muted-foreground">
                Incidents you accept or decline on the dashboard are listed here.
              </p>
              <Button asChild size="sm" className="mt-2">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-start gap-2 px-6 py-10">
              <p className="text-sm font-medium text-foreground">No incidents match these filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1">
                <X />
                Clear filters
              </Button>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[72px_minmax(0,1fr)_200px_110px] gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>Received</span>
                <span>Incident</span>
                <span>Response</span>
                <span>Status</span>
              </div>
              {groups.map(([day, dayEntries]) => (
                <section key={day} aria-label={day}>
                  <h2 className="flex items-baseline justify-between border-b bg-card px-4 pb-1.5 pt-4 text-13 font-semibold text-foreground">
                    {day}
                    <span className="tabular text-xs font-normal text-muted-foreground">
                      {dayEntries.length} {dayEntries.length === 1 ? "incident" : "incidents"}
                    </span>
                  </h2>
                  <ul className="divide-y border-b last:border-b-0">
                    {dayEntries.map((entry) => (
                      <HistoryRow key={entry.incident.id} entry={entry} onOpen={() => setOpenId(entry.incident.id)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        {filtersActive && !loading && filtered.length > 0 && (
          <p className="mt-3 text-13 text-muted-foreground">
            Showing {filtered.length} of {entries.length}.{" "}
            <button onClick={clearFilters} className="font-medium text-primary underline-offset-4 hover:underline">
              Clear filters
            </button>
          </p>
        )}
      </div>

      <Sheet open={!!open} onOpenChange={(isOpen) => !isOpen && setOpenId(null)}>
        <SheetContent
          // Focus the panel itself rather than its first button, so no tooltip pops open
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
        >
          {open && (
            <>
              <SheetTitle className="sr-only">{open.incident.location_name || "Incident details"}</SheetTitle>
              <SheetDescription className="sr-only">Details of a past incident</SheetDescription>
              <IncidentDetail
                incident={open.incident}
                mode="history"
                outcome={open.outcome}
                now={now}
                onClose={() => setOpenId(null)}
                media={
                  <div className="isolate h-44 overflow-hidden rounded-lg border">
                    <IncidentMap
                      incidents={[open.incident]}
                      selectedId={open.incident.id}
                      fallbackCenter={[open.incident.latitude, open.incident.longitude]}
                      interactive={false}
                      pulseAlerts={false}
                      fitKey={open.incident.id}
                    />
                  </div>
                }
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
