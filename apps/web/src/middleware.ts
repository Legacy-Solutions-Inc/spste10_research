import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@repo/types";

// Helper function to get user profile (DRY principle)
async function getUserProfile(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // console.error("[middleware] Error fetching profile:", error);
    return null;
  }

  return profile;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // console.log("[middleware] === MIDDLEWARE START ===");
  // console.log("[middleware] Path:", req.nextUrl.pathname);
  // console.log("[middleware] Direct cookies check:", req.cookies.getAll().map(c => c.name).join(", ") || "NO COOKIES");

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = req.cookies.getAll();
          // console.log("[middleware] getAll() called - Reading cookies:", cookies.length);
          // console.log("[middleware] Cookie names:", cookies.map(c => c.name).join(", ") || "NONE");
          return cookies.map(({ name, value }) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          // console.log("[middleware] setAll() called - Setting cookies:", cookiesToSet.length);
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      } as any,
    }
  );

  // // Try to get session first
  // const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  // console.log("[middleware] Session check:", { 
  //   hasSession: !!session, 
  //   hasUser: !!session?.user,
  //   error: sessionError?.message 
  // });

  // Get authenticated user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  // console.log("[middleware] User check:", { 
  //   hasUser: !!user, 
  //   userId: user?.id,
  //   error: error?.message 
  // });

  // Only log non-session-missing errors
  // if (error && error.name !== "AuthSessionMissingError") {
  //   console.error("[middleware] Auth user error:", error);
  // }

  const pathname = req.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/forgot-password"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // // If user is not authenticated and trying to access protected route
  // if (!user && !isPublicRoute) {
  //   console.log("[middleware] Unauthenticated user trying to access:", pathname);
  //   return NextResponse.redirect(new URL("/", req.url));
  // }

  // If user is authenticated, handle routing based on role
  if (user) {
    // Get profile once for all authenticated route checks
    const profile = await getUserProfile(supabase, user.id);

    // If no profile exists, log out and redirect to home
    if (!profile) {
      // console.log("[middleware] User authenticated but no profile found:", user.id);
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/", req.url));
    }

    const userRole = profile.role;
    // console.log("[middleware] User role:", userRole, "Path:", pathname);

    // Block user role from accessing web app
    if (userRole === "user" && !isPublicRoute) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/?error=access_denied", req.url));
    }

    // Check responder approval status if user is a responder
    if (userRole === "responder" && !pathname.startsWith("/admin")) {
      const { data: responderProfile, error: responderError } = await supabase
        .from("responder_profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!responderError && responderProfile) {
        const accountStatus = (responderProfile as { account_status: string }).account_status;
        
        if (accountStatus === "pending" || accountStatus === "rejected") {
          // console.log("[middleware] Responder account not approved:", accountStatus);
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/", req.url));
        }
      }
    }

    // Redirect authenticated users away from auth pages
    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") {
      const destination = userRole === "admin" ? "/admin" : "/dashboard";
      // console.log("[middleware] Redirecting authenticated user to:", destination);
      return NextResponse.redirect(new URL(destination, req.url));
    }

    // Redirect authenticated users from home page
    if (pathname === "/") {
      const destination = userRole === "admin" ? "/admin" : "/dashboard";
      // console.log("[middleware] Redirecting from home to:", destination);
      return NextResponse.redirect(new URL(destination, req.url));
    }

    // Protect admin routes
    if (pathname.startsWith("/admin")) {
      if (userRole !== "admin") {
        // console.log("[middleware] Non-admin user blocked from admin route");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      // console.log("[middleware] Admin access granted to:", pathname);
    }

    // Protect dashboard routes - ensure non-admin users can't access admin
    if (pathname.startsWith("/dashboard") && userRole === "admin") {
      // console.log("[middleware] Redirecting admin to admin dashboard");
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return res;
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};