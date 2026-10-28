"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import IncidentsChart from "./IncidentsChart";
import { KpiTiles, KpiTilesSkeleton } from "./KpiTiles";
import { MetricDefinitions } from "./MetricDefinitions";
import { buildBuckets, RANGES, summarizeInsights, type RangeKey } from "./metrics";
import { OfficeTable, OfficeTableSkeleton } from "./OfficeTable";
import { PhotoRetentionCard } from "./PhotoRetentionCard";
import { useInsightsData } from "./useInsightsData";

const EMPTY_RANGE_COPY: Record<RangeKey, string> = {
  "7d": "Citizens haven't sent any Emergency Alerts or Reports in the last 7 days.",
  "30d": "Citizens haven't sent any Emergency Alerts or Reports in the last 30 days.",
  all: "Citizens haven't sent any Emergency Alerts or Reports yet. Numbers will appear here once they do.",
};

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
      <KpiTilesSkeleton />
      <Card className="p-5" aria-hidden>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-80" />
        <Skeleton className="mt-6 h-[228px] w-full" />
      </Card>
      <OfficeTableSkeleton />
    </div>
  );
}

export default function InsightsClient() {
  const [range, setRange] = useState<RangeKey>("7d");
  const { data, status, refreshing, reload } = useInsightsData(range);

  const view = useMemo(() => {
    if (!data) return null;
    return { summary: summarizeInsights(data), ...buildBuckets(data), now: new Date(data.fetchedAt) };
  }, [data]);

  const renderMetrics = () => {
    if (status === "loading" || (status === "ready" && !view)) return <LoadingState />;

    if (status === "error" || !data || !view) {
      return (
        <div role="alert" className="rounded-xl border bg-card px-6 py-10">
          <div className="flex max-w-md items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-alert" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">Couldn&apos;t load insights</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check your connection, then try again. If this keeps happening, sign out and sign back in.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={reload}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (view.summary.total === 0) {
      return (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12">
          <div className="max-w-md">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Inbox className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-base font-semibold text-foreground">No incidents in this range</h2>
            <p className="mt-1 text-sm text-muted-foreground">{EMPTY_RANGE_COPY[data.range]}</p>
            {data.range !== "all" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setRange("all")}>
                Show all time
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <KpiTiles summary={view.summary} fetchedAt={data.fetchedAt} />
        <IncidentsChart buckets={view.buckets} unit={view.unit} now={view.now} />
        <OfficeTable offices={view.summary.offices} />
        <MetricDefinitions />
      </div>
    );
  };

  return (
    <AppShell>
      <div className="max-w-6xl px-8 py-8">
        <PageHeader
          title="Insights"
          description="Incident volume and response times across all response offices, for reviewing how quickly citizens get help."
          actions={
            <Button variant="outline" size="sm" onClick={reload} disabled={status !== "ready" || refreshing}>
              {refreshing ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
              Refresh
            </Button>
          }
        />

        <Tabs value={range} onValueChange={(value) => setRange(value as RangeKey)}>
          <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <TabsList aria-label="Date range">
              {RANGES.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {data && status === "ready" && (
              <p className="text-13 text-muted-foreground" aria-live="polite">
                {refreshing ? "Updating…" : `Updated ${formatTime(new Date(data.fetchedAt).toISOString())}`}
              </p>
            )}
          </div>

          <TabsContent value={range} className="rounded-xl" tabIndex={-1}>
            {/* While a new range loads, keep the previous numbers in place, dimmed */}
            <div
              aria-busy={refreshing || undefined}
              className={cn("transition-opacity", refreshing && "pointer-events-none opacity-60")}
            >
              {renderMetrics()}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <PhotoRetentionCard />
        </div>
      </div>
    </AppShell>
  );
}
