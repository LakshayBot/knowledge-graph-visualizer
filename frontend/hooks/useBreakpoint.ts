"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

function getBreakpoint(w: number): Breakpoint {
  if (w < 640)  return "mobile";
  if (w < 1024) return "tablet";
  if (w < 1600) return "desktop";
  return "wide";
}

/**
 * Returns the current breakpoint.
 * Returns "desktop" on the server / before hydration so SSR output is stable.
 * After mount, updates to the real viewport width and tracks resizes.
 */
export function useBreakpoint(): Breakpoint {
  // Always start with "desktop" — matches what the server renders.
  const [bp, setBp] = useState<Breakpoint>("desktop");
  // Track whether we've hydrated so we can flip to real width.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const update = () => setBp(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // While not yet hydrated, return "desktop" to match SSR.
  return hydrated ? bp : "desktop";
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === "mobile";
}

export function useIsNarrow(): boolean {
  const bp = useBreakpoint();
  return bp === "mobile" || bp === "tablet";
}
