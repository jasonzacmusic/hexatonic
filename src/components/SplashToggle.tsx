"use client";

/** The off switch for the wrong-note splash. Kept in this browser. */

import { useSplashSetting } from "@/lib/splash";

export default function SplashToggle({ className = "" }: { className?: string }) {
  const [on, set] = useSplashSetting();
  return (
    <button type="button" aria-pressed={on} onClick={() => set(!on)}
            title="A note outside the scale gets a splash of water; the removed note splashes red"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[13px] transition-colors duration-150 ${
              on ? "border-[#7CC6EA]/60 text-cream" : "border-line-control/70 text-muted hover:text-cream"} ${className}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke={on ? "#7CC6EA" : "currentColor"} strokeWidth="1.4" />
        <circle cx="7" cy="7" r="2.2" fill={on ? "#7CC6EA" : "none"} stroke={on ? "none" : "currentColor"} strokeWidth="1.2" />
      </svg>
      Wrong-note splash {on ? "on" : "off"}
    </button>
  );
}
