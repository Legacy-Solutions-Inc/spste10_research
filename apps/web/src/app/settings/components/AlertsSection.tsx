"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  SOUND_CHANGE_EVENT,
  getNotificationPermission,
  getSoundEnabled,
  playChime,
  requestNotificationPermission,
  setSoundEnabled,
  unlockAudio,
  type NotificationPermissionState,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

function Switch({
  checked,
  onCheckedChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-card shadow-sm ring-0 transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function NotificationStatus({
  permission,
  requesting,
  onAllow,
}: {
  permission: NotificationPermissionState;
  requesting: boolean;
  onAllow: () => void;
}) {
  switch (permission) {
    case "default":
      return (
        <div className="space-y-3">
          <p className="text-13 text-muted-foreground">
            Show a system notification for each new incident while the dashboard is open, even in a background tab.
          </p>
          <Button type="button" size="sm" onClick={onAllow} disabled={requesting}>
            {requesting ? <Loader2 className="animate-spin" aria-hidden /> : <Bell aria-hidden />}
            Allow notifications
          </Button>
        </div>
      );
    case "granted":
      return (
        <div className="space-y-1.5">
          <Badge variant="resolved">On</Badge>
          <p className="text-13 text-muted-foreground">
            New incidents show a system notification while the dashboard is open, even in a background tab.
          </p>
        </div>
      );
    case "denied":
      return (
        <div className="space-y-1.5">
          <Badge variant="muted">Blocked</Badge>
          <p className="text-13 text-muted-foreground">
            Your browser is blocking notifications from AGAP. To turn them on, open the site settings for this site
            (the icon to the left of the address bar), set Notifications to Allow, then reload this page.
          </p>
        </div>
      );
    case "unsupported":
      return (
        <div className="space-y-1.5">
          <Badge variant="muted">Not supported</Badge>
          <p className="text-13 text-muted-foreground">
            This browser doesn&apos;t support notifications. Alert sounds still play on the dashboard.
          </p>
        </div>
      );
  }
}

export default function AlertsSection() {
  const { toast } = useToast();
  // Both are browser-only, so they're read after mount to avoid a hydration mismatch
  const [soundOn, setSoundOn] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSoundOn(getSoundEnabled());
    setPermission(getNotificationPermission());

    // Stay in sync if the sound is toggled elsewhere (e.g. the dashboard)
    const handleSoundChange = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setSoundOn(typeof detail === "boolean" ? detail : getSoundEnabled());
    };
    // Permission can change in the browser's site settings while this page is open
    const handleFocus = () => setPermission(getNotificationPermission());

    window.addEventListener(SOUND_CHANGE_EVENT, handleSoundChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener(SOUND_CHANGE_EVENT, handleSoundChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleSoundToggle = (next: boolean) => {
    setSoundOn(next);
    setSoundEnabled(next);
    // This is a click, so it's a chance to let the browser play audio later
    if (next) void unlockAudio();
  };

  const handleTestSound = async () => {
    setTesting(true);
    try {
      const unlocked = await unlockAudio();
      if (!unlocked) {
        toast({
          title: "Couldn't play the test sound",
          description: "Your browser blocked audio. Make sure this site isn't muted, then try again.",
          variant: "error",
        });
        return;
      }
      playChime("alert");
    } finally {
      setTesting(false);
    }
  };

  const handleAllowNotifications = async () => {
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === "granted") {
        toast({ title: "Notifications allowed", variant: "success" });
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Couldn't ask for permission",
        description: "Your browser didn't show the request. Try again, or allow notifications in this site's settings.",
        variant: "error",
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
        <CardDescription>Alerts play on the dashboard when new incidents arrive.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
          <div className="min-w-0 flex-1 space-y-1">
            <p id="alert-sound-label" className="text-sm font-medium text-foreground">
              Alert sound
            </p>
            <p id="alert-sound-description" className="text-13 text-muted-foreground">
              Play a chime for each new incident on the dashboard.
            </p>
            <div className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleTestSound} disabled={testing}>
                <Volume2 aria-hidden />
                Play test sound
              </Button>
            </div>
          </div>
          {soundOn === null ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={soundOn}
              onCheckedChange={handleSoundToggle}
              labelledBy="alert-sound-label"
              describedBy="alert-sound-description"
            />
          )}
        </div>

        <div className="space-y-2 pt-5">
          <p className="text-sm font-medium text-foreground">Browser notifications</p>
          {permission === null ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            <NotificationStatus
              permission={permission}
              requesting={requesting}
              onAllow={handleAllowNotifications}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
