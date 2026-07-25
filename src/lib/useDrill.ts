"use client";

/**
 * The drill: one hook shared by /practice and /live so the two screens can never
 * drift apart. Owns scale + pattern + resolution + transport + URL state.
 *
 * Every configuration is a shareable link. Non-optional — these get pasted into
 * WhatsApp and YouTube descriptions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { midi, Note } from "./theory/note";
import { buildScale, familyById, KEYS } from "./theory/scales";
import { buildPattern, patternById, PatternId } from "./theory/patterns";
import { solveResolution, ResolveMode, gatiFor } from "./theory/resolution";
import { getAudio } from "./audio/engine";

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
  bpm: number;
  loop: boolean;
  click: boolean;
  transpose: number;   // octave shift for playback
}

export const DEFAULTS: DrillState = {
  key: "C", family: "diatonic", mode: 0, pattern: "aroha", cell: 4,
  octaves: 1, includeTop: false, sub: 4, grouping: 4, resolve: "full",
  bpm: 84, loop: true, click: true, transpose: 1,
};

const SHORT: Record<keyof DrillState, string> = {
  key: "k", family: "f", mode: "m", pattern: "p", cell: "c", octaves: "o",
  includeTop: "t", sub: "s", grouping: "g", resolve: "r", bpm: "b",
  loop: "l", click: "x", transpose: "v",
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
  (Object.keys(SHORT) as (keyof DrillState)[]).forEach((k) => {
    const raw = q.get(SHORT[k]);
    if (raw === null) return;
    const def = DEFAULTS[k];
    if (typeof def === "boolean") (out as any)[k] = raw === "1";
    else if (typeof def === "number") (out as any)[k] = Number(raw);
    else (out as any)[k] = raw;
  });
  if (!KEYS.includes(out.key)) out.key = DEFAULTS.key;
  return out;
}

export function useDrill(initial?: Partial<DrillState>) {
  const [state, setState] = useState<DrillState>({ ...DEFAULTS, ...initial });
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(-1);
  const [countdown, setCountdown] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const raf = useRef<number | null>(null);

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
    () => buildScale(state.key, state.family, state.mode),
    [state.key, state.family, state.mode]
  );

  const pattern = useMemo(() => {
    if (scale.error || !scale.notes.length) return [] as Note[];
    return buildPattern(state.pattern, scale.notes, state.octaves, state.cell, state.includeTop);
  }, [scale, state.pattern, state.octaves, state.cell, state.includeTop]);

  const resolution = useMemo(
    () => solveResolution(Math.max(pattern.length, 1), state.sub, 4, state.grouping, state.resolve),
    [pattern.length, state.sub, state.grouping, state.resolve]
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

  const stop = useCallback(() => {
    getAudio().stop(true);
    setPlaying(false);
    setIndex(-1);
    setCountdown(0);
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const play = useCallback(async () => {
    if (!notes.length) return;
    const a = getAudio();
    setAudioError(null);
    if (!a.ready) setLoadingAudio(true);
    try {
      await a.init();
    } catch (e: any) {
      setLoadingAudio(false);
      setAudioError(e?.message ?? "audio failed to load");
      return;
    }
    setLoadingAudio(false);
    setPlaying(true);
    await a.start({
      notes: notes.map((n) => midi(n) + 12 * state.transpose),
      stepDur, grouping: state.grouping, subdivision: state.sub,
      loop: state.loop, click: state.click,
      countInBeats: 4, beatDur: 60 / state.bpm,
      onStop: () => { setPlaying(false); setIndex(-1); },
    });
    const tick = () => {
      setIndex(a.currentIndex());
      setCountdown(a.countdown());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [notes, stepDur, state.grouping, state.sub, state.loop, state.click, state.bpm, state.transpose]);

  const toggle = useCallback(() => { playing ? stop() : play(); }, [playing, play, stop]);

  // stop when the configuration changes underneath us
  const sig = `${state.key}|${state.family}|${state.mode}|${state.pattern}|${state.cell}|${state.octaves}|${state.includeTop}|${state.sub}|${state.grouping}|${state.resolve}`;
  const lastSig = useRef(sig);
  useEffect(() => {
    if (lastSig.current !== sig) { lastSig.current = sig; if (playing) stop(); }
  }, [sig, playing, stop]);

  useEffect(() => () => { getAudio().stop(true); if (raf.current) cancelAnimationFrame(raf.current); }, []);

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
    state, set, setState, scale, pattern, notes, resolution, gati,
    stepDur, seconds, playing, index, countdown, toggle, play, stop,
    audioError, loadingAudio, shareUrl,
    family: familyById(state.family),
    patternDef: patternById(state.pattern),
  };
}
