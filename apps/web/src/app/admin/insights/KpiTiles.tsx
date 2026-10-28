"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount, formatDurationMs, formatPercent, plural, type DurationSummary, type InsightsSummary } from "./metrics";
import { SERIES, seriesCount } from "./series";

function Tile({ label, badge, value, detail }: { label: string; badge?: ReactNode; value: ReactNode; detail: ReactNode }) {
  return (
    <Card className="p-5">
      {/* Fixed height so a tile with a badge lines up with its neighbors */}
      <dt className="flex h-[22px] items-center gap-2 text-13 font-medium text-muted-foreground">
        {label}
        {badge}
      </dt>
      {/* Standalone figures keep proportional digits; tabular is for aligned columns */}
      <dd className="mt-2 text-28 font-semibold text-foreground">{value}</dd>
      <dd className="mt-1 text-13 text-muted-foreground">{detail}</dd>
    </Card>
  );
}

function NoValue() {
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">No data</span>
    </>
  );
}

function SeriesDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden />;
}

function durationDetail(summary: DurationSummary, noun: string, empty: string): ReactNode {
  if (summary.median === null || summary.p90 === null) return empty;
  return `p90 ${formatDurationMs(summary.p90)} · ${plural(summary.count, noun)}`;
}

export function KpiTiles({ summary, fetchedAt }: { summary: InsightsSummary; fetchedAt: number }) {
  const responses = summary.acceptedResponses + summary.declinedResponses;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Tile
        label="Incidents received"
        value={formatCount(summary.total)}
        detail={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex items-center gap-1.5">
              <SeriesDot color={SERIES.alert.color} />
              {seriesCount("alert", summary.alerts)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <SeriesDot color={SERIES.report.color} />
              {seriesCount("report", summary.reports)}
            </span>
          </span>
        }
      />
      <Tile
        label="Median time to accept"
        value={summary.timeToAccept.median === null ? <NoValue /> : formatDurationMs(summary.timeToAccept.median)}
        detail={durationDetail(summary.timeToAccept, "accepted incident", "No incidents were accepted in this range")}
      />
      <Tile
        label="Median time to resolve"
        badge={<Badge variant="muted">Approximate</Badge>}
        value={summary.timeToResolve.median === null ? <NoValue /> : formatDurationMs(summary.timeToResolve.median)}
        detail={durationDetail(summary.timeToResolve, "resolved incident", "No accepted incidents were resolved in this range")}
      />
      <Tile
        label="Decline rate"
        value={summary.declineRate === null ? <NoValue /> : formatPercent(summary.declineRate)}
        detail={
          responses === 0
            ? "No office has responded in this range"
            : `${formatCount(summary.declinedResponses)} declined of ${plural(responses, "response")}`
        }
      />
      <Tile
        label="Canceled by citizen"
        value={formatCount(summary.canceled)}
        detail={
          summary.total === 0 ? "No incidents in this range" : `${formatPercent(summary.canceled / summary.total)} of incidents received`
        }
      />
      <Tile
        label="Waiting right now"
        value={formatCount(summary.waiting)}
        detail={
          summary.oldestWaitingSince === null
            ? "No incident from this range is waiting for an office"
            : `Not accepted yet · oldest has waited ${formatDurationMs(fetchedAt - summary.oldestWaitingSince)}`
        }
      />
    </dl>
  );
}

export function KpiTilesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-40" />
        </Card>
      ))}
    </div>
  );
}
