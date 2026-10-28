"use client";

import { createClient } from "@/lib/supabaseBrowser";
import { chunk, fetchAllRows } from "./queryHelpers";

export const REPORT_IMAGES_BUCKET = "report-images";
export const RETENTION_DAYS = 30;

export interface DuePhoto {
  reportId: string;
  /** Object path inside the report-images bucket, e.g. "userId/reportId/photo.jpg". */
  path: string;
  updatedAt: string;
}

/**
 * Reports store either the storage path itself or a full storage URL.
 * Returns the object path inside the bucket, or null if it isn't a file in our bucket.
 */
export function storagePathFromImageUrl(imageUrl: string): string | null {
  let value = imageUrl.trim();
  if (!value) return null;
  const marker = `${REPORT_IMAGES_BUCKET}/`;

  if (/^https?:\/\//i.test(value)) {
    const index = value.indexOf(marker);
    if (index === -1) return null;
    value = value.slice(index + marker.length).split(/[?#]/)[0];
    try {
      // URLs carry the path percent-encoded; storage object names are not
      value = decodeURIComponent(value);
    } catch {
      // Keep the raw value if it isn't valid percent-encoding
    }
  } else if (value.startsWith(marker)) {
    value = value.slice(marker.length);
  }

  value = value.replace(/^\/+/, "");
  return value || null;
}

/** Photos on resolved or canceled Reports whose last update is more than 30 days ago. */
export async function fetchDuePhotos(): Promise<DuePhoto[]> {
  const supabase = createClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();

  const rows = await fetchAllRows<{ id: string; image_url: string | null; updated_at: string }>((from, to) =>
    supabase
      .from("reports")
      .select("id, image_url, updated_at")
      .in("status", ["completed", "canceled"])
      .not("image_url", "is", null)
      .lt("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  );

  const photos: DuePhoto[] = [];
  for (const row of rows) {
    const path = row.image_url ? storagePathFromImageUrl(row.image_url) : null;
    if (path) photos.push({ reportId: row.id, path, updatedAt: row.updated_at });
  }
  return photos;
}

export interface DeleteOutcome {
  /** Distinct files we asked storage to delete. */
  requested: number;
  /** Files storage confirmed it deleted. */
  deleted: number;
  /** Reports whose image_url was cleared after their file was deleted. */
  reportsCleared: number;
  /** Reports whose file was deleted but whose image_url couldn't be cleared. */
  reportsNotCleared: number;
  storageError: string | null;
}

/**
 * Deletes the files, then clears image_url only on Reports whose file storage
 * confirmed deleting. `remove` silently returns an empty list when the storage
 * delete policy is missing, so `deleted` is the only trustworthy signal.
 */
export async function deletePhotos(photos: DuePhoto[]): Promise<DeleteOutcome> {
  const supabase = createClient();

  const reportIdsByPath = new Map<string, string[]>();
  for (const photo of photos) {
    const ids = reportIdsByPath.get(photo.path) ?? [];
    ids.push(photo.reportId);
    reportIdsByPath.set(photo.path, ids);
  }
  const paths = Array.from(reportIdsByPath.keys());

  const deletedPaths = new Set<string>();
  let storageError: string | null = null;
  for (const batch of chunk(paths)) {
    const { data, error } = await supabase.storage.from(REPORT_IMAGES_BUCKET).remove(batch);
    if (error) {
      storageError = error.message;
      break;
    }
    for (const object of data ?? []) {
      const name = object.name.replace(/^\/+/, "");
      if (reportIdsByPath.has(name)) deletedPaths.add(name);
    }
  }

  const idsToClear = Array.from(deletedPaths).flatMap((path) => reportIdsByPath.get(path) ?? []);
  let reportsCleared = 0;
  for (const batch of chunk(idsToClear)) {
    const { data, error } = await supabase
      .from("reports")
      // @ts-ignore - generated types don't include the reports table yet
      .update({ image_url: null })
      .in("id", batch)
      .select("id");
    if (error) {
      console.error("Error clearing image_url after deleting photos:", error);
      continue;
    }
    reportsCleared += data?.length ?? 0;
  }

  return {
    requested: paths.length,
    deleted: deletedPaths.size,
    reportsCleared,
    reportsNotCleared: idsToClear.length - reportsCleared,
    storageError,
  };
}
