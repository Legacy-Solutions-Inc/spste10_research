"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Incident } from "@/types/incident";
import {
  SOUND_CHANGE_EVENT,
  getNotificationPermission,
  getSoundEnabled,
  isAudioUnlocked,
  playChime,
  requestNotificationPermission,
  setSoundEnabled,
  showIncidentNotification,
  unlockAudio,
  type NotificationPermissionState,
} from "@/lib/notifications";

// Unopened Emergency Alerts chime again on this interval until someone opens them
const REPEAT_MS = 8000;

/**
 * New-incident alerting for the dashboard:
 * - sound on/off (shared with Settings) and whether the browser lets us play audio yet
 * - browser notification permission, requested only from a click
 * - Emergency Alerts that arrived this session repeat a chime until opened
 * - "(3) Dashboard | AGAP" tab title while incidents are waiting
 */
export function useIncidentAlerting({ incomingIds, title }: { incomingIds: string[]; title: string }) {
  const [soundOn, setSoundOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [unseenIds, setUnseenIds] = useState<Set<string>>(() => new Set());

  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  useEffect(() => {
    setSoundOn(getSoundEnabled());
    setPermission(getNotificationPermission());
    setAudioReady(isAudioUnlocked());

    const onSoundChange = (event: Event) => setSoundOn((event as CustomEvent<boolean>).detail);
    window.addEventListener(SOUND_CHANGE_EVENT, onSoundChange);

    // Any click or keypress on the page lets the browser play audio
    const unlock = async () => {
      if (await unlockAudio()) {
        setAudioReady(true);
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener(SOUND_CHANGE_EVENT, onSoundChange);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /** "Enable alerts" button: unlock sound, ask for notifications, play a sample. */
  const enable = useCallback(async () => {
    const ready = await unlockAudio();
    setAudioReady(ready);
    if (!soundOnRef.current) setSoundEnabled(true);
    setPermission(await requestNotificationPermission());
    if (ready) playChime("report");
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundOnRef.current);
  }, []);

  /** Call with incidents that just arrived. */
  const announce = useCallback((arrivals: Incident[]) => {
    arrivals.forEach((incident) => showIncidentNotification(incident));
    if (soundOnRef.current) {
      playChime(arrivals.some((incident) => incident.type === "alert") ? "alert" : "report");
    }
    const newAlerts = arrivals.filter((incident) => incident.type === "alert").map((incident) => incident.id);
    if (newAlerts.length) {
      setUnseenIds((prev) => new Set([...Array.from(prev), ...newAlerts]));
    }
  }, []);

  const markSeen = useCallback((id: string) => {
    setUnseenIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Forget unseen alerts that left the queue (accepted elsewhere, canceled, declined)
  const incomingKey = incomingIds.join(",");
  useEffect(() => {
    const present = new Set(incomingKey ? incomingKey.split(",") : []);
    setUnseenIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => present.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [incomingKey]);

  // Keep chiming while an Emergency Alert sits unopened
  const hasUnseen = unseenIds.size > 0;
  useEffect(() => {
    if (!hasUnseen || !soundOn || !audioReady) return;
    const id = setInterval(() => playChime("alert"), REPEAT_MS);
    return () => clearInterval(id);
  }, [hasUnseen, soundOn, audioReady]);

  const waiting = incomingIds.length;
  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) ${title} | AGAP` : `${title} | AGAP`;
  }, [waiting, title]);

  return {
    soundOn,
    audioReady,
    permission,
    /** Show the "Enable alerts" call to action until sound can play and notifications were decided */
    needsSetup: !audioReady || permission === "default",
    enable,
    toggleSound,
    announce,
    unseenIds,
    markSeen,
  };
}
