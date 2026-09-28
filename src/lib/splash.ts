"use client";

/**
 * The splash: play a note that is not in the scale and it gets a short
 * water-splash on its key and on the ring. The removed note splashes red.
 * Notes in the scale get nothing.
 *
 * Every note played (a MIDI keyboard, a tap on an on-screen key) goes through
 * `emitNote`, synchronously, so the splash lands on the next paint (well
 * inside 50 ms). Players turn it off with the switch; the choice is kept in
 * this browser.
 */

import { useEffect, useRef, useState } from "react";

type Listener = (midi: number) => void;
const listeners = new Set<Listener>();

/** Tell every listening keyboard and ring that a note was played. */
export function emitNote(midi: number) {
  listeners.forEach((l) => { try { l(midi); } catch { /* one bad listener never blocks the rest */ } });
}

export function onNote(l: Listener): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/* ── the off switch ────────────────────────────────────────────────────── */

const STORE = "hx-splash";
const CHANGE = "hx-splash-change";

export function splashOn(): boolean {
  try { return window.localStorage.getItem(STORE) !== "off"; } catch { return true; }
}

export function setSplashOn(on: boolean) {
  try { window.localStorage.setItem(STORE, on ? "on" : "off"); } catch { /* still switches for this page */ }
  window.dispatchEvent(new CustomEvent(CHANGE, { detail: on }));
}

export function useSplashSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(splashOn());
    const h = (e: Event) => setOn(Boolean((e as CustomEvent).detail));
    window.addEventListener(CHANGE, h);
    return () => window.removeEventListener(CHANGE, h);
  }, []);
  return [on, setSplashOn];
}

/* ── the splashes themselves ───────────────────────────────────────────── */

export type SplashKind = "out" | "removed";
export interface Splash { id: number; midi: number; pc: number; kind: SplashKind }

export const SPLASH_MS = 640;
let nextId = 1;

/** What a played note is, against a scale: nothing, outside, or the removed note. */
export function judge(midi: number, scalePcs: number[], removedPc: number): SplashKind | null {
  const p = ((midi % 12) + 12) % 12;
  if (!scalePcs.length || scalePcs.includes(p)) return null;
  return p === removedPc ? "removed" : "out";
}

/**
 * The splashes to draw right now for one keyboard or ring. `enabled` is the
 * component's own opt-in; the player's off switch is read here too.
 */
export function useSplashes(enabled: boolean, scalePcs: number[], removedPc: number): Splash[] {
  const [list, setList] = useState<Splash[]>([]);
  const [on] = useSplashSetting();
  const ctx = useRef({ scalePcs, removedPc });
  ctx.current = { scalePcs, removedPc };

  useEffect(() => {
    if (!enabled || !on) { setList([]); return; }
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const off = onNote((m) => {
      const kind = judge(m, ctx.current.scalePcs, ctx.current.removedPc);
      if (!kind) return;
      const s: Splash = { id: nextId++, midi: m, pc: ((m % 12) + 12) % 12, kind };
      setList((l) => [...l.slice(-5), s]);
      const t = setTimeout(() => {
        timers.delete(t);
        setList((l) => l.filter((x) => x.id !== s.id));
      }, SPLASH_MS + 60);
      timers.add(t);
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, [enabled, on]);

  return list;
}

/** Colours: water for a note outside the scale, red for the removed note. */
export const SPLASH_INK: Record<SplashKind, string> = { out: "#7CC6EA", removed: "#E8666C" };
