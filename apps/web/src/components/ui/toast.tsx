"use client";

import * as React from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error";
  onDismiss?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, variant = "default", onDismiss, ...props }, ref) => {
    const variantStyles = {
      default: "bg-background border-border",
      success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
      error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    };

    const IconComponent = (variant === "success" ? CheckCircle2 : variant === "error" ? XCircle : null) as any;
    const CloseIcon = X as any;

    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
          variantStyles[variant],
          "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
        )}
        {...props}
      >
        <div className="grid gap-1">
          {IconComponent && <IconComponent className="h-4 w-4" />}
          {title && (
            <div className="text-sm font-semibold">{title}</div>
          )}
          <div className="text-sm opacity-90">{description}</div>
        </div>
        {onDismiss && (
          <button
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
            onClick={onDismiss}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

export { Toast };
