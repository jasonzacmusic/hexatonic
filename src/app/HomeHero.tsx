"use client";

/**
 * The home hero and the sound strip. Six one-tap buttons, each about two
 * seconds of a different six-note scale in G; the ring above shows the shape
 * of whichever one was tapped last and lights each note as it sounds.
 */

import Link from "next/link";
import { useState } from "react";
import { buildScale, prettyDegree } from "@/lib/theory/scales";
import { midi, notePretty, pc } from "@/lib/theory/note";
import ScaleRing from "@/components/ScaleRing";
import { PlayGlyph, litIndex, upToOctave, usePreviewRun } from "@/components/ScalePreview";

const KEY = "G";

/* The six sounds, in the order that shows the widest variety fastest. Names
   and characters come from the scale data, so they match every other page. */
const STRIP: { id: string; fam: string; mode: number }[] = [
  { id: "major", fam: "diatonic", mode: 0 },
  { id: "minor", fam: "diatonic", mode: 4 },
  { id: "blues", fam: "blues", mode: 0 },
  { id: "major-blues", fam: "blues-major", mode: 0 },
  { id: "whole", fam: "whole", mode: 0 },
  { id: "aug", fam: "aug", mode: 0 },
];

const SOUNDS = STRIP.map((s) => {
  const scale = buildScale(KEY, s.fam, s.mode);
  const mode = scale.family.modes?.[s.mode];
  return {
    ...s,
    scale,
    name: mode ? mode.name : scale.family.short,
    character: mode ? mode.character : scale.family.character,
    degrees: scale.degrees.map(prettyDegree).join(" "),
    midis: upToOctave(scale.notes.map(midi)),
  };
});

export default function HomeHero() {
  const { lit, pending, play, stop } = usePreviewRun();
  const [shown, setShown] = useState(SOUNDS[0].id);
  const cur = SOUNDS.find((s) => s.id === shown)!;
  const ringLit = litIndex(lit, cur.id, cur.scale.notes.length);

  const tap = (s: (typeof SOUNDS)[number]) => {
    if (lit?.id === s.id || pending === s.id) { stop(); return; }
    setShown(s.id);
    void play(s.id, s.midis, 0.27);
  };

  return (
    <>
      <section className="grid items-center gap-10 pb-10 pt-4 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:pb-14 lg:pt-12">
        <div>
          <h1 className="display hx-rise text-[15vw] sm:text-[76px] lg:text-[92px]">
            Six notes.<br />A world of sounds.
          </h1>
          <p className="pull hx-rise hx-d1 mt-7 max-w-[30ch]">
            Bright, dark, bluesy, floating, strange — each one built from just six notes.
          </p>
          <p className="lede hx-rise hx-d2 mt-5 max-w-[46ch]">
            A free practice app for six-note scales: pick a sound, pick a key, and play
            along with real notation and a real piano.
          </p>
          <div className="hx-rise hx-d3 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/practice" className="btn btn-primary px-7 py-3.5 text-[16px]">
              Start practising
            </Link>
            <Link href="/sounds" className="btn btn-ghost px-7 py-3.5 text-[16px]">
              Hear the sounds
            </Link>
          </div>
          <p className="micro hx-rise hx-d4 mt-5">Free · no account · works offline</p>
        </div>

        <div className="hx-rise hx-d2 hidden justify-center sm:flex lg:justify-end">
          <figure className="relative">
            <ScaleRing notes={cur.scale.notes} removed={cur.scale.removed}
                       activePc={ringLit === null ? null : pc(cur.scale.notes[ringLit])}
                       size={400} className="max-w-full" />
            <figcaption className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-serif text-[22px] italic leading-none text-cream/80">{cur.character}</span>
              <span className="mt-2 font-mono text-[13px] uppercase tracking-[0.08em] text-muted">
                {cur.name}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ── the sound strip ─────────────────────────────────────────────── */}
      <section aria-labelledby="strip-title" className="pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="strip-title" className="eyebrow">Tap to hear · all in G</h2>
          <Link href="/sounds" className="link-gold">Every sound →</Link>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-6">
          {SOUNDS.map((s) => {
            const on = lit?.id === s.id || pending === s.id;
            const idx = litIndex(lit, s.id, s.scale.notes.length);
            return (
              <li key={s.id} className="max-w-none">
                <button type="button" onClick={() => tap(s)} aria-pressed={on}
                        aria-label={`${on ? "Stop" : "Play"} ${s.name} in G`}
                        className={`sound-tile group h-full w-full text-left ${on ? "is-on" : ""}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[18px] italic leading-none text-cream/70">
                      {s.character}
                    </span>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                      on ? "border-gold bg-gold text-[#17130a]" : "border-line-control/70 text-cream/80"}`}>
                      <PlayGlyph playing={on} size={11} />
                    </span>
                  </span>
                  <span className="mt-3 block text-[17px] font-bold leading-tight tracking-[-0.01em] text-cream">
                    {s.name}
                  </span>
                  <span className="mt-2.5 grid grid-cols-6 gap-[3px]" aria-hidden="true">
                    {s.scale.notes.map((n, i) => (
                      <span key={i} className={`note-dot px-0 text-center ${idx === i ? "is-lit" : ""}`}>{notePretty(n)}</span>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
