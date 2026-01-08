import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Check if a URL/path is a valid Supabase Storage path
 * @param urlOrPath - The URL or path to check
 * @param bucketName - The bucket name to validate against
 * @returns true if it's a valid storage path, false otherwise
 */
export function isStoragePath(urlOrPath: string | null, bucketName: string): boolean {
  if (!urlOrPath || typeof urlOrPath !== "string") return false;

  const trimmed = urlOrPath.trim();

  // Skip empty strings
  if (trimmed === "") return false;

  // Skip local file paths
  if (trimmed.startsWith("file://")) return false;

  // Valid if it's a Supabase Storage URL
  if (trimmed.includes("/storage/v1/object/")) return true;

  // Valid if it contains the bucket name (but not as part of file://)
  if (trimmed.includes(bucketName)) return true;

  // Valid if it looks like a storage path (user_id/report_id/filename format)
  // Pattern: at least two path segments separated by slashes
  if (/^[^/]+\/[^/]+/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Get a signed URL for a private storage file
 * @param bucketName - The name of the storage bucket
 * @param filePath - The path to the file in the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @returns Signed URL or null if error
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Validate that this is a storage path before attempting to create signed URL
  if (!isStoragePath(filePath, bucketName)) {
    return null;
  }

  try {
    // Extract clean file path (remove bucket name, query params, etc.)
    let cleanPath = extractFilePath(filePath, bucketName);

    if (!cleanPath || cleanPath.trim() === "") {
      return null;
    }

    const { data, error } = await supabase!.storage
      .from(bucketName)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get signed URLs for multiple files
 * @param bucketName - The name of the storage bucket
 * @param filePaths - Array of file paths
 * @param expiresIn - Expiration time in seconds
 * @returns Object mapping file paths to signed URLs
 */
export async function getSignedUrls(
  bucketName: string,
  filePaths: string[],
  expiresIn: number = 3600
): Promise<Record<string, string | null>> {
  const urls: Record<string, string | null> = {};

  await Promise.all(
    filePaths.map(async (path) => {
      urls[path] = await getSignedUrl(bucketName, path, expiresIn);
    })
  );

  return urls;
}

/**
 * Extract file path from a Supabase Storage URL
 * Handles both public URLs and stored paths
 * @param urlOrPath - The URL or path from the database
 * @param bucketName - The bucket name
 * @returns The clean file path without bucket prefix
 */
export function extractFilePath(urlOrPath: string, bucketName: string): string {
  if (!urlOrPath || typeof urlOrPath !== "string") return urlOrPath || "";

  let path = urlOrPath.trim();

  // If it's a full Supabase Storage URL (https://.../storage/v1/object/public/bucket/path or signed URL)
  if (path.includes("/storage/v1/object/public/") || path.includes("/storage/v1/object/sign/")) {
    // Extract path after bucket name
    const bucketIndex = path.indexOf(`${bucketName}/`);
    if (bucketIndex !== -1) {
      path = path.substring(bucketIndex + bucketName.length + 1);
    } else {
      // Try regex pattern as fallback
      const match = path.match(new RegExp(`${bucketName}/([^?&#]+)`));
      if (match && match[1]) {
        path = match[1];
      }
    }
  } else if (path.includes(`${bucketName}/`)) {
    // If it contains bucket name in the path (not in URL)
    const parts = path.split(`${bucketName}/`);
    path = parts[parts.length - 1] || path;
  } else if (path.startsWith(`${bucketName}/`)) {
    // If it starts with bucket name and slash
    path = path.substring(bucketName.length + 1);
  }

  // Remove query parameters and hash if present
  path = path.split("?")[0].split("#")[0];

  // Remove leading/trailing slashes
  path = path.replace(/^\/+|\/+$/g, "");

  return path;
}

