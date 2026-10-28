import type { IncidentStatus, ResponseStatus } from "@/types/incident";

// ---------------------------------------------------------------------------
// Ranges
// ---------------------------------------------------------------------------

export type RangeKey = "7d" | "30d" | "all";

export const RANGES: { value: RangeKey; label: string; days: number | null }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "all", label: "All time", days: null },
];

export function rangeLabel(range: RangeKey): string {
  return RANGES.find((r) => r.value === range)?.label ?? "";
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight at the start of the range (today counts as day one), or null for all time. */
export function rangeStart(range: RangeKey, now: Date): Date | null {
  const days = RANGES.find((r) => r.value === range)?.days ?? null;
  if (days === null) return null;
  const start = startOfLocalDay(now);
  // setDate keeps local midnight across daylight saving changes
  start.setDate(start.getDate() - (days - 1));
  return start;
}

// ---------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------

export type IncidentKind = "alert" | "report";

export interface InsightIncident {
  id: string;
  kind: IncidentKind;
  status: IncidentStatus;
  createdAt: number;
  updatedAt: number;
}

export interface InsightAssignment {
  incidentId: string;
  responderId: string;
  responseStatus: ResponseStatus;
  respondedAt: number | null;
}

export interface InsightsData {
  range: RangeKey;
  /** When the data was fetched; "today" and wait times are relative to this. */
  fetchedAt: number;
  incidents: InsightIncident[];
  assignments: InsightAssignment[];
  officeNames: Record<string, string>;
}

/** Response statuses that mean the office took the incident. */
const ACCEPTED_STATUSES: ReadonlySet<ResponseStatus> = new Set(["accepted", "in_progress", "completed"]);

export function isAcceptedResponse(status: ResponseStatus): boolean {
  return ACCEPTED_STATUSES.has(status);
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Quantile with linear interpolation between closest ranks
 * (same as Excel PERCENTILE.INC and NumPy's default). Input must be sorted.
 */
export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export interface DurationSummary {
  count: number;
  median: number | null;
  p90: number | null;
}

function summarize(durations: number[]): DurationSummary {
  const sorted = [...durations].sort((a, b) => a - b);
  return { count: sorted.length, median: quantile(sorted, 0.5), p90: quantile(sorted, 0.9) };
}

// ---------------------------------------------------------------------------
// KPIs and per-office breakdown
// ---------------------------------------------------------------------------

export interface OfficeStats {
  id: string;
  name: string;
  accepted: number;
  declined: number;
  resolved: number;
  medianAccept: number | null;
  acceptSamples: number;
}

export interface InsightsSummary {
  total: number;
  alerts: number;
  reports: number;
  timeToAccept: DurationSummary;
  timeToResolve: DurationSummary;
  acceptedResponses: number;
  declinedResponses: number;
  /** Declined ÷ (accepted + declined) responses; null when there were none. */
  declineRate: number | null;
  canceled: number;
  waiting: number;
  oldestWaitingSince: number | null;
  offices: OfficeStats[];
}

export function officeDisplayName(name: string | null | undefined): string {
  return name?.trim() || "Unnamed office";
}

export function summarizeInsights(data: InsightsData): InsightsSummary {
  const incidentById = new Map(data.incidents.map((incident) => [incident.id, incident]));

  // Earliest acceptance per incident (the first office to take it)
  const firstAcceptAt = new Map<string, number>();
  let acceptedResponses = 0;
  let declinedResponses = 0;

  type OfficeAccumulator = Omit<OfficeStats, "medianAccept" | "acceptSamples"> & { acceptDurations: number[] };
  const offices = new Map<string, OfficeAccumulator>();
  const officeFor = (responderId: string): OfficeAccumulator => {
    let office = offices.get(responderId);
    if (!office) {
      office = {
        id: responderId,
        name: officeDisplayName(data.officeNames[responderId]),
        accepted: 0,
        declined: 0,
        resolved: 0,
        acceptDurations: [],
      };
      offices.set(responderId, office);
    }
    return office;
  };

  for (const assignment of data.assignments) {
    const incident = incidentById.get(assignment.incidentId);
    if (!incident) continue;

    if (isAcceptedResponse(assignment.responseStatus)) {
      acceptedResponses += 1;
      const office = officeFor(assignment.responderId);
      office.accepted += 1;
      if (assignment.responseStatus === "completed" || incident.status === "completed") office.resolved += 1;

      if (assignment.respondedAt !== null) {
        office.acceptDurations.push(Math.max(0, assignment.respondedAt - incident.createdAt));
        const previous = firstAcceptAt.get(incident.id);
        if (previous === undefined || assignment.respondedAt < previous) {
          firstAcceptAt.set(incident.id, assignment.respondedAt);
        }
      }
    } else if (assignment.responseStatus === "rejected") {
      declinedResponses += 1;
      officeFor(assignment.responderId).declined += 1;
    }
  }

  const acceptDurations: number[] = [];
  const resolveDurations: number[] = [];
  let alerts = 0;
  let canceled = 0;
  let waiting = 0;
  let oldestWaitingSince: number | null = null;

  for (const incident of data.incidents) {
    if (incident.kind === "alert") alerts += 1;
    if (incident.status === "canceled") canceled += 1;
    if (incident.status === "pending") {
      waiting += 1;
      if (oldestWaitingSince === null || incident.createdAt < oldestWaitingSince) {
        oldestWaitingSince = incident.createdAt;
      }
    }

    const acceptAt = firstAcceptAt.get(incident.id);
    if (acceptAt === undefined) continue;
    acceptDurations.push(Math.max(0, acceptAt - incident.createdAt));
    // There is no resolved-at column, so the last update stands in for it
    if (incident.status === "completed" && incident.updatedAt >= acceptAt) {
      resolveDurations.push(incident.updatedAt - acceptAt);
    }
  }

  const responses = acceptedResponses + declinedResponses;

  return {
    total: data.incidents.length,
    alerts,
    reports: data.incidents.length - alerts,
    timeToAccept: summarize(acceptDurations),
    timeToResolve: summarize(resolveDurations),
    acceptedResponses,
    declinedResponses,
    declineRate: responses > 0 ? declinedResponses / responses : null,
    canceled,
    waiting,
    oldestWaitingSince,
    offices: Array.from(offices.values())
      .filter((office) => office.accepted + office.declined > 0)
      .map(({ acceptDurations: durations, ...office }) => {
        const summary = summarize(durations);
        return { ...office, medianAccept: summary.median, acceptSamples: summary.count };
      })
      .sort((a, b) => b.accepted - a.accepted || b.resolved - a.resolved || a.name.localeCompare(b.name)),
  };
}

// ---------------------------------------------------------------------------
// Time buckets for the chart
// ---------------------------------------------------------------------------

export type BucketUnit = "day" | "week";

export interface TimeBucket {
  key: string;
  start: Date;
  unit: BucketUnit;
  alerts: number;
  reports: number;
}

/** Past this many days (only reachable with All time), bars switch to weeks so they stay readable. */
const MAX_DAILY_BUCKETS = 62;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Monday 00:00 local of the week containing `date`. */
function startOfLocalWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function daysBetween(from: Date, to: Date): number {
  // Round to absorb daylight saving shifts
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / 86400000);
}

export function buildBuckets(data: InsightsData): { unit: BucketUnit; buckets: TimeBucket[] } {
  const today = startOfLocalDay(new Date(data.fetchedAt));
  let first = rangeStart(data.range, new Date(data.fetchedAt));
  if (first === null) {
    const earliest = data.incidents.reduce<number | null>(
      (min, incident) => (min === null || incident.createdAt < min ? incident.createdAt : min),
      null
    );
    first = startOfLocalDay(new Date(earliest ?? data.fetchedAt));
  }

  const unit: BucketUnit = daysBetween(first, today) + 1 > MAX_DAILY_BUCKETS ? "week" : "day";
  const bucketStart = unit === "week" ? startOfLocalWeek : startOfLocalDay;

  const buckets: TimeBucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let cursor = bucketStart(first); cursor.getTime() <= today.getTime(); ) {
    const key = dayKey(cursor);
    indexByKey.set(key, buckets.length);
    buckets.push({ key, start: new Date(cursor), unit, alerts: 0, reports: 0 });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + (unit === "week" ? 7 : 1));
  }

  for (const incident of data.incidents) {
    const index = indexByKey.get(dayKey(bucketStart(new Date(incident.createdAt))));
    if (index === undefined) continue;
    if (incident.kind === "alert") buckets[index].alerts += 1;
    else buckets[index].reports += 1;
  }

  return { unit, buckets };
}

