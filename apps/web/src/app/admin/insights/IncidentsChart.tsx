"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatBucketLabel,
  formatCount,
  formatShortDate,
  niceCountScale,
  type BucketUnit,
  type TimeBucket,
} from "./metrics";
import { SERIES, seriesCount } from "./series";

/** Plot area height; the x-axis labels sit below it, outside this height. */
const PLOT_HEIGHT = 200;
/** Headroom above the tallest bar for its total label. */
const TOP_PAD = 20;
/** The surface gap between stacked segments. */
const SEGMENT_GAP = 2;
const MAX_X_LABELS = 8;

interface IncidentsChartProps {
  buckets: TimeBucket[];
  unit: BucketUnit;
  now: Date;
}

function describeBucket(bucket: TimeBucket): string {
  const total = bucket.alerts + bucket.reports;
  if (total === 0) return "No incidents";
  return `${seriesCount("alert", bucket.alerts)}, ${seriesCount("report", bucket.reports)}`;
}

function BucketTable({
  buckets,
  unit,
  now,
  caption,
  className,
}: IncidentsChartProps & { caption: string; className?: string }) {
  const alerts = buckets.reduce((sum, b) => sum + b.alerts, 0);
  const reports = buckets.reduce((sum, b) => sum + b.reports, 0);

  return (
    <div className={className}>
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{unit === "week" ? "Week" : "Day"}</TableHead>
            <TableHead className="text-right">{SERIES.alert.label}</TableHead>
            <TableHead className="text-right">{SERIES.report.label}</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buckets.map((bucket) => (
            <TableRow key={bucket.key}>
              <TableCell className="whitespace-nowrap">{formatBucketLabel(bucket, now)}</TableCell>
              <TableCell className="tabular text-right">{formatCount(bucket.alerts)}</TableCell>
              <TableCell className="tabular text-right">{formatCount(bucket.reports)}</TableCell>
              <TableCell className="tabular text-right">{formatCount(bucket.alerts + bucket.reports)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-medium hover:bg-transparent">
            <TableCell>Total</TableCell>
            <TableCell className="tabular text-right">{formatCount(alerts)}</TableCell>
            <TableCell className="tabular text-right">{formatCount(reports)}</TableCell>
            <TableCell className="tabular text-right">{formatCount(alerts + reports)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function TooltipRow({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="tabular font-semibold">{formatCount(value)}</span>
      <span className="font-normal text-white/70">{label}</span>
    </li>
  );
}

export default function IncidentsChart({ buckets, unit, now }: IncidentsChartProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  // Counted from the end so "today" stays selected when the range changes
  const [activeFromEnd, setActiveFromEnd] = useState(0);
  const columnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const count = buckets.length;
  const activeIndex = Math.max(0, count - 1 - Math.min(activeFromEnd, count - 1));
  const totals = buckets.map((b) => b.alerts + b.reports);
  const max = Math.max(0, ...totals);
  const scale = niceCountScale(max);
  const peakIndex = max > 0 ? totals.indexOf(max) : -1;
  const labelStep = Math.max(1, Math.ceil(count / MAX_X_LABELS));
  const alertTotal = buckets.reduce((sum, b) => sum + b.alerts, 0);
  const reportTotal = buckets.reduce((sum, b) => sum + b.reports, 0);

  const title = unit === "week" ? "Incidents per week" : "Incidents per day";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const description =
    unit === "week"
      ? `Emergency Alerts and Reports received each week, starting Monday. All time is grouped by week so the bars stay readable. Times follow your computer's time zone (${timeZone}).`
      : `Emergency Alerts and Reports received each day. Days follow your computer's time zone (${timeZone}).`;

  const toY = (value: number) => (value / scale.top) * PLOT_HEIGHT;

  const focusColumn = (index: number) => {
    setActiveFromEnd(count - 1 - index);
    columnRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === "ArrowRight"
        ? Math.min(count - 1, index + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    focusColumn(next);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-0">
        <div className="min-w-0 max-w-prose">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-13 text-muted-foreground">{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? <Table2 aria-hidden /> : <BarChart3 aria-hidden />}
          {view === "chart" ? "Show table" : "Show chart"}
        </Button>
      </div>

      <div className="p-5">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-13" aria-label="Legend">
          {(["alert", "report"] as const).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES[kind].color }} aria-hidden />
              <span className="text-foreground">{SERIES[kind].label}</span>
              <span className="tabular text-muted-foreground">{formatCount(kind === "alert" ? alertTotal : reportTotal)}</span>
            </li>
          ))}
        </ul>

        {view === "table" ? (
          <BucketTable
            buckets={buckets}
            unit={unit}
            now={now}
            caption={`${title}: Emergency Alerts and Reports`}
            className="mt-4 overflow-hidden rounded-lg border"
          />
        ) : (
          <>
            <BucketTable
              buckets={buckets}
              unit={unit}
              now={now}
              caption={`${title}: Emergency Alerts and Reports`}
              className="sr-only"
            />
            <TooltipProvider delayDuration={0} skipDelayDuration={0}>
              <div className="mt-4 flex">
                {/* Y axis */}
                <div className="relative w-8 shrink-0" style={{ height: PLOT_HEIGHT + TOP_PAD }} aria-hidden>
                  {scale.ticks.map((tick) => (
                    <span
                      key={tick}
                      className="tabular absolute right-2 translate-y-1/2 text-xs leading-none text-muted-foreground"
                      style={{ bottom: toY(tick) }}
                    >
                      {formatCount(tick)}
                    </span>
                  ))}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="relative" style={{ height: PLOT_HEIGHT + TOP_PAD }}>
                    {/* Gridlines: hairline, solid, recessive; the baseline one step stronger */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: PLOT_HEIGHT }} aria-hidden>
                      {scale.ticks.map((tick) => (
                        <div
                          key={tick}
                          className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-foreground/20" : "bg-border")}
                          style={{ bottom: toY(tick) }}
                        />
                      ))}
                    </div>

                    <div
                      role="group"
                      aria-label={`${title} chart. Use the arrow keys to move between ${unit}s.`}
                      className="absolute inset-0 flex"
                    >
                      {buckets.map((bucket, index) => {
                        const total = bucket.alerts + bucket.reports;
                        const label = formatBucketLabel(bucket, now);
                        const alertHeight = toY(bucket.alerts);
                        const reportHeight = toY(bucket.reports);
                        const stacked = bucket.alerts > 0 && bucket.reports > 0;

                        return (
                          <Tooltip key={bucket.key}>
                            <TooltipTrigger asChild>
                              <button
                                ref={(el) => {
                                  columnRefs.current[index] = el;
                                }}
                                type="button"
                                tabIndex={index === activeIndex ? 0 : -1}
                                onFocus={() => setActiveFromEnd(count - 1 - index)}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                                aria-label={`${label}: ${describeBucket(bucket)}`}
                                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end rounded-md outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {index === peakIndex && (
                                  <span className="tabular mb-1 text-xs font-medium leading-none text-foreground">
                                    {formatCount(total)}
                                  </span>
                                )}
                                {total > 0 && (
                                  <span
                                    className="flex w-[calc(100%-4px)] max-w-[24px] flex-col transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                                    style={{ gap: stacked ? SEGMENT_GAP : 0 }}
                                    aria-hidden
                                  >
                                    {bucket.reports > 0 && (
                                      <span
                                        className="block rounded-t-[4px]"
                                        style={{
                                          // The surface gap comes out of the upper segment so the stack stays true to scale
                                          height: Math.max(1, reportHeight - (stacked ? SEGMENT_GAP : 0)),
                                          backgroundColor: SERIES.report.color,
                                        }}
                                      />
                                    )}
                                    {bucket.alerts > 0 && (
                                      <span
                                        className={cn("block", !stacked && "rounded-t-[4px]")}
                                        style={{ height: alertHeight, backgroundColor: SERIES.alert.color }}
                                      />
                                    )}
                                  </span>
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="px-3 py-2">
                              <p className="font-normal text-white/70">{label}</p>
                              {total === 0 ? (
                                <p className="mt-1">No incidents</p>
                              ) : (
                                <ul className="mt-1 space-y-0.5">
                                  <TooltipRow
                                    color={SERIES.alert.color}
                                    value={bucket.alerts}
                                    label={bucket.alerts === 1 ? SERIES.alert.singular : SERIES.alert.label}
                                  />
                                  <TooltipRow
                                    color={SERIES.report.color}
                                    value={bucket.reports}
                                    label={bucket.reports === 1 ? SERIES.report.singular : SERIES.report.label}
                                  />
                                </ul>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>

                  {/* X axis: sparse labels, always including the latest bucket */}
                  <div className="relative mt-2 h-4" aria-hidden>
                    {buckets.map((bucket, index) =>
                      (count - 1 - index) % labelStep === 0 ? (
                        <span
                          key={bucket.key}
                          className="absolute -translate-x-1/2 whitespace-nowrap text-xs leading-4 text-muted-foreground"
                          style={{ left: `${((index + 0.5) / count) * 100}%` }}
                        >
                          {formatShortDate(bucket.start, now)}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </TooltipProvider>
          </>
        )}
      </div>
    </Card>
  );
}
