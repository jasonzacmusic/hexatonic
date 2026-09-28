"use client";

/**
 * One splash, drawn inside an SVG: two ripples and a ring of droplets thrown
 * outward, over in about 0.6 s. Water blue for a note outside the scale, red
 * for the removed note. With reduced motion only the soft flash is left.
 */

import type { CSSProperties } from "react";
import { SPLASH_INK, SplashKind } from "@/lib/splash";

const DROPS = [-150, -110, -70, -30, 10, 50, 130, 170];

export default function SplashMark({ x, y, r, kind }: { x: number; y: number; r: number; kind: SplashKind }) {
  const ink = SPLASH_INK[kind];
  return (
    <g pointerEvents="none" aria-hidden="true">
      <circle cx={x} cy={y} r={r * 0.95} fill={ink} className="hx-splash-flash" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={ink} strokeWidth={Math.max(1.5, r * 0.14)} className="hx-ripple" />
      <circle cx={x} cy={y} r={r * 0.7} fill="none" stroke={ink} strokeWidth={Math.max(1, r * 0.09)} className="hx-ripple hx-ripple-2" />
      {DROPS.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const d = r * (1.35 + (i % 3) * 0.28);
        const style = { "--dx": `${Math.cos(rad) * d}px`, "--dy": `${Math.sin(rad) * d}px` } as CSSProperties;
        return <circle key={i} cx={x} cy={y} r={Math.max(1.2, r * (i % 2 ? 0.1 : 0.14))} fill={ink} className="hx-drop" style={style} />;
      })}
    </g>
  );
}
