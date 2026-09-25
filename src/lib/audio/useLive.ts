"use client";

/**
 * THE PLAYBACK RULE, as hooks.
 *
 *   Changing any setting while playing must never stop the music. Tempo
 *   changes land on the next beat; everything else lands on the next bar or
 *   cycle. The sounding note and the beat count are always visible.
 *
 * A screen hands these hooks its CURRENT plan on every render. Before Play they
 * just remember it. While playing, a changed plan goes to the running scheduler
 * (engine.update / engine.updateVamp), which picks it up at the next boundary —
 * there is no stop, no restart and no gap. Starting, stopping and every
 * automatic ending still go through usePlayback, so the lifecycle guarantee in
 * session.ts is untouched.
 *
 * `position` is read from the audio clock on every animation frame and names
 * the plan that is actually SOUNDING, which may be the previous one for up to a
 * bar after a change. Screens compare `position.plan.notes` (or `.chords`) with
 * what they are showing before they light anything, so a highlight can never
 * point at a note that is not the one you hear.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrillPlan, DrillPosition, getAudio, VampPlan, VampPosition,
} from "./engine";
import { usePlayback } from "./usePlayback";

export interface LiveDrill {
  playing: boolean;
  loading: boolean;
  error: string | null;
  /** null before Play and during the count-in */
  position: DrillPosition | null;
  countdown: number;
  play: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
}

export function useLiveDrill(
  plan: DrillPlan | null,
  startWith: () => { countInBeats: number; beatDur: number },
): LiveDrill {
  const [position, setPosition] = useState<DrillPosition | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const shown = useRef("");
  const planRef = useRef(plan);
  planRef.current = plan;
  const startRef = useRef(startWith);
  startRef.current = startWith;

  const clear = useCallback(() => {
    shown.current = "";
    setPosition(null);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const pb = usePlayback("drill", clear);
  const { playing, isActive, end } = pb;

  const play = useCallback(async () => {
    const first = planRef.current;
    if (!first || !(first.chords ?? first.notes).length) return;
    setError(null);
    await pb.begin(async (guard) => {
      const a = getAudio();
      if (!a.ready) setLoading(true);
      try {
        await a.init();
      } catch (e: any) {
        setError(e?.message ?? "audio failed to load");
        return false;
      } finally {
        setLoading(false);
      }
      if (!guard()) return false;           // stopped while the samples loaded
      const plan = planRef.current ?? first;
      const ok = await a.start({
        ...plan, ...startRef.current(),
        onStop: () => { if (guard()) end(); },
      });
      if (!ok || !guard()) return false;
      // A setting changed while the engine was starting: hand it over now.
      if (planRef.current && planRef.current !== plan) a.update(planRef.current);
      const tick = () => {
        if (!guard()) return;               // a stale frame must not repaint
        const p = a.position();
        const key = p ? `${p.rev}|${p.segment.id}|${p.index}|${p.pending}` : "";
        if (key !== shown.current) { shown.current = key; setPosition(p); }
        setCountdown(a.countdown());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [pb.begin, end]);

  // A changed setting goes to the running scheduler. Never a stop.
  useEffect(() => {
    if (!plan || !playing || !isActive()) return;
    getAudio().update(plan);
  }, [plan, playing, isActive]);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const toggle = useCallback(
    () => { playing || loading ? end() : void play(); },
    [playing, loading, end, play],
  );

  return { playing, loading, error, position, countdown, play, stop: end, toggle };
}

export interface LiveVamp {
  playing: boolean;
  error: string | null;
  /** null before Play and during the count-in */
  position: VampPosition | null;
  countdown: number;
  play: () => Promise<void>;
  stop: () => void;
  toggle: () => void;
}

export function useLiveVamp(
  plan: VampPlan | null,
  startWith: () => { countInBeats: number },
): LiveVamp {
  const [position, setPosition] = useState<VampPosition | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const shown = useRef("");
  const planRef = useRef(plan);
  planRef.current = plan;
  const startRef = useRef(startWith);
  startRef.current = startWith;

  const clear = useCallback(() => {
    shown.current = "";
    setPosition(null);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const pb = usePlayback("vamp", clear);
  const { playing, isActive, end } = pb;

  const play = useCallback(async () => {
    const first = planRef.current;
    if (!first || !first.chords.length) return;
    setError(null);
    await pb.begin(async (guard) => {
      const a = getAudio();
      const ok = await a.startVamp({ ...first, ...startRef.current() });
      if (!ok) { setError("audio could not start"); return false; }
      if (!guard()) return false;
      if (planRef.current && planRef.current !== first) a.updateVamp(planRef.current);
      const tick = () => {
        if (!guard()) return;
        const p = a.vampPosition();
        const key = p ? `${p.rev}|${p.bar}|${p.beat}|${p.pending}` : "";
        if (key !== shown.current) { shown.current = key; setPosition(p); }
        setCountdown(a.vampCountdown());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [pb.begin]);

  useEffect(() => {
    if (!plan || !playing || !isActive()) return;
    getAudio().updateVamp(plan);
  }, [plan, playing, isActive]);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const toggle = useCallback(() => { playing ? end() : void play(); }, [playing, end, play]);

  return { playing, error, position, countdown, play, stop: end, toggle };
}
