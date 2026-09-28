"use client";

/**
 * One screen of stage mode (?stage=1): the content is centred in the
 * 1920×1080 frame and, if it is taller than the frame, scaled down to fit, so
 * a filmed page never scrolls. On a phone stage mode is normal size and the
 * content simply flows (see `.stage-screen` in globals.css).
 *
 * `useStageNav` gives the arrow keys (and a presenter clicker's Page Up /
 * Page Down) to the page: previous and next.
 */

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function StageFit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; h: number | null }>({ scale: 1, h: null });

  useIsoLayout(() => {
    const measure = () => {
      const o = outer.current, i = inner.current;
      if (!o || !i) return;
      const avail = o.clientHeight;
      const h = i.offsetHeight;
      const scale = avail > 0 && h > avail ? avail / h : 1;
      setFit((f) => (Math.abs(f.scale - scale) < 0.002 && f.h === h ? f : { scale, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className={`stage-screen ${className}`}>
      <div style={fit.scale < 1 && fit.h ? { height: fit.h * fit.scale } : undefined}>
        <div ref={inner} style={fit.scale < 1 ? { transform: `scale(${fit.scale})`, transformOrigin: "top center" } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Arrow keys and Page Up/Down step back and forth, unless a control has focus. */
export function useStageNav(on: boolean, prev: () => void, next: () => void) {
  const ref = useRef({ prev, next });
  ref.current = { prev, next };
  useEffect(() => {
    if (!on) return;
    const h = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, select, textarea, [role=radiogroup], [role=tablist], [role=slider]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); ref.current.next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ref.current.prev(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [on]);
}
