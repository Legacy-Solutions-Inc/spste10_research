import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@repo/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [cookieName, cookieValue] = cookie.split('=').map(c => c.trim());
            if (cookieName === name) {
              return decodeURIComponent(cookieValue);
            }
          }
          return null;
        },
        set(name: string, value: string, options: any) {
          let cookie = `${name}=${encodeURIComponent(value)}`;
          cookie += `; path=${options?.path || '/'}`;
          if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
          if (options?.domain) cookie += `; domain=${options.domain}`;
          cookie += `; samesite=${options?.sameSite || 'lax'}`;
          if (window.location.protocol === 'https:' || options?.secure) {
            cookie += '; secure';
          }
          console.log('[Browser] Setting cookie:', name);
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; path=${options?.path || '/'}; max-age=0`;
        },
      },
    }
  );
}