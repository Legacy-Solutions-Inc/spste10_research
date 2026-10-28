"use client";

import type { Incident } from "@/types/incident";

/**
 * Alerting for new incidents: browser notifications plus a chime.
 *
 * Browsers only allow audio after the person interacts with the page, so the
 * dashboard "arms" alerts from a click (unlockAudio) and the chime is skipped
 * until then.
 */

const SOUND_KEY = "agap:alert-sound";
export const SOUND_CHANGE_EVENT = "agap:alert-sound-change";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

/** Call from a click or keypress so later chimes are allowed to play. */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

export function isAudioUnlocked(): boolean {
  return audioContext?.state === "running";
}

export function getSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Preference just won't persist
  }
  window.dispatchEvent(new CustomEvent(SOUND_CHANGE_EVENT, { detail: enabled }));
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, peak: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/**
 * Emergency Alerts get a rising three-note chime; Reports a softer two-note one.
 * Silently does nothing if audio isn't unlocked yet.
 */
export function playChime(kind: "alert" | "report"): void {
  const ctx = audioContext;
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  if (kind === "alert") {
    tone(ctx, 880, t, 0.18, 0.32);
    tone(ctx, 1175, t + 0.2, 0.18, 0.32);
    tone(ctx, 1568, t + 0.4, 0.3, 0.32);
  } else {
    tone(ctx, 660, t, 0.2, 0.22);
    tone(ctx, 880, t + 0.22, 0.28, 0.22);
  }
}

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Ask for permission. Only call from a click; browsers ignore or penalize unprompted requests. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export function showIncidentNotification(incident: Incident): void {
  if (getNotificationPermission() !== "granted") return;

  const title = incident.type === "alert" ? "New Emergency Alert" : "New Report";
  const location = incident.location_name || "Location not named";

  const notification = new Notification(title, {
    body: `${location}\nReceived ${new Date(incident.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    icon: "/icon.svg",
    tag: incident.id,
    requireInteraction: incident.type === "alert",
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
