"use client";

/**
 * The drill: one hook shared by /practice and /live so the two screens can never
 * drift apart. Owns scale + pattern + resolution + transport + URL state, and
 * the tonic drone.
 *
 * Every configuration is a shareable link. Non-optional — these get pasted into
 * messages and video descriptions, so old links must keep opening on the drill
 * they were made for (see LEGACY below).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Note, midi, pc } from "./theory/note";
import { buildScale, familyById, FAMILIES, KEYS } from "./theory/scales";
import { buildPattern, patternById, PatternId, resolvePatternId } from "./theory/patterns";
import { solveResolution, ResolveMode, gatiFor } from "./theory/resolution";
import { meterById, METERS, allTalaMeters } from "./theory/meters";
import { decodeCustom } from "./theory/custom";
import { DrillPlan, getAudio } from "./audio/engine";
import { useLiveDrill } from "./audio/useLive";

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
  swing: boolean;
  /** a soft tonic drone under the drill, so each mode's colour is audible */
  drone: boolean;
}

/** The app opens on the major hexatonic (no 4) in G. */
export const DEFAULTS: DrillState = {
  key: "G", family: "diatonic", mode: 0, pattern: "both", cell: 4,
  octaves: 1, includeTop: false, sub: 4, grouping: 4, resolve: "full", meter: "4-4",
  bpm: 84, loop: true, click: true, countIn: true, custom: "", swing: false, drone: true,
};

/** Links made before September 2026 left out the key and mode when they were
 *  the old defaults (C, the minor hexatonic). A link without the version mark
 *  is read against those, so it still opens on the drill it was made for. */
export const LEGACY: Pick<DrillState, "key" | "mode"> = { key: "C", mode: 4 };
const VERSION = "2";

const SHORT: Record<keyof DrillState, string> = {
  key: "k", family: "f", mode: "m", pattern: "p", cell: "c", octaves: "o",
  includeTop: "t", sub: "s", grouping: "g", resolve: "r", meter: "mt", bpm: "b",
  loop: "l", click: "x", countIn: "ci", custom: "cs", swing: "sw", drone: "dr",
};

export function encodeState(s: DrillState): string {
  const q = new URLSearchParams();
  (Object.keys(SHORT) as (keyof DrillState)[]).forEach((k) => {
    const v = s[k];
    if (v === DEFAULTS[k]) return;
    q.set(SHORT[k], typeof v === "boolean" ? (v ? "1" : "0") : String(v));
  });
  if ([...q.keys()].length) q.set("v", VERSION);
  return q.toString();
}

export function decodeState(qs: string): DrillState {
  const q = new URLSearchParams(qs);
  const legacy = [...q.keys()].length > 0 && q.get("v") === null;
  const base: DrillState = legacy ? { ...DEFAULTS, ...LEGACY } : { ...DEFAULTS };
  const out: DrillState = { ...base };

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

  out.key = oneOf(q.get(SHORT.key), KEYS, base.key);
  out.family = oneOf(q.get(SHORT.family), FAMILIES.map((f) => f.id), base.family);
  out.pattern = resolvePatternId(q.get(SHORT.pattern)) ?? base.pattern;
  out.mode = integer(q.get(SHORT.mode), { min: 0, max: 5 }, base.mode);
  if (familyById(out.family).kind !== "rotation") out.mode = 0;
  out.cell = integer(q.get(SHORT.cell), [3, 4, 5, 6], base.cell);
  out.octaves = integer(q.get(SHORT.octaves), [1, 2, 3], base.octaves);
  out.includeTop = bool(q.get(SHORT.includeTop), base.includeTop);
  out.sub = integer(q.get(SHORT.sub), [2, 3, 4, 6], base.sub);
  out.grouping = integer(q.get(SHORT.grouping), [3, 4, 5, 6, 7, 9], base.grouping);
  out.resolve = oneOf(q.get(SHORT.resolve), ["accent", "full"] as const, base.resolve);
  out.meter = oneOf(
    q.get(SHORT.meter),
    [...METERS, ...allTalaMeters()].map((m) => m.id),
    base.meter
  );
  out.bpm = integer(q.get(SHORT.bpm), { min: 40, max: 200 }, base.bpm);
  out.loop = bool(q.get(SHORT.loop), base.loop);
  out.click = bool(q.get(SHORT.click), base.click);
  out.countIn = bool(q.get(SHORT.countIn), base.countIn);
  out.swing = bool(q.get(SHORT.swing), base.swing);
  out.drone = bool(q.get(SHORT.drone), base.drone);
  const cs = q.get(SHORT.custom);
  out.custom = cs && /^[0-9a-z]{1,3}$/.test(cs) ? cs : base.custom;
  return out;
}

/** Beats left until the cycle lands on the one of the next pass. */
export function beatsToTheOne(bar: number, bars: number, beat: number, beats: number): number {
  return (bars - bar) * beats + (beats - beat) + 1;
}

/* ── the tonic drone ─────────────────────────────────────────────────────
   A soft sustained tonic in two octaves, under the melody. Only the tonic:
   a fifth would clash with the modes and scales that have none (whole tone,
   the no-5 mode). It shares the engine's AudioContext and is started and
   stopped from this hook, which usePlayback already manages, so every way a
   run ends (Stop, route change, hidden tab, unmount) also ends the drone. */

/** Overall level. The piano plays at roughly -24 dB RMS; three sines at this
 *  gain sum to about -31 dB, which sits clearly under the melody. */
