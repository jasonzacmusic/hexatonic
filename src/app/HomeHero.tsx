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
import { useEffect, useMemo, useRef, useState } from "react";
import { useSharedScale } from "@/lib/sharedScale";
import { notePretty, pc } from "@/lib/theory/note";
import { stripSounds, StripSound } from "@/lib/theory/strip";
import SymmetryRing from "@/components/SymmetryRing";
import { PAIR_INK, RingLayout } from "@/components/ScaleRing";
import SixEquation from "@/components/SixEquation";
import { sixNoteScales } from "@/lib/theory/pairAtlas";
import KeyPicker, { prettyKey } from "@/components/KeyPicker";
import { PlayGlyph, litIndex, usePreviewRun } from "@/components/ScalePreview";

const DEFAULT_KEY = "G";
const SPREAD = 0.27;
/** How long the hero ring rests on each sound while nobody is playing. */
const CYCLE_MS = 3200;

export default function HomeHero() {
  const [key, setKey] = useState(DEFAULT_KEY);
  useSharedScale({ key }, (s) => setKey(s.key));
  const sounds = useMemo(() => stripSounds(key), [key]);
  const { lit, pending, play, stop } = usePreviewRun();
  const [shown, setShown] = useState(sounds[0].id);
  const cur = sounds.find((s) => s.id === shown) ?? sounds[0];
  const ringLit = litIndex(lit, cur.id, cur.scale.notes.length);
  const K = prettyKey(key);

  const sounding = lit?.id ?? pending;
  const [layout, setLayout] = useState<RingLayout>("chromatic");

  /* The pair that makes each sound, for the board marks: a major/minor pair
     where there is one. Blues and major blues have none, and show no marks. */
  const pairs = useMemo(() => {
    const all = sixNoteScales(key);
    const out: Record<string, (typeof all)[number]["pairs"][number] | null> = {};
    for (const s of sounds) {
      const six = all.find((x) => x.id === `${s.fam}-${s.mode}`);
      out[s.id] = six ? six.pairs.find((p) => p.plain) ?? six.pairs[0] ?? null : null;
    }
    return out;
  }, [key, sounds]);
  const pair = pairs[cur.id];
  const marks = pair ? { a: pair.shapes[0].notes.map(pc), b: pair.shapes[1].notes.map(pc) } : null;

  /* The hero ring glides through the eight sounds on its own until someone
     plays one, hovers it or asks for less motion. */
  const [held, setHeld] = useState(false);
  const [touched, setTouched] = useState(false);
  const order = useRef(sounds.map((s) => s.id));
  order.current = sounds.map((s) => s.id);
  useEffect(() => {
    if (touched || held || sounding) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setShown((id) => {
        const ids = order.current;
        return ids[(ids.indexOf(id) + 1) % ids.length];
      });
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [touched, held, sounding]);

  const tap = (s: StripSound) => {
    setTouched(true);
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
      <section className="grid items-center gap-6 pb-7 pt-1 sm:pb-9 lg:grid-cols-[1.25fr_1fr] lg:gap-10 lg:pb-10 lg:pt-4">
        <div>
          <h1 className="display hx-rise text-[13vw] sm:text-[64px] lg:text-[66px] xl:text-[80px]">
            Six notes.<br />A world of sounds.
          </h1>
          <p className="pull hx-rise hx-d1 mt-5 max-w-[34ch] text-[22px] sm:text-[24px]">
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

        {/* THE HERO RING: the shape of each sound, the note it leaves out (red,
            hollow) and the two triads that make it, circled and arrowed as on
            the class board. */}
        <figure className="hx-rise hx-d2 flex flex-col items-center"
                onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
                onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
          <SymmetryRing notes={cur.scale.notes} removed={cur.scale.removed} size={300}
                        activePc={ringLit === null ? null : pc(cur.scale.notes[ringLit])}
                        layout={layout} onLayout={(l) => { setLayout(l); setTouched(true); }} marks={marks}
                        ringClassName="sm:!w-[340px] xl:!w-[380px]">
            <span className="font-serif text-[24px] italic leading-none text-cream/90 xl:text-[28px]">
              {cur.character}
            </span>
            <span className="mt-1.5 max-w-[60%] font-mono text-[13px] leading-snug text-muted">
              {cur.name}
            </span>
          </SymmetryRing>
          <figcaption className="mt-1 flex min-h-[1.5em] flex-wrap items-baseline justify-center gap-x-2 text-center text-[15px]">
            {pair ? (
              <>
                <span className="font-bold" style={{ color: PAIR_INK.a }}>{pair.shapes[0].symbol}</span>
                <span className="text-muted">+</span>
                <span className="font-bold" style={{ color: PAIR_INK.b }}>{pair.shapes[1].symbol}</span>
                <span className="text-cream/70">make these six notes</span>
              </>
            ) : <span className="text-cream/70">No two triads make this one</span>}
          </figcaption>
        </figure>
      </section>

      {/* ── the sound player ────────────────────────────────────────────── */}
      <section aria-labelledby="strip-title" className="card hx-rise hx-d3 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="strip-title" className="eyebrow">
            Tap to hear · in <span className="text-cream">{K}</span>
          </h2>
          <KeyPicker value={key} onChange={pickKey} size="sm" className="w-full sm:w-auto" />
        </div>

        <div className="mt-4">
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:gap-2.5">
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
            The ring above shows the one you tapped. Same shape in every key; only the letters change.{" "}
            <span className="text-red">Red</span> marks the note taken out.
          </p>
          <span className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href={cur.practice} className="link-gold">Practise {cur.name} in {K} →</Link>
            <Link href={key === DEFAULT_KEY ? "/sounds" : `/sounds?k=${encodeURIComponent(key)}`} className="link-gold">
              Every sound in {K} →
            </Link>
          </span>
        </div>
      </section>

      <SixEquation keyName={key} />
    </>
  );
}
