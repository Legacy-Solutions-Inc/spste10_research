"use client";

import { Camera, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatElapsed, waitLevel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/incident";

export const INCIDENT_TYPE_LABEL: Record<Incident["type"], string> = {
  alert: "Emergency Alert",
  report: "Report",
};

export function IncidentTypeIcon({ type, className }: { type: Incident["type"]; className?: string }) {
  const Icon = type === "alert" ? Siren : Camera;
  return <Icon className={cn("h-4 w-4 shrink-0", type === "alert" ? "text-alert" : "text-report", className)} aria-hidden="true" />;
}

export function IncidentTypeBadge({ type, short = false }: { type: Incident["type"]; short?: boolean }) {
  const Icon = type === "alert" ? Siren : Camera;
  return (
    <Badge variant={type === "alert" ? "alert" : "report"}>
      <Icon aria-hidden="true" />
      {short ? (type === "alert" ? "Alert" : "Report") : INCIDENT_TYPE_LABEL[type]}
    </Badge>
  );
}

/** Live "time waiting" chip: neutral, then amber after 5 min, red after 15 min. */
export function WaitTimer({ since, now, prefix, className }: { since: string; now: number; prefix?: string; className?: string }) {
  const level = waitLevel(since, now);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "tabular inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
            level === "normal" && "bg-muted text-muted-foreground",
            level === "warn" && "bg-amber-100 text-amber-800",
            level === "critical" && "bg-alert-soft text-alert",
            className
          )}
        >
          {prefix ? `${prefix} ` : ""}
          {formatElapsed(since, now)}
        </span>
      </TooltipTrigger>
      <TooltipContent>Received {formatDateTime(since)}</TooltipContent>
    </Tooltip>
  );
}

/** Name of the person the incident is about: the victim on an alert, else the account holder. */
export function personName(incident: Incident): string | null {
  return incident.victim_name || incident.reporter_name || null;
}

export function personFacts(incident: Incident): string[] {
  const age = incident.victim_age ?? incident.reporter_age;
  const sex = incident.victim_sex || incident.reporter_sex;
  const blood = incident.victim_blood_type || incident.reporter_blood_type;
  return [age ? `${age} yrs` : null, sex || null, blood ? `Blood ${blood}` : null].filter((fact): fact is string => !!fact);
}
