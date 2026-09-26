"use client";

/**
 * Short, one-tap scale previews that light each note as it sounds.
 *
 * A preview is a two-second phrase, not a player: it never loops, so it does
 * not need the live scheduler. It does still obey the session: starting one
 * cuts whatever preview was already sounding, and leaving the page or hiding
 * the tab stops it (installGlobalStops).
 *
 * The light follows the audio clock's start time as closely as the browser
 * lets us: previewAudio resolves once the notes are scheduled 20ms ahead, and
 * a requestAnimationFrame loop works out which note is sounding from there.
 * Nothing here schedules sound from a timer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { previewAudio } from "@/lib/audio/engine";
import { getSession, installGlobalStops } from "@/lib/audio/session";

export interface Lit {
  /** which preview is sounding */
  id: string;
  /** index into the midis that were played */
  step: number;
}

export function usePreviewRun() {
  const [lit, setLit] = useState<Lit | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const run = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    installGlobalStops();
    return () => { run.current++; cancelAnimationFrame(raf.current); };
  }, []);

  const stop = useCallback(() => {
    run.current++;
    cancelAnimationFrame(raf.current);
    getSession().stopAll("preview stopped");
    setLit(null);
    setPending(null);
  }, []);

  const play = useCallback(async (id: string, midis: number[], spread = 0.26) => {
    const mine = ++run.current;
    cancelAnimationFrame(raf.current);
    // cut the previous phrase so two scales never blur into each other
    getSession().stopAll("new preview");
    setLit(null);
    setPending(id);
    const ok = await previewAudio(midis, spread, 0.72);
    if (mine !== run.current) return;
    if (!ok) { setPending(null); return; }
    /* `pending` stays set until the first note lights, so there is never a
       frame where the phrase is scheduled but the screen says nothing is
       playing (a key change in that gap used to drop the phrase). */
    const t0 = performance.now() + 20;
    let last = -2;
    const tick = () => {
      if (mine !== run.current) return;
      const k = Math.floor((performance.now() - t0) / (spread * 1000));
      if (k >= midis.length) { setLit(null); setPending(null); return; }
      if (k !== last && k >= 0) { last = k; setPending(null); setLit({ id, step: k }); }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  return { lit, pending, play, stop };
}

/** Up the scale and land on the octave: the phrase every preview plays. */
export const upToOctave = (midis: number[]) => [...midis, midis[0] + 12];

/** Which note of an n-note scale is lit, given the step of an up-to-octave run. */
export const litIndex = (lit: Lit | null, id: string, n: number): number | null =>
  lit && lit.id === id ? lit.step % n : null;

/** A small play/stop glyph. */
export function PlayGlyph({ playing, size = 14 }: { playing: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      {playing
        ? <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
        : <path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1l-7-4.4a.6.6 0 0 0-.9.5z" fill="currentColor" />}
    </svg>
  );
}
