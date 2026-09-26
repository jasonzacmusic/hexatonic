"use client";

/**
 * Plays one ear-game program (a prompt or a reveal) on the audio clock.
 *
 * Lifecycle: every play goes through usePlayback().begin(), so navigating
 * away, hiding the tab or unmounting stops it like every other screen.
 *
 * The playback rule: a prompt is short and fixed, so nothing a player changes
 * mid-phrase (tempo, key, level) touches the notes already sounding. Changes
 * are read the next time something is played. Nothing here ever stops the
 * music because a setting changed; only a new play, Stop, or the end does.
 *
 * Every note is scheduled up front against AudioContext.currentTime. The
 * animation frame only READS the clock to light the chip that is sounding.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudio } from "../audio/engine";
import { usePlayback } from "../audio/usePlayback";
import { EarProgram, Mark } from "./program";

export interface EarPlayer {
  playing: boolean;
  loading: boolean;
  error: string | null;
  /** what is lit right now (row + chips), from the audio clock */
  lit: Mark | null;
  /** the MIDI notes of the lit event, for the keyboard and the ring */
  sounding: number[];
  /** the current phase label ("Setting the key", "Listen", "Your pick: …") */
  phase: string | null;
  /** a melody note is sounding right now */
  pulse: number;
  /** the id of the program that is playing */
  tag: string | null;
  play: (program: EarProgram, tag: string) => Promise<void>;
  stop: () => void;
}

/** A released note keeps ringing for about this long. */
const TAIL = 1.1;

export function useEarPlayer(): EarPlayer {
  const [lit, setLit] = useState<Mark | null>(null);
  const [sounding, setSounding] = useState<number[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [tag, setTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const shown = useRef("");

  const clear = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    shown.current = "";
    setLit(null);
    setSounding([]);
    setPhase(null);
    setTag(null);
  }, []);

  const pb = usePlayback("drill", clear);
  const { begin, end, playing } = pb;

  const play = useCallback(async (program: EarProgram, id: string) => {
    setError(null);
    await begin(async (guard) => {
      const a = getAudio();
      a.stop(true);                         // our own previous phrase, if any
      if (raf.current) cancelAnimationFrame(raf.current);
      setTag(id);
      const midis = program.events.flatMap((e) => e.midis);
      try {
        if (!a.fullyLoaded) setLoading(true);
        await a.init("/audio/salamander", midis);
        /* The first prompt should be piano, not the fallback synth: wait for
           the samples, but never longer than a few seconds. */
        if (!a.fullyLoaded)
          await Promise.race([a.waitForSampleLoading(), new Promise((r) => setTimeout(r, 4000))]);
      } catch (e: any) {
        setError(e?.message ?? "Audio could not start.");
        return false;
      } finally {
        setLoading(false);
      }
      const ctx = a.context;
      if (!guard() || !ctx) return false;
      const t0 = ctx.currentTime + 0.12;
      /* For headless checks only: a page that defines window.__hxEarLog gets
         every scheduled note. Nothing is logged otherwise. */
      const log = (window as any).__hxEarLog;
      if (Array.isArray(log)) log.push({ tag: id, at: t0, events: program.events, phases: program.phases });
      for (const e of program.events)
        e.midis.forEach((m, j) => a.note(m, t0 + e.at + j * (e.spread ?? 0), e.dur, e.vel));

      const melody = program.events.filter((e) => e.melody);
      const marked = program.events.filter((e) => e.mark);
      const tick = () => {
        if (!guard()) return;
        const now = ctx.currentTime - t0;
        let m: Mark | null = null;
        let notes: number[] = [];
        for (const e of marked) {
          if (e.at > now) break;
          const len = e.dur + (e.spread ?? 0) * (e.midis.length - 1);
          if (now < e.at + Math.min(len, 0.9)) { m = e.mark!; notes = e.midis; }
        }
        let p = 0;
        for (let i = 0; i < melody.length; i++) {
          if (melody[i].at > now) break;
          if (now < melody[i].at + Math.min(melody[i].dur, 0.6)) p = i + 1;
        }
        let ph: string | null = null;
        for (const x of program.phases) if (x.at <= now + 1e-3) ph = x.label;
        const key = `${m ? m.row + m.chips.join(".") : ""}|${p}|${ph}`;
        if (key !== shown.current) {
          shown.current = key;
          setLit(m);
          setSounding(notes);
          setPulse(p);
          setPhase(ph);
        }
        if (now > program.length + TAIL) { end(); return; }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return true;
    });
  }, [begin, end]);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  return { playing, loading, error, lit, sounding, phase, pulse, tag, play, stop: end };
}
