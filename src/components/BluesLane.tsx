"use client";

/**
 * The 12-bar blues bed: the form, lit bar by bar.
 *
 * This is the deliberate exception to the Improvise rule. Every other bed is
 * built only from the scale's own notes; here the chords sit outside the scale
 * on purpose, and the line below says so because the code checks it.
 *
 * Presentational only: the page owns the one running vamp, so switching to or
 * from the blues never stops the music (the playback rule).
 */

import { BluesBar, bluesScales, chordsInsideScale } from "@/lib/theory/blues";
import { previewAudio } from "@/lib/audio/engine";
import { Seg, Toggle } from "./Panels";

const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯");

export default function BluesLane({
  keyName, bars, barIdx, nextIdx, scalePcs, scaleChoice, setScaleChoice, quickChange, setQuickChange,
}: {
  keyName: string;
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
  const distinct = [...new Set(bars.map((b) => b.symbol))];
  const advice = bluesScales(keyName).map((a) => ({ name: pretty(a.name), notes: pretty(a.notes) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {bars.map((b, i) => {
          const on = i === barIdx;
          const next = i === nextIdx;
          return (
            <button key={i}
              onClick={() => previewAudio([b.bass, ...b.voicing], 0.04)}
              className={`rounded-xl border px-2 py-3 text-center transition-colors duration-75 ${
                on ? "border-gold bg-gold text-[#17130a]"
                   : next ? "border-dashed border-cream/70 bg-surface2"
                   : "border-line bg-surface2 hover:border-cream/35"}`}>
              <span className="block text-lg font-bold sm:text-xl">{pretty(b.symbol)}</span>
              <span className={`block font-mono text-[13px] ${on ? "text-[#2A2208]" : "text-muted"}`}>
                {b.roman} · {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      <p className="max-w-[68ch] text-[15px] leading-relaxed text-cream/80">
        {inside.length === 0
          ? `None of the ${distinct.length === 3 ? "three" : distinct.length} chords fits inside the scale; that friction is the blues.`
          : `${inside.map(pretty).join(" and ")} ${inside.length === 1 ? "fits" : "fit"} inside the scale; the rest do not.`}
        {" "}Land the ♭3 against the I7&rsquo;s major 3rd and you hear the whole style in one note.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <div className="field">
          <label>Scale on the keys</label>
          <Seg value={scaleChoice} ariaLabel="Blues scale"
               options={[{ label: "Minor blues", value: "blues" as const },
                         { label: "Major blues", value: "blues-major" as const }]}
               onChange={setScaleChoice} />
        </div>
        <Toggle on={quickChange} onClick={() => setQuickChange((v) => !v)}
                title="IV7 in bar 2">Quick change</Toggle>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {advice.map((a) => (
          <div key={a.name} className="well rounded-lg px-3 py-2">
            <p className="text-[15px] font-semibold">{a.name}</p>
            <p className="text-[14px] text-cream/75">{a.notes}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
