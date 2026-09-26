"use client";

/**
 * The home hero and the sound player.
 *
 * Eight one-tap sounds, each about two seconds of a different six-note scale,
 * in whichever key is picked (G by default). The hexatonic shape beside them
 * glides to the shape of the sound tapped last and lights each note in gold
 * as it sounds. Everything shown comes from src/lib/theory/strip.ts, which
 * tests/sound-strip.test.ts checks in all twelve keys.
 *
 * Playback rule: changing the key never silences a sound that is playing. The
 * phrase carries on in the new key, from its first note.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { notePretty, pc } from "@/lib/theory/note";
import { stripSounds, StripSound } from "@/lib/theory/strip";
import ScaleRing from "@/components/ScaleRing";
import KeyPicker, { prettyKey } from "@/components/KeyPicker";
import { PlayGlyph, litIndex, usePreviewRun } from "@/components/ScalePreview";

const DEFAULT_KEY = "G";
const SPREAD = 0.27;

export default function HomeHero() {
  const [key, setKey] = useState(DEFAULT_KEY);
  const sounds = useMemo(() => stripSounds(key), [key]);
  const { lit, pending, play, stop } = usePreviewRun();
  const [shown, setShown] = useState(sounds[0].id);
  const cur = sounds.find((s) => s.id === shown) ?? sounds[0];
  const ringLit = litIndex(lit, cur.id, cur.scale.notes.length);
  const K = prettyKey(key);

  const sounding = lit?.id ?? pending;
  const tap = (s: StripSound) => {
    if (sounding === s.id) { stop(); return; }
    setShown(s.id);
    void play(s.id, s.midis, SPREAD);
  };
  const pickKey = (k: string) => {
    setKey(k);
    if (!sounding) return;
    const again = stripSounds(k).find((s) => s.id === sounding);
    if (again) void play(again.id, again.midis, SPREAD);
  };

  return (
    <>
      <section className="grid gap-5 pb-7 pt-1 sm:pb-9 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12 lg:pb-10 lg:pt-4">
        <h1 className="display hx-rise text-[13vw] sm:text-[64px] lg:text-[66px] xl:text-[80px]">
          Six notes.<br />A world of sounds.
        </h1>
        <div>
          <p className="pull hx-rise hx-d1 max-w-[34ch] text-[22px] sm:text-[24px]">
            Bright, dark, bluesy, floating, strange — each one built from just six notes.
          </p>
          <p className="lede hx-rise hx-d2 mt-3 max-w-[48ch] text-[16px] sm:text-[17px]">
            A free practice app for six-note scales: pick a sound, pick a key, and play
            along with real notation and a real piano.
          </p>
          <div className="hx-rise hx-d3 mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
            <Link href="/practice" className="btn btn-primary px-6 py-3 text-[16px]">
              Start practising
            </Link>
            <Link href="/sounds" className="btn btn-ghost px-6 py-3 text-[16px]">
              Hear the sounds
            </Link>
            <span className="micro ml-1">Free · no account · works offline</span>
          </div>
        </div>
      </section>

      {/* ── the sound player ────────────────────────────────────────────── */}
      <section aria-labelledby="strip-title" className="card hx-rise hx-d3 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="strip-title" className="eyebrow">
            Tap to hear · in <span className="text-cream">{K}</span>
          </h2>
          <KeyPicker value={key} onChange={pickKey} size="sm" className="w-full sm:w-auto" />
        </div>

        <div className="mt-4 grid items-center gap-4 md:grid-cols-[auto_1fr] md:gap-6 lg:gap-8">
          <figure className="flex flex-col items-center gap-2">
            <ScaleRing notes={cur.scale.notes} removed={cur.scale.removed}
                       activePc={ringLit === null ? null : pc(cur.scale.notes[ringLit])}
                       size={196} className="md:!w-[272px] lg:!w-[250px] xl:!w-[284px]">
              <span className="font-serif text-[21px] italic leading-none text-cream/85 xl:text-[24px]">
                {cur.character}
              </span>
              <span className="mt-1.5 max-w-[64%] font-mono text-[13px] leading-snug text-muted">
                {cur.name}
              </span>
            </ScaleRing>
            <figcaption>
              <Link href={cur.practice} className="link-gold">
                Practise it in {K} →
              </Link>
            </figcaption>
          </figure>

          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
            {sounds.map((s) => {
              const on = sounding === s.id;
              const idx = litIndex(lit, s.id, s.scale.notes.length);
              return (
                <li key={s.id} className="max-w-none">
                  <button type="button" onClick={() => tap(s)} aria-pressed={on}
                          aria-label={`${on ? "Stop" : "Play"} ${s.name} in ${K}`}
                          className={`sound-tile group flex h-full w-full flex-col px-3 py-3 text-left sm:p-3.5 ${
                            on ? "is-on" : shown === s.id ? "border-[#4A4240]" : ""}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-serif text-[18px] italic leading-none text-cream/70">
                        {s.character}
                      </span>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors duration-150 ${
                        on ? "border-gold bg-gold text-[#17130a]" : "border-line-control/70 text-cream/80"}`}>
                        <PlayGlyph playing={on} size={11} />
                      </span>
                    </span>
                    <span className="mt-2 block flex-1 text-[16px] font-bold leading-tight tracking-[-0.01em] text-cream sm:text-[17px]">
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
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-3.5">
          <p className="micro max-w-none">
            Same shape in every key; only the letters change. <span className="text-red">Red</span> marks the note taken out.
          </p>
          <Link href={key === DEFAULT_KEY ? "/sounds" : `/sounds?k=${encodeURIComponent(key)}`} className="link-gold">
            Every sound in {K} →
          </Link>
        </div>
      </section>
    </>
  );
}
