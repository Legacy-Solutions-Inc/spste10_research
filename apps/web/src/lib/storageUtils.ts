import { createClient } from "@/lib/supabaseBrowser";

/**
 * Check if a URL or path is a Supabase Storage path
 * Handles both full URLs and simple paths
 */
export function isStoragePath(urlOrPath: string | null, bucketName: string): boolean {
  if (!urlOrPath) return false;
  
  // If it's a full HTTP/HTTPS URL that's not a storage URL, it's not a storage path
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    // Check if it's a Supabase storage URL
    return urlOrPath.includes("/storage/v1/") || urlOrPath.includes(bucketName);
  }
  
  // If it's not a full URL, assume it's a storage path
  // Paths are typically: {user_id}/{report_id}/{filename} or similar
  // We'll try to get a signed URL for it
  return true;
}

/**
 * Extract file path from a Supabase Storage URL or path
 * Handles both full URLs and simple paths
 */
export function extractFilePath(urlOrPath: string, bucketName: string): string {
  if (!urlOrPath || typeof urlOrPath !== "string") return urlOrPath || "";

  let path = urlOrPath.trim();

  // If it's a full HTTP/HTTPS URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // If it's a Supabase Storage URL
    if (path.includes("/storage/v1/object/public/") || path.includes("/storage/v1/object/sign/")) {
      const bucketIndex = path.indexOf(`${bucketName}/`);
      if (bucketIndex !== -1) {
        path = path.substring(bucketIndex + bucketName.length + 1);
      } else {
        const match = path.match(new RegExp(`${bucketName}/([^?&#]+)`));
        if (match && match[1]) {
          path = match[1];
        }
      }
    } else if (path.includes(`${bucketName}/`)) {
      // URL contains bucket name
      const parts = path.split(`${bucketName}/`);
      path = parts[parts.length - 1] || path;
    } else {
      // Not a storage URL, return as-is
      return path;
    }
  } else {
    // It's a simple path, might already be the file path
    // Remove bucket name if present
    if (path.includes(`${bucketName}/`)) {
      const parts = path.split(`${bucketName}/`);
      path = parts[parts.length - 1] || path;
    } else if (path.startsWith(`${bucketName}/`)) {
      path = path.substring(bucketName.length + 1);
    }
    // Otherwise, assume it's already the file path (e.g., "user_id/report_id/filename.jpg")
  }

  // Remove query parameters and hash
  path = path.split("?")[0].split("#")[0];
  path = path.replace(/^\/+|\/+$/g, "");

  return path;
}

/**
 * Get a signed URL for a file in Supabase Storage
 * @param bucketName - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient();
    
    // Clean the file path - remove any leading slashes
    const cleanPath = filePath.replace(/^\/+/, "");
    
    console.log(`[storageUtils] Getting signed URL for bucket: ${bucketName}, path: ${cleanPath}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(cleanPath, expiresIn);

    if (error) {
      console.error(`[storageUtils] Error creating signed URL for ${cleanPath}:`, error);
      // Try with the original path if clean path fails
      if (cleanPath !== filePath) {
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, expiresIn);
        
        if (retryError) {
          console.error(`[storageUtils] Retry also failed for ${filePath}:`, retryError);
          return null;
        }
        
        return retryData?.signedUrl || null;
      }
      return null;
    }

    console.log(`[storageUtils] Successfully got signed URL for ${cleanPath}`);
    return data?.signedUrl || null;
  } catch (err) {
    console.error(`[storageUtils] Exception getting signed URL for ${filePath}:`, err);
    return null;
  }
}
