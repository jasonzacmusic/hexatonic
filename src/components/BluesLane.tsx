"use client";

/**
 * The 12-bar blues: the form, lit bar by bar.
 *
 * This is the deliberate exception to the Improvise rule. Every other loop is
 * built only from the scale's own notes; here the chords sit outside the scale
 * on purpose, and the line below says so because the code checks it.
 *
 * Presentational only: the page owns the one running vamp, so switching to or
 * from the blues never stops the music (the playback rule).
 */

import { BluesBar, BLUES_RULE, chordsInsideScale } from "@/lib/theory/blues";
import { previewAudio } from "@/lib/audio/engine";
import { Seg, Toggle } from "./Panels";

const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯");

export default function BluesLane({
  bars, barIdx, nextIdx, scalePcs, scaleChoice, setScaleChoice, quickChange, setQuickChange,
}: {
  bars: BluesBar[];
  /** the bar sounding now, or -1 */
  barIdx: number;
  /** the next bar with a new chord, or -1 */
  nextIdx: number;
  scalePcs: number[];
  scaleChoice: "blues" | "blues-major";
  setScaleChoice: (v: "blues" | "blues-major") => void;
  quickChange: boolean;
  setQuickChange: (fn: (v: boolean) => boolean) => void;
}) {
  const inside = chordsInsideScale(scalePcs, bars);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2" role="list" aria-label="The 12 bars">
        {bars.map((b, i) => {
          const on = i === barIdx;
          const next = i === nextIdx;
          return (
            <button key={i} role="listitem"
              onClick={() => previewAudio([b.bass, ...b.voicing], 0.04)}
              aria-label={`Bar ${i + 1}: ${pretty(b.symbol)}, ${b.roman}`}
              className={`rounded-lg border px-2 py-2 text-left transition-colors duration-75 ${
                on ? "border-gold bg-gold text-[#17130a]"
                   : next ? "border-dashed border-cream/70 bg-surface2"
                   : "border-line bg-surface2 hover:border-cream/35"}`}>
              <span className="flex items-baseline justify-between gap-1">
                <span className="text-[17px] font-bold sm:text-lg">{pretty(b.symbol)}</span>
                <span className={`font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-muted"}`}>{i + 1}</span>
              </span>
              <span className={`block font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-cream/70"}`}>{b.roman}</span>
            </button>
          );
        })}
      </div>

      <p className="max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
        {BLUES_RULE}
        {inside.length > 0 && ` Here ${inside.map(pretty).join(" and ")} happen${inside.length === 1 ? "s" : ""} to fit.`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Seg value={scaleChoice} ariaLabel="Blues scale"
             options={[{ label: "Minor blues", value: "blues" as const },
                       { label: "Major blues", value: "blues-major" as const }]}
             onChange={setScaleChoice} />
        <Toggle on={quickChange} onClick={() => setQuickChange((v) => !v)}
                title="IV7 in bar 2">Quick change</Toggle>
      </div>
    </div>
  );
}
