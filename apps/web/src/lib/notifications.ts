"use client";

import type { Incident } from "@/types/incident";

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<"default" | "granted" | "denied"> {
  if (!("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "default") {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

/**
 * Show browser notification for a new incident
 */
export function showIncidentNotification(incident: Incident): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const incidentType = incident.type === "alert" ? "Emergency Alert" : "Emergency Report";
  const location = incident.location_name || "Unknown location";
  const timestamp = new Date(incident.created_at).toLocaleTimeString();

  new Notification(`${incidentType} - AGAP`, {
    body: `New ${incidentType.toLowerCase()} at ${location}\nTime: ${timestamp}`,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: incident.id, // Prevent duplicate notifications
    requireInteraction: false,
  });
}

/**
 * Play notification sound using Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure sound: beep tone
    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = "sine";

    // Fade in/out for smoother sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
    // Fallback: try HTML5 audio if available
    try {
      const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURAJR6Hf8sBxJgUwgM/z1IU5CBxsvO3mnlEQCEef4fK+bCEFMYfR89OCMwYebsDv45lREAlHod/ywHEmBTCAz/PUhTkIHGy87eaeURAIR5/h8r5sIQUxh9Hz04IzBh5uwO/jmVEQCUeh3/LAcSYFMIDP89SFOQgcbLzt5p5REAhHn+HyvmwhBTGH0fPTgjMGHm7A7+OZURA=");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if audio can't play
      });
    } catch (fallbackError) {
      // Silently fail if both methods don't work
    }
  }
}