export const DRONE_GAIN = 0.028;
/** The drone's register: the tonic between C3 and B3, plus the octaves either
 *  side at lower levels. */
export const droneMidi = (tonicPc: number) => 48 + (((tonicPc % 12) + 12) % 12);

class Drone {
  private ctx: AudioContext;
  private out: GainNode;
  private voice: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
  private current = -1;

  /** `startAt` is the drill's first downbeat, so the drone stays silent
   *  through the count-in and swells in on beat 1. */
  constructor(ctx: AudioContext, startAt?: number) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(ctx.destination);
    const at = Math.max(ctx.currentTime, startAt ?? 0);
    this.out.gain.setValueAtTime(0, at);
    this.out.gain.linearRampToValueAtTime(DRONE_GAIN, at + 0.4);
  }

  /** Move to a new tonic with a short crossfade (no glide, so no smear). */
  tune(m: number) {
    if (m === this.current) return;
    this.current = m;
    const now = this.ctx.currentTime;
    const old = this.voice;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 0.12);
      old.oscs.forEach((o) => { try { o.stop(now + 0.15); } catch {} });
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + (old ? 0.18 : 0.02));
    gain.connect(this.out);
    const hz = 440 * Math.pow(2, (m - 69) / 12);
    const oscs = ([[hz, 1], [hz / 2, 0.5], [hz * 2, 0.35]] as const).map(([f, level]) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = level;
      o.connect(g);
      g.connect(gain);
      o.start(now);
      return o;
    });
    this.voice = { oscs, gain };
  }

  stop() {
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + 0.15);
    this.voice?.oscs.forEach((o) => { try { o.stop(now + 0.2); } catch {} });
    const out = this.out;
    this.voice = null;
    this.current = -1;
    // disconnect once the fade is done; scheduled on the audio clock via the
    // stopped oscillators' onended, never a JS timer
    const last = this.ctx.createOscillator();
    last.onended = () => { try { out.disconnect(); } catch {} };
    last.start(now);
    last.stop(now + 0.25);
  }
}

/** The plan the drill hands the engine, plus the tonic the drone follows. The
 *  engine ignores the extra field; the drone reads it from the SOUNDING plan so
 *  a key change is heard in the drone on the same downbeat as in the melody. */
type LivePlan = DrillPlan & { tonicMidi: number };

export function useDrill(initial?: Partial<DrillState>) {
  const [state, setState] = useState<DrillState>({ ...DEFAULTS, ...initial });
  const [audioReady] = useState(() => getAudio().ready);

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
    window.history.replaceState(null, "", url + window.location.hash);
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
  const tonicMidi = scale.notes.length ? droneMidi(pc(scale.notes[0])) : -1;

  /* Playback. useLiveDrill owns the lifecycle (through usePlayback: unmount,
     route change, tab hide, page unload and any other surface claiming audio
     all end this run) AND the playback rule: a setting changed mid-play is
     handed to the running scheduler, never a stop. See src/lib/audio/useLive.ts. */
  const plan = useMemo<LivePlan | null>(() => notes.length ? {
    notes, stepDur, grouping: state.grouping, subdivision: state.sub,
    beatsPerBar: meter.top,
    swing: state.swing && state.sub === 2,
    loop: state.loop, click: state.click, tonicMidi,
  } : null, [notes, stepDur, state.grouping, state.sub, meter.top, state.swing,
             state.loop, state.click, tonicMidi]);

  const live = useLiveDrill(plan, () => ({
    countInBeats: state.countIn ? meter.top : 0, beatDur: 60 / state.bpm,
  }));
  const { playing, toggle, play, stop, countdown } = live;
  const position = live.position;
  /* The sounding note always comes from the plan that is SOUNDING. For up to a
     bar after a change that is still the previous drill, so the score (which
     already shows the new one) waits for the downbeat before it lights. */
  const activeNote = position ? position.plan.notes[position.index] ?? null : null;
  const index = position && position.plan.notes === notes ? position.index : -1;

  /* The drone follows the sounding plan's tonic; during the count-in (no
     position yet) it takes the tonic on screen, which is the one about to play. */
  const soundingTonic = position
    ? ((position.plan as LivePlan).tonicMidi ?? tonicMidi) : tonicMidi;
  const sounding = playing && (countdown > 0 || !!position);
  const droneRef = useRef<Drone | null>(null);
  useEffect(() => {
    const ctx = getAudio().context;
    if (!sounding || !state.drone || !ctx || soundingTonic < 0) {
      droneRef.current?.stop();
      droneRef.current = null;
      return;
    }
    droneRef.current ??= new Drone(ctx, getAudio().startTime);
    droneRef.current.tune(soundingTonic);
  }, [sounding, state.drone, soundingTonic]);
  useEffect(() => () => { droneRef.current?.stop(); droneRef.current = null; }, []);

  useEffect(() => () => { getAudio().stop(true); }, []);

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

  const landsIn = position
    ? beatsToTheOne(position.bar, position.bars, position.beat, position.beats) : null;

  return {
    state, set, setState, scale, pattern, notes, resolution, gati, meter,
    stepDur, seconds, playing, index, countdown, toggle, play, stop,
    activeNote, activeMidi: activeNote ? midi(activeNote) : null, position, landsIn,
    audioError: live.error, loadingAudio: live.loading, audioReady, shareUrl,
    family: familyById(state.family),
    patternDef: patternById(state.pattern),
  };
}