/** Clean y-axis ticks for whole-number counts. */
export function niceCountScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const rough = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 1);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) ticks.push(tick);
  return { top, ticks };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Duration in milliseconds as "42 s", "3 min 20 s", "34 min", "2 h 05 min", "3 d 4 h". */
export function formatDurationMs(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 600) {
    const rest = seconds % 60;
    return rest ? `${Math.floor(seconds / 60)} min ${rest} s` : `${seconds / 60} min`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${String(rest).padStart(2, "0")} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

export function formatPercent(ratio: number): string {
  const percent = ratio * 100;
  if (percent > 0 && percent < 1) return "under 1%";
  return `${Math.round(percent)}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatCount(n)} ${n === 1 ? singular : pluralForm}`;
}

const sameYear = (date: Date, now: Date) => date.getFullYear() === now.getFullYear();

/** "Oct 21" (adds the year when it isn't this year). */
export function formatShortDate(date: Date, now: Date = new Date()): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear(date, now) ? undefined : "numeric",
  });
}

/** Full label for a bucket: "Tue, Oct 21" or "Week of Oct 20". */
export function formatBucketLabel(bucket: TimeBucket, now: Date = new Date()): string {
  if (bucket.unit === "week") return `Week of ${formatShortDate(bucket.start, now)}`;
  return bucket.start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: sameYear(bucket.start, now) ? undefined : "numeric",
  });
}
