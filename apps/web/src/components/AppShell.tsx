"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";

/** Signed-in layout: navy rail on the left, page content on the right. */
export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className={cn("min-w-0 flex-1 overflow-y-auto", className)}>{children}</main>
    </div>
  );
}

/** Standard header for content pages (History, Settings, Admin). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-28 font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
