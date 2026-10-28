import { useEffect, useState } from "react";

/** Current time in ms, re-rendering every `intervalMs` while `active` */
export function useNow(intervalMs: number, active = true) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, active]);

  return now;
}
