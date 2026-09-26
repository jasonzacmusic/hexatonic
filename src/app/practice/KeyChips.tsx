"use client";

/**
 * One tap to change key: all twelve keys as a row of chips, round the circle
 * of fifths (C G D A E B F♯ D♭ A♭ E♭ B♭ F), so the sharp keys sit on one side
 * and the flat keys on the other.
 *
 * A local stand-in with the same API as the shared <KeyPicker> being built in
 * src/components/KeyPicker.tsx; swap the import when that lands.
 *
 * It is a radio group: Tab lands on the selected key, the arrow keys (and Home
 * and End) move round the circle, and the selected key is filled cream. Gold is
 * never used here, because gold means "sounding now".
 */

import { useRef } from "react";
import { KEYS } from "@/lib/theory/scales";

export const prettyKey = (k: string) => k.replace("#", "♯").replace(/b$/, "♭");

/** One step round the circle of fifths: +1 is up a fifth (towards the sharps). */
export function stepKey(key: string, dir: 1 | -1): string {
  const i = KEYS.indexOf(key);
  if (i < 0) return KEYS[0];
  return KEYS[(i + dir + KEYS.length) % KEYS.length];
}

export default function KeyChips({
  value, onChange, size = "md", label = "Key",
}: {
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const sm = size === "sm";

  const move = (to: number) => {
    const k = KEYS[(to + KEYS.length) % KEYS.length];
    onChange(k);
    refs.current[KEYS.indexOf(k)]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const go = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (go !== undefined) { e.preventDefault(); move(i + go); return; }
    if (e.key === "Home") { e.preventDefault(); move(0); }
    if (e.key === "End") { e.preventDefault(); move(KEYS.length - 1); }
  };

  return (
    <div role="radiogroup" aria-label={label}
         /* six to a row on a phone (two tidy rows), all twelve in one line
            from 640px up */
         className="grid grid-cols-6 gap-1 sm:flex sm:flex-nowrap">
      {KEYS.map((k, i) => {
        const on = k === value;
        return (
          <button
            key={k} ref={(el) => { refs.current[i] = el; }}
            type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            onClick={() => onChange(k)} onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-lg border text-center font-semibold leading-none transition-colors duration-100
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream
                        ${sm ? "h-9 min-w-[36px] px-1.5 text-[15px]" : "h-11 min-w-[40px] px-2 text-[16px]"}
                        ${on ? "border-cream bg-cream text-bg"
                             : "border-line-control bg-surface2 text-cream/85 hover:border-[#4A4240] hover:text-cream"}`}
          >
            {prettyKey(k)}
          </button>
        );
      })}
    </div>
  );
}
