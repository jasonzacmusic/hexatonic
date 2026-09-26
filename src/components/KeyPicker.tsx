"use client";

/**
 * KeyPicker: the twelve keys as one row of chips, in circle-of-fifths order
 * (C G D A E B F♯ D♭ A♭ E♭ B♭ F), so neighbouring chips are neighbouring
 * keys. One tap changes key.
 *
 *   <KeyPicker value={key} onChange={setKey} size="sm" | "md" />
 *
 * `value` and `onChange` use the app's ASCII key names ("F#", "Db"), the same
 * strings as KEYS in src/lib/theory/scales.ts.
 *
 * The selected key is CREAM, not gold. Gold means only "sounding now".
 *
 * Keyboard: it is a radio group. Tab lands on the selected key; the arrow
 * keys move round the circle of fifths (right/down = one sharp more, left/up =
 * one flat more) and wrap; Home and End jump to C and F. Selection follows
 * focus, as radio groups do, so the key changes as you arrow through.
 *
 * Layout: 12 across wherever there is room; on a phone it folds into two rows
 * of six (the sharp keys over the flat keys). It never scrolls sideways.
 */

import { useRef } from "react";
import { KEYS } from "@/lib/theory/scales";

export const prettyKey = (k: string) => k.replace(/#/g, "♯").replace(/b/g, "♭");

/** How many sharps (positive) or flats (negative) each major key signature has. */
const SIG: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, Db: -5, Ab: -4, Eb: -3, Bb: -2, F: -1,
};
const sigLabel = (k: string) => {
  const n = SIG[k];
  if (n === undefined || n === 0) return "no sharps or flats";
  const a = Math.abs(n);
  return `${a} ${n > 0 ? "sharp" : "flat"}${a === 1 ? "" : "s"}`;
};

export interface KeyPickerProps {
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
  /** Accessible name of the group. Default "Key". */
  label?: string;
  /** Hide the visible "Key" label (the group keeps its accessible name). */
  hideLabel?: boolean;
  className?: string;
}

export default function KeyPicker({
  value, onChange, size = "md", label = "Key", hideLabel = false, className = "",
}: KeyPickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = Math.max(0, KEYS.indexOf(value));

  const go = (i: number) => {
    const n = (i + KEYS.length) % KEYS.length;
    refs.current[n]?.focus();
    if (KEYS[n] !== value) onChange(KEYS[n]);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1,
      Home: 0, End: KEYS.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    go(map[e.key]);
  };

  const sm = size === "sm";
  return (
    <div className={`flex min-w-0 items-center gap-x-3 ${className}`} data-size={size}>
      {!hideLabel && (
        <span aria-hidden="true" className="micro-caps shrink-0">{label}</span>
      )}
      <div role="radiogroup" aria-label={label} onKeyDown={onKey}
           className={`grid min-w-0 flex-1 grid-cols-6 rounded-xl border border-line-control/70 bg-surface2 p-[3px] sm:flex sm:flex-none ${
             sm ? "gap-[2px]" : "gap-[3px]"}`}>
        {KEYS.map((k, i) => {
          const on = i === cur;
          return (
            <button
              key={k}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${prettyKey(k)} (${sigLabel(k)})`}
              title={`${prettyKey(k)} · ${sigLabel(k)}`}
              tabIndex={on ? 0 : -1}
              data-on={on}
              onClick={() => { if (!on) onChange(k); }}
              className={`rounded-lg font-mono tabular-nums leading-none transition-[background-color,color,transform] duration-150 active:scale-[0.95] ${
                sm ? "h-8 min-w-[33px] text-[14px] sm:px-1" : "h-9 min-w-[40px] text-[15px] sm:px-1.5"} ${
                on
                  ? "bg-cream font-semibold text-[#17130a] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(0,0,0,0.5)]"
                  : "text-cream/75 hover:bg-white/[0.06] hover:text-cream"}`}
            >
              {prettyKey(k)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
