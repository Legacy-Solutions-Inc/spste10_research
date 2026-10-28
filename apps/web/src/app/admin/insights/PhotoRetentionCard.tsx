"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ImageOff, Loader2, Trash2 } from "lucide-react";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { formatShortDate, plural } from "./metrics";
import { deletePhotos, fetchDuePhotos, RETENTION_DAYS, type DeleteOutcome, type DuePhoto } from "./photoRetention";

function announceOutcome(outcome: DeleteOutcome) {
  if (outcome.deleted === 0) {
    if (outcome.storageError) {
      toast({
        title: "Couldn't delete photos",
        description: "Nothing was deleted. Check your connection and try again.",
        variant: "error",
      });
    } else {
      // remove() returns an empty list, not an error, when the delete policy is missing
      toast({
        title: "Photos couldn't be deleted",
        description:
          "Storage doesn't allow deleting photos yet. An administrator needs to apply the latest database migrations, then try again.",
        variant: "error",
      });
    }
    return;
  }

  const allDeleted = outcome.deleted === outcome.requested;
  const notes: string[] = [];
  if (!allDeleted) {
    notes.push(
      `${plural(outcome.requested - outcome.deleted, "photo")} couldn't be removed from storage${
        outcome.storageError ? " because the connection failed" : ""
      }. Try again later.`
    );
  }
  if (outcome.reportsNotCleared > 0) {
    notes.push(
      `${plural(outcome.reportsNotCleared, "Report")} still ${
        outcome.reportsNotCleared === 1 ? "lists" : "list"
      } a photo that's now gone and will show it as unavailable.`
    );
  }

  toast({
    title: allDeleted
      ? `Deleted ${plural(outcome.deleted, "photo")}`
      : `Deleted ${outcome.deleted.toLocaleString("en-US")} of ${plural(outcome.requested, "photo")}`,
    description: notes.length ? notes.join(" ") : "The Reports are still available, without their photos.",
    variant: allDeleted && outcome.reportsNotCleared === 0 ? "success" : "error",
  });
}

export function PhotoRetentionCard() {
  const [photos, setPhotos] = useState<DuePhoto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const loadId = ++latestLoad.current;
    setStatus("loading");
    try {
      const due = await fetchDuePhotos();
      if (loadId !== latestLoad.current) return;
      setPhotos(due);
      setStatus("ready");
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      console.error("Error loading photos due for deletion:", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      announceOutcome(await deletePhotos(photos));
    } catch (err) {
      console.error("Error deleting report photos:", err);
      toast({
        title: "Couldn't delete photos",
        description: "Something went wrong partway through. Refresh the page to see what's still due, then try again.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
      load();
    }
  }, [photos, load]);

  const count = photos.length;
  const oldest = photos[0]?.updatedAt;

  const renderBody = () => {
    if (status === "loading" && !deleting) {
      return (
        <div className="flex items-center gap-3" aria-hidden>
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div role="alert" className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-alert" aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">Couldn&apos;t check which photos are due</p>
            <p className="mt-0.5 text-13 text-muted-foreground">Check your connection, then try again.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <ImageOff className="h-5 w-5" aria-hidden />
          </div>
          <div aria-live="polite">
            <p className="text-sm font-medium text-foreground">
              {count > 0 ? `${plural(count, "photo")} due for deletion` : "No photos are due for deletion"}
            </p>
            <p className="text-13 text-muted-foreground">
              {count > 0 && oldest
                ? `The oldest is from a Report last updated ${formatShortDate(new Date(oldest))}.`
                : `Photos become due ${RETENTION_DAYS} days after their Report is resolved or canceled.`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={count === 0 || deleting} onClick={() => setConfirmOpen(true)}>
          {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
          {deleting ? "Deleting photos…" : "Delete these photos"}
        </Button>
      </div>
    );
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-foreground">Photo retention</h2>
      <p className="mt-1 max-w-prose text-13 text-muted-foreground">
        Photos from resolved and canceled Reports can be deleted once the Report hasn&apos;t changed for{" "}
        {RETENTION_DAYS} days. The Report&apos;s text, location and response history stay. This covers all Reports,
        not just the date range above.
      </p>
      <div className="mt-4 rounded-lg border bg-background px-4 py-3">{renderBody()}</div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {plural(count, "photo")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {count === 1 ? "This photo" : "These photos"} will be permanently removed from storage and can&apos;t be
              recovered. The Reports stay, with their text, location and response history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleDelete}>
              Delete photos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
