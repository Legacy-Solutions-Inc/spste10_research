import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/**
 * Signed-out screens (sign in, request access, password reset).
 * Desktop: navy brand panel on the left, form on the right.
 * Below 1024px the panel is hidden and the logo sits above the form.
 */
export function AuthLayout({
  children,
  width = "default",
}: {
  children: ReactNode;
  /** "wide" fits two-column forms such as the access request. */
  width?: "default" | "wide";
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[440px] shrink-0 self-start flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex xl:w-[500px] xl:p-12">
        {/* Logo's own wordmark is navy when inverted, so the mark and a white wordmark are set here */}
        <div className="flex items-center gap-2.5">
          <LogoMark inverted />
          <span className="text-lg font-bold tracking-tight">AGAP</span>
        </div>

        <div className="max-w-sm">
          <p className="text-28 font-semibold">Emergency alerts, routed to your office.</p>
          <p className="mt-4 text-base leading-relaxed text-sidebar-muted">
            Residents report emergencies from their phones. AGAP delivers each alert and report to your office in real
            time, with its location on the map.
          </p>
        </div>

        <p className="max-w-sm text-13 text-sidebar-muted">
          Citizens use the AGAP mobile app. This dashboard is for response offices and administrators.
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-4 py-10 sm:px-8 lg:px-12">
        <div className={cn("mx-auto my-auto w-full", width === "wide" ? "max-w-[560px]" : "max-w-[400px]")}>
          <Logo className="mb-10 flex text-foreground lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
