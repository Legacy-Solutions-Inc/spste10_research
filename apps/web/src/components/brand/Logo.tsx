import { cn } from "@/lib/utils";

/** AGAP mark: a point with signal arcs, read as "an alert going out". */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? "#FFFFFF" : "#1E3A8A";
  const fg = inverted ? "#1E3A8A" : "#FFFFFF";
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("h-8 w-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill={bg} />
      <circle cx="16" cy="18" r="3.25" fill={fg} />
      <path d="M10.5 12.5a7.8 7.8 0 0 1 11 0" stroke={fg} strokeWidth="2.25" strokeLinecap="round" />
      <path d="M7 9a12.7 12.7 0 0 1 18 0" stroke={fg} strokeWidth="2.25" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function Logo({
  className,
  /** For dark (navy) backgrounds: white tile with a navy glyph, white wordmark */
  inverted = false,
  showWordmark = true,
}: {
  className?: string;
  inverted?: boolean;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark inverted={inverted} />
      {showWordmark && (
        <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-white" : "text-primary")}>AGAP</span>
      )}
    </span>
  );
}
