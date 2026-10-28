"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Bell, BellOff, BellRing, Volume2, VolumeX } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IncidentDetail } from "@/components/incident/IncidentDetail";
import { IncidentQueue, type QueueTab } from "./IncidentQueue";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";
import { useIncidentQueue } from "@/hooks/useIncidentQueue";
import { useIncidentAlerting } from "@/hooks/useIncidentAlerting";
import { useResponderLocation } from "@/hooks/useResponderLocation";
import { useNow } from "@/hooks/useNow";
import { IncidentUnavailableError, resolveIncident, respondToIncident, undoDecline } from "@/lib/incidentActions";
import { INCIDENT_TYPE_LABEL } from "@/components/incident/IncidentBits";
import type { Incident } from "@/types/incident";

const IncidentMap = dynamic(() => import("@/components/incident/IncidentMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" aria-label="Loading map" />,
});

// Iloilo City, used until the office address is located
const ILOILO_CENTER: [number, number] = [10.7202, 122.5621];
const DETAIL_PANEL_WIDTH = 400;

type Busy = { id: string; action: "accept" | "decline" | "resolve" } | null;

const placeName = (incident: Incident) => incident.location_name || "This incident";

function AlertControls({
  needsSetup,
  soundOn,
  permission,
  onEnable,
  onToggleSound,
}: {
  needsSetup: boolean;
  soundOn: boolean;
  permission: ReturnType<typeof useIncidentAlerting>["permission"];
  onEnable: () => void;
  onToggleSound: () => void;
}) {
  if (needsSetup) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={onEnable} className="shadow-panel">
            <BellRing />
            Enable alerts
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[260px]">
          Plays a sound and shows a desktop notification when a new incident arrives.
        </TooltipContent>
      </Tooltip>
    );
  }

  const notificationsBlocked = permission === "denied" || permission === "unsupported";

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-panel">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex h-8 cursor-default items-center gap-1.5 px-2 text-13 font-medium text-foreground" tabIndex={0}>
            {notificationsBlocked ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-primary" />}
            {notificationsBlocked ? "Sound only" : "Alerts on"}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[260px]">
          {permission === "denied"
            ? "Desktop notifications are blocked for this site. Allow them in your browser's site settings to get alerts while AGAP is in the background."
            : permission === "unsupported"
              ? "This browser doesn't support desktop notifications."
              : "You'll get a sound and a desktop notification for each new incident."}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSound} aria-label={soundOn ? "Mute alert sound" : "Turn alert sound on"} aria-pressed={!soundOn}>
            {soundOn ? <Volume2 /> : <VolumeX className="text-alert" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {soundOn ? "Mute alert sound" : "Turn alert sound on"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function DashboardClient() {
  const now = useNow(1000);
  const office = useResponderLocation();
  const [tab, setTab] = useState<QueueTab>("incoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmResolve, setConfirmResolve] = useState<Incident | null>(null);
  // Bumped after Accept/Decline/Resolve so the map zooms back out to the remaining pins
  const [fitNonce, setFitNonce] = useState(0);

  const announceRef = useRef<(arrivals: Incident[]) => void>(() => {});
  const handleArrivals = useCallback((arrivals: Incident[]) => {
    announceRef.current(arrivals);
    arrivals.forEach((incident) => {
      toast({
        title: `New ${INCIDENT_TYPE_LABEL[incident.type]}`,
        description: incident.location_name || "Location not named",
        variant: incident.type === "alert" ? "error" : "default",
      });
    });
  }, []);

  const queue = useIncidentQueue(handleArrivals);
  const { incoming, active, refetch, removeFromIncoming, removeFromActive } = queue;

  const alerting = useIncidentAlerting({ incomingIds: incoming.map((i) => i.id), title: "Dashboard" });
  announceRef.current = alerting.announce;

  const list = tab === "incoming" ? incoming : active;
  const selected = useMemo(() => list.find((incident) => incident.id === selectedId) ?? null, [list, selectedId]);

  const { markSeen } = alerting;
  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      markSeen(id);
    },
    [markSeen]
  );

  const changeTab = (next: QueueTab) => {
    setTab(next);
    setSelectedId(null);
  };

  // If the open incident leaves the queue for reasons outside this screen
  // (another office accepted it, the citizen canceled), close it and say why.
  const previousIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const ids = new Set(list.map((incident) => incident.id));
    if (selectedId && !ids.has(selectedId) && previousIds.current.has(selectedId)) {
      setSelectedId(null);
      toast({
        title: "Incident no longer available",
        description:
          tab === "incoming"
            ? "Another office accepted it or the citizen canceled it."
            : "The citizen closed it from their app.",
      });
    }
    previousIds.current = ids;
  }, [list, selectedId, tab]);

  // Escape closes the detail panel (dialogs handle their own Escape)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[role="alertdialog"]')) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleUnavailable = (error: unknown, fallbackTitle: string) => {
    if (error instanceof IncidentUnavailableError) {
      toast({ title: "Already handled", description: error.message, variant: "error" });
      setSelectedId(null);
    } else {
      toast({
        title: fallbackTitle,
        description: error instanceof Error ? error.message : "Check your connection and try again.",
        variant: "error",
      });
    }
    refetch();
  };

  const accept = async (incident: Incident) => {
    setBusy({ id: incident.id, action: "accept" });
    try {
      await respondToIncident(incident, "accepted");
      removeFromIncoming(incident.id);
      setSelectedId(null);
      setFitNonce((n) => n + 1);
      toast({
        title: "Accepted",
        description: `${placeName(incident)} is now in Active.`,
        variant: "success",
        action: (
          <ToastAction
            altText="Open the accepted incident"
            onClick={() => {
              setTab("active");
              setSelectedId(incident.id);
            }}
          >
            Open
          </ToastAction>
        ),
      });
      refetch();
    } catch (error) {
      handleUnavailable(error, "Couldn't accept this incident");
    } finally {
      setBusy(null);
    }
  };

  const decline = async (incident: Incident) => {
    setBusy({ id: incident.id, action: "decline" });
    try {
      const assignmentId = await respondToIncident(incident, "rejected");
      removeFromIncoming(incident.id);
      setSelectedId(null);
      setFitNonce((n) => n + 1);
      toast({
        duration: 10000,
        title: "Declined",
        description: `${placeName(incident)} is hidden from your queue. Other offices can still accept it.`,
        action: (
          <ToastAction
            altText="Undo decline"
            onClick={async () => {
              try {
                await undoDecline(assignmentId);
                toast({ title: "Back in Incoming", description: placeName(incident) });
              } catch (error) {
                toast({
                  title: "Couldn't undo the decline",
                  description: error instanceof Error ? error.message : "Try again.",
                  variant: "error",
                });
              }
              refetch();
            }}
          >
            Undo
          </ToastAction>
        ),
      });
      refetch();
    } catch (error) {
      handleUnavailable(error, "Couldn't decline this incident");
    } finally {
      setBusy(null);
    }
  };

  const resolve = async (incident: Incident) => {
    setConfirmResolve(null);
    setBusy({ id: incident.id, action: "resolve" });
    try {
      await resolveIncident(incident);
      removeFromActive(incident.id);
      setSelectedId(null);
      setFitNonce((n) => n + 1);
      toast({ title: "Marked resolved", description: `${placeName(incident)} moved to History.`, variant: "success" });
      refetch();
    } catch (error) {
      handleUnavailable(error, "Couldn't mark this incident resolved");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell className="flex overflow-hidden">
      <IncidentQueue
        tab={tab}
        onTabChange={changeTab}
        incoming={incoming}
        active={active}
        selectedId={selectedId}
        onSelect={select}
        unseenIds={alerting.unseenIds}
        now={now}
        loading={queue.loading}
        error={queue.error}
        onRetry={refetch}
        live={queue.live}
      />

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0 isolate">
          <IncidentMap
            incidents={list}
            selectedId={selectedId}
            onSelect={select}
            variant={tab}
            office={office.loading ? null : { coordinates: office.coordinates, located: office.located, approximate: office.approximate }}
            fallbackCenter={ILOILO_CENTER}
            leftInset={selected ? DETAIL_PANEL_WIDTH + 16 : 0}
            fitKey={`${tab}-${fitNonce}`}
          />
        </div>

        <div className="absolute right-4 top-4 z-10">
          <AlertControls
            needsSetup={alerting.needsSetup}
            soundOn={alerting.soundOn}
            permission={alerting.permission}
            onEnable={alerting.enable}
            onToggleSound={alerting.toggleSound}
          />
        </div>

        {selected && (
          <div
            className="absolute bottom-4 left-4 top-4 z-10 overflow-hidden rounded-xl border bg-card shadow-panel animate-in fade-in-0 slide-in-from-left-2 duration-150"
            style={{ width: DETAIL_PANEL_WIDTH }}
          >
            <IncidentDetail
              key={selected.id}
              incident={selected}
              mode={tab}
              now={now}
              onClose={() => setSelectedId(null)}
              onAccept={() => accept(selected)}
              onDecline={() => decline(selected)}
              onResolve={() => setConfirmResolve(selected)}
              busy={busy?.id === selected.id ? busy.action : null}
            />
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmResolve} onOpenChange={(open) => !open && setConfirmResolve(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this incident resolved?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmResolve ? `${placeName(confirmResolve)} moves to History, ` : "It moves to History, "}
              and the citizen&apos;s app shows it as completed. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction className="bg-resolved hover:bg-resolved/90" onClick={() => confirmResolve && resolve(confirmResolve)}>
              Mark resolved
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
