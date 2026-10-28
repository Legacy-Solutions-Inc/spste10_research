"use client";

import { useState, type ReactNode } from "react";
import { Check, CheckCircle2, Copy, ExternalLink, ImageOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IncidentTypeBadge, WaitTimer, personFacts, personName } from "@/components/incident/IncidentBits";
import { useIncidentImage } from "@/hooks/useIncidentImage";
import { directionsUrl, formatCoordinates, formatDateTime, formatElapsed } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/incident";

export type IncidentDetailMode = "incoming" | "active" | "history";

export type IncidentOutcome = "active" | "resolved" | "declined" | "canceled";

interface IncidentDetailProps {
  incident: Incident;
  mode: IncidentDetailMode;
  now: number;
  onClose?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onResolve?: () => void;
  /** Which action is in flight, to show a spinner and lock the buttons */
  busy?: "accept" | "decline" | "resolve" | null;
  /** History only: how this responder's involvement ended */
  outcome?: IncidentOutcome;
  /** Extra content under the header, e.g. a mini map in History */
  media?: ReactNode;
  className?: string;
}

const OUTCOME_BADGE: Record<IncidentOutcome, { label: string; variant: "active" | "resolved" | "muted" | "warning" }> = {
  active: { label: "Active", variant: "active" },
  resolved: { label: "Resolved", variant: "resolved" },
  declined: { label: "Declined", variant: "muted" },
  canceled: { label: "Canceled by citizen", variant: "warning" },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function ReportPhoto({ imageUrl }: { imageUrl: string | null | undefined }) {
  const image = useIncidentImage(imageUrl);
  const [failed, setFailed] = useState(false);

  if (image.status === "none") {
    return <p className="text-sm text-muted-foreground">No photo was attached.</p>;
  }
  if (image.status === "loading") {
    return <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" aria-label="Loading photo" />;
  }
  if (image.status === "error" || failed) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/50 text-center text-13 text-muted-foreground">
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        The photo couldn&apos;t be loaded.
      </div>
    );
  }
  return (
    <a href={image.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt="Photo attached to the report"
        className="max-h-72 w-full object-cover transition-opacity group-hover:opacity-90"
        onError={() => setFailed(true)}
      />
      <span className="sr-only">Open full-size photo in a new tab</span>
    </a>
  );
}

function CopyCoordinates({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [copied, setCopied] = useState(false);
  const text = formatCoordinates(latitude, longitude);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the coordinates stay selectable
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="tabular select-all text-13 text-muted-foreground">{text}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={copy}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Copy coordinates"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-resolved" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : "Copy coordinates"}</TooltipContent>
      </Tooltip>
    </span>
  );
}

export function IncidentDetail({
  incident,
  mode,
  now,
  onClose,
  onAccept,
  onDecline,
  onResolve,
  busy = null,
  outcome,
  media,
  className,
}: IncidentDetailProps) {
  const name = personName(incident);
  const facts = personFacts(incident);
  const acceptedAt = incident.assignment?.response_status === "accepted" ? incident.assignment.responded_at || incident.assignment.assigned_at : null;
  const locked = busy !== null;

  return (
    <article className={cn("flex h-full flex-col", className)} aria-label="Incident details">
      <header className="flex items-start justify-between gap-3 border-b px-5 pb-4 pt-5">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <IncidentTypeBadge type={incident.type} />
            {mode === "incoming" && <WaitTimer since={incident.created_at} now={now} prefix="Waiting" />}
            {mode === "active" && acceptedAt && (
              <span className="tabular text-xs text-muted-foreground">Accepted {formatElapsed(acceptedAt, now)} ago</span>
            )}
            {mode === "history" && outcome && <Badge variant={OUTCOME_BADGE[outcome].variant}>{OUTCOME_BADGE[outcome].label}</Badge>}
          </div>
          <h2 className="text-xl font-semibold leading-snug text-foreground">{incident.location_name || "Location not named"}</h2>
          <CopyCoordinates latitude={incident.latitude} longitude={incident.longitude} />
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close details" className="-mr-2 -mt-1 shrink-0">
            <X />
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {media}

        {incident.type === "alert" ? (
          <Section title="Person needing help">
            {name || facts.length ? (
              <div>
                <p className="text-base font-medium text-foreground">{name || "Name not provided"}</p>
                {facts.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {facts.map((fact) => (
                      <li key={fact} className="rounded-md bg-muted px-2 py-0.5 text-13 text-foreground">
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">The citizen didn&apos;t add personal details.</p>
            )}
          </Section>
        ) : (
          <>
            <Section title="Photo">
              <ReportPhoto imageUrl={incident.image_url} />
            </Section>
            <Section title="Description">
              <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-foreground">
                {incident.description || <span className="text-muted-foreground">No description was added.</span>}
              </p>
            </Section>
            {incident.reporter_name && (
              <Section title="Reported by">
                <p className="text-sm text-foreground">{incident.reporter_name}</p>
              </Section>
            )}
          </>
        )}

        <Section title="Timeline">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-13">
            <dt className="text-muted-foreground">Received</dt>
            <dd className="tabular text-foreground">{formatDateTime(incident.created_at)}</dd>
            {acceptedAt && (
              <>
                <dt className="text-muted-foreground">Accepted</dt>
                <dd className="tabular text-foreground">{formatDateTime(acceptedAt)}</dd>
              </>
            )}
            {mode === "history" && outcome === "declined" && incident.assignment?.responded_at && (
              <>
                <dt className="text-muted-foreground">Declined</dt>
                <dd className="tabular text-foreground">{formatDateTime(incident.assignment.responded_at)}</dd>
              </>
            )}
            {mode === "history" && outcome === "resolved" && (
              <>
                <dt className="text-muted-foreground">Resolved</dt>
                <dd className="tabular text-foreground">{formatDateTime(incident.updated_at)}</dd>
              </>
            )}
            {mode === "history" && outcome === "canceled" && (
              <>
                <dt className="text-muted-foreground">Canceled</dt>
                <dd className="tabular text-foreground">{formatDateTime(incident.canceled_at || incident.updated_at)}</dd>
              </>
            )}
          </dl>
        </Section>
      </div>

      {mode !== "history" && (
        <footer className="space-y-2 border-t bg-card px-5 py-4">
          {mode === "incoming" && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onDecline} disabled={locked}>
                {busy === "decline" && <Loader2 className="animate-spin" />}
                Decline
              </Button>
              <Button className="flex-[2]" onClick={onAccept} disabled={locked}>
                {busy === "accept" ? <Loader2 className="animate-spin" /> : <Check />}
                Accept
              </Button>
            </div>
          )}
          {mode === "active" && (
            <Button variant="success" className="w-full" onClick={onResolve} disabled={locked}>
              {busy === "resolve" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Mark resolved
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full text-primary" asChild>
            <a href={directionsUrl(incident.latitude, incident.longitude)} target="_blank" rel="noreferrer">
              <ExternalLink />
              Get directions in Google Maps
            </a>
          </Button>
        </footer>
      )}
    </article>
  );
}
