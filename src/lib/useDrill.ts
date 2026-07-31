"use client";

/**
 * The drill: one hook shared by /practice and /live so the two screens can never
 * drift apart. Owns scale + pattern + resolution + transport + URL state.
 *
 * Every configuration is a shareable link. Non-optional — these get pasted into
 * WhatsApp and YouTube descriptions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Note } from "./theory/note";
import { buildScale, familyById, FAMILIES, KEYS } from "./theory/scales";
import { buildPattern, patternById, PATTERNS, PatternId } from "./theory/patterns";
import { solveResolution, ResolveMode, gatiFor } from "./theory/resolution";
import { meterById, METERS, allTalaMeters } from "./theory/meters";
import { decodeCustom } from "./theory/custom";
import { getAudio } from "./audio/engine";
import { usePlayback } from "./audio/usePlayback";

export interface DrillState {
  key: string;
  family: string;
  mode: number;
  pattern: PatternId;
  cell: number;
  octaves: number;
  includeTop: boolean;
  sub: number;
  grouping: number;
  resolve: ResolveMode;
  meter: string;
  countIn: boolean;
  custom: string;
  bpm: number;
  loop: boolean;
  click: boolean;
}

export const DEFAULTS: DrillState = {
  key: "C", family: "diatonic", mode: 4, pattern: "both", cell: 4,
  octaves: 1, includeTop: false, sub: 4, grouping: 4, resolve: "full", meter: "4-4",
  bpm: 84, loop: true, click: true, countIn: true, custom: "",
};

const SHORT: Record<keyof DrillState, string> = {
  key: "k", family: "f", mode: "m", pattern: "p", cell: "c", octaves: "o",
  includeTop: "t", sub: "s", grouping: "g", resolve: "r", meter: "mt", bpm: "b",
  loop: "l", click: "x", countIn: "ci", custom: "cs",
};

export function encodeState(s: DrillState): string {
  const q = new URLSearchParams();
  (Object.keys(SHORT) as (keyof DrillState)[]).forEach((k) => {
    const v = s[k];
    if (v === DEFAULTS[k]) return;
    q.set(SHORT[k], typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  });
  return q.toString();
}

export function decodeState(qs: string): DrillState {
  const q = new URLSearchParams(qs);
  const out: DrillState = { ...DEFAULTS };

  const oneOf = <T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T =>
    raw !== null && allowed.includes(raw as T) ? raw as T : fallback;
  const integer = (
    raw: string | null, allowed: readonly number[] | { min: number; max: number }, fallback: number
  ): number => {
    if (raw === null || raw.trim() === "") return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) return fallback;
    if (Array.isArray(allowed)) return allowed.includes(value) ? value : fallback;
    const range = allowed as { min: number; max: number };
    return value >= range.min && value <= range.max ? value : fallback;
  };
  const bool = (raw: string | null, fallback: boolean): boolean =>
    raw === "1" ? true : raw === "0" ? false : fallback;

  out.key = oneOf(q.get(SHORT.key), KEYS, DEFAULTS.key);
  out.family = oneOf(q.get(SHORT.family), FAMILIES.map((f) => f.id), DEFAULTS.family);
  out.pattern = oneOf(
    q.get(SHORT.pattern), PATTERNS.map((p) => p.id), DEFAULTS.pattern
  );
  out.mode = integer(q.get(SHORT.mode), { min: 0, max: 5 }, DEFAULTS.mode);
  if (familyById(out.family).kind !== "rotation") out.mode = 0;
  out.cell = integer(q.get(SHORT.cell), [3, 4, 5, 6], DEFAULTS.cell);
  out.octaves = integer(q.get(SHORT.octaves), [1, 2, 3], DEFAULTS.octaves);
  out.includeTop = bool(q.get(SHORT.includeTop), DEFAULTS.includeTop);
  out.sub = integer(q.get(SHORT.sub), [2, 3, 4, 6], DEFAULTS.sub);
  out.grouping = integer(q.get(SHORT.grouping), [3, 4, 5, 6, 7, 9], DEFAULTS.grouping);
  out.resolve = oneOf(q.get(SHORT.resolve), ["accent", "full"] as const, DEFAULTS.resolve);
  out.meter = oneOf(
    q.get(SHORT.meter),
    [...METERS, ...allTalaMeters()].map((m) => m.id),
    DEFAULTS.meter
  );
  out.bpm = integer(q.get(SHORT.bpm), { min: 40, max: 200 }, DEFAULTS.bpm);
  out.loop = bool(q.get(SHORT.loop), DEFAULTS.loop);
  out.click = bool(q.get(SHORT.click), DEFAULTS.click);
  out.countIn = bool(q.get(SHORT.countIn), DEFAULTS.countIn);
  const cs = q.get(SHORT.custom);
  out.custom = cs && /^[0-9a-z]{1,3}$/.test(cs) ? cs : DEFAULTS.custom;
  return out;
}

export function useDrill(initial?: Partial<DrillState>) {
  const [state, setState] = useState<DrillState>({ ...DEFAULTS, ...initial });
  const [index, setIndex] = useState(-1);
  const [countdown, setCountdown] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioReady, setAudioReady] = useState(() => getAudio().ready);
  const raf = useRef<number | null>(null);
  const operation = useRef(0);

  // hydrate from the URL once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = window.location.search.slice(1);
    if (qs) setState((s) => ({ ...s, ...decodeState(qs) }));
  }, []);

  // keep the URL in step without adding history entries
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = encodeState(state);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [state]);

  const set = useCallback(<K extends keyof DrillState>(k: K, v: DrillState[K]) => {
    setState((s) => ({ ...s, [k]: v }));
  }, []);

  const scale = useMemo(
    () => buildScale(state.key, state.family, state.mode,
                     state.custom ? decodeCustom(state.custom) : undefined),
    [state.key, state.family, state.mode, state.custom]
  );

  const pattern = useMemo(() => {
    if (scale.error || !scale.notes.length) return [] as Note[];
    return buildPattern(state.pattern, scale.notes, state.octaves, state.cell, state.includeTop);
  }, [scale, state.pattern, state.octaves, state.cell, state.includeTop]);

  const meter = useMemo(() => meterById(state.meter), [state.meter]);
  const resolution = useMemo(
    () => solveResolution(Math.max(pattern.length, 1), state.sub, meter.top,
                          state.grouping, state.resolve),
    [pattern.length, state.sub, meter.top, state.grouping, state.resolve]
  );

  const notes = useMemo(() => {
    if (!pattern.length) return [] as Note[];
    const out: Note[] = [];
    for (let i = 0; i < resolution.totalNotes; i++) out.push(pattern[i % pattern.length]);
    return out;
  }, [pattern, resolution.totalNotes]);

  const gati = gatiFor(state.grouping);
  const stepDur = 60 / state.bpm / state.sub;
  const seconds = resolution.totalNotes * stepDur;

  /* Playback lifecycle. usePlayback owns the stopping: unmount, route change,
     tab hide, page unload and any other surface claiming audio all end this run
     without the screen having to remember. See src/lib/audio/session.ts. */
  const clearVisuals = useCallback(() => {
    setIndex(-1);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const pb = usePlayback("drill", clearVisuals);
  const playing = pb.playing;

  const stop = useCallback(() => { pb.end(); }, [pb]);

  const play = useCallback(async () => {
    if (!notes.length) return;
    setAudioError(null);
    await pb.begin(async (guard) => {
      const a = getAudio();
      if (!a.ready) setLoadingAudio(true);
      try {
        await a.init();
      } catch (e: any) {
        setAudioError(e?.message ?? "audio failed to load");
        return false;
      } finally {
        setLoadingAudio(false);
      }
      if (!guard()) return false;           // stopped while the samples loaded
      const ok = await a.start({
        notes,
        stepDur, grouping: state.grouping, subdivision: state.sub,
        beatsPerBar: meter.top,
        loop: state.loop, click: state.click,
        countInBeats: state.countIn ? meter.top : 0, beatDur: 60 / state.bpm,
        onStop: () => { if (guard()) pb.end(); },
      });
      if (!ok || !guard()) return false;
      const tick = () => {
        if (!guard()) return;               // a stale frame must not repaint
        setIndex(a.currentIndex());
        setCountdown(a.countdown());
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [notes, stepDur, state.grouping, state.sub, state.loop, state.click,
      state.countIn, state.bpm, meter.top, pb]);


  const toggle = useCallback(
    () => { playing || loadingAudio ? stop() : void play(); },
    [playing, loadingAudio, stop, play]
  );

  // stop when the configuration changes underneath us
  const sig = `${state.key}|${state.family}|${state.mode}|${state.pattern}|${state.cell}|${state.octaves}|${state.includeTop}|${state.sub}|${state.grouping}|${state.resolve}|${state.meter}|${state.custom}|${state.bpm}|${state.loop}|${state.click}`;
  const lastSig = useRef(sig);
  useEffect(() => {
    if (lastSig.current !== sig) {
      lastSig.current = sig;
      if (playing || loadingAudio) stop();
    }
  }, [sig, playing, loadingAudio, stop]);

  useEffect(() => () => {
    operation.current++;
    getAudio().stop(true);
    if (raf.current) cancelAnimationFrame(raf.current);
  }, []);

  // the AudioContext suspend trap
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") getAudio().resume(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const qs = encodeState(state);
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }, [state]);

  return {
    state, set, setState, scale, pattern, notes, resolution, gati, meter,
    stepDur, seconds, playing, index, countdown, toggle, play, stop,
    audioError, loadingAudio, audioReady, shareUrl,
    family: familyById(state.family),
    patternDef: patternById(state.pattern),
  };
}
