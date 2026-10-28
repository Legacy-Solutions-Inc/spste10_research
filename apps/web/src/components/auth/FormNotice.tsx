import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "error" | "info" | "success";

const TONES: Record<Tone, { box: string; icon: string; Icon: LucideIcon }> = {
  error: { box: "border-alert/25 bg-alert-soft", icon: "text-alert", Icon: AlertCircle },
  info: { box: "border-primary/15 bg-accent", icon: "text-primary", Icon: Info },
  success: { box: "border-resolved/25 bg-resolved-soft", icon: "text-resolved", Icon: CheckCircle2 },
};

/**
 * Inline message above or below a form. Errors are announced immediately
 * (role="alert"); info and success are announced politely (role="status").
 */
export function FormNotice({
  tone,
  title,
  children,
  className,
}: {
  tone: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-sm text-foreground", box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", icon)} aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "text-muted-foreground")}>{children}</div>}
      </div>
    </div>
  );
}
