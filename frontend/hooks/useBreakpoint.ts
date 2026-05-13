"use client";

import { useState, useEffect } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

function getBreakpoint(w: number): Breakpoint {
  if (w < 640)  return "mobile";
  if (w < 1024) return "tablet";
  if (w < 1600) return "desktop";
  return "wide";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("desktop");

  useEffect(() => {
    const update = () => setBp(getBreakpoint(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === "mobile";
}

export function useIsNarrow(): boolean {
  const bp = useBreakpoint();
  return bp === "mobile" || bp === "tablet";
}
