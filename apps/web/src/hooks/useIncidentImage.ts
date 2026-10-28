"use client";

import { useEffect, useState } from "react";
import { extractFilePath, getSignedUrl } from "@/lib/storageUtils";

const BUCKET = "report-images";
// Signed URLs last an hour; reuse them for a bit less than that
const CACHE_MS = 50 * 60 * 1000;
const cache = new Map<string, { url: string; at: number }>();

type ImageState = { status: "none" } | { status: "loading" } | { status: "ready"; url: string } | { status: "error" };

/** Resolve a report's stored image (path or URL) to something an <img> can load. */
export function useIncidentImage(imageUrl: string | null | undefined): ImageState {
  const [state, setState] = useState<ImageState>({ status: imageUrl ? "loading" : "none" });

  useEffect(() => {
    if (!imageUrl) {
      setState({ status: "none" });
      return;
    }

    // Public or already-signed URLs work as-is
    if (/^https?:\/\//.test(imageUrl) && !imageUrl.includes("/storage/v1/object/sign/") && !imageUrl.includes("/storage/v1/object/authenticated/")) {
      setState({ status: "ready", url: imageUrl });
      return;
    }

    const cached = cache.get(imageUrl);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      setState({ status: "ready", url: cached.url });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const path = extractFilePath(imageUrl, BUCKET);
    getSignedUrl(BUCKET, path).then((url) => {
      if (cancelled) return;
      if (url) {
        cache.set(imageUrl, { url, at: Date.now() });
        setState({ status: "ready", url });
      } else {
        setState({ status: "error" });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return state;
}
