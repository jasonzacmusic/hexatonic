/**
 * Routines: the graded practice ladder, folded into Practice.
 *
 * Modelled on the Carnatic varisai sequence (docs/07-CARNATIC.md §6): the first
 * rungs hold the scale constant and vary the PATTERN; the last holds the pattern
 * and varies the TALA. Plain names lead; the tradition's names are the subtitle.
 *
 * Every rung is practised at three speeds, each double the last (kala pramanam:
 * ×1, ×2, ×4). The speeds are tempo multiples of one base tempo, so the maths
 * stays exact and every tempo stays inside the app's 40–200 bpm range.
 */

import type { DrillState } from "../../lib/useDrill";
import { SAPTA_TALAS, talaAsMeter, aksharas } from "../../lib/theory/meters";
import { KALA } from "../../lib/theory/resolution";

export interface RoutineStep {
  label: string;
  state: Partial<DrillState>;
}

export interface Routine {
  id: string;
  name: string;
  /** the Carnatic name, shown small */
  trad: string;
  what: string;
  steps: RoutineStep[];
}

/** Everything a step does not name goes back to plain defaults, so a step
 *  never inherits a stray setting (two octaves, a tala) from the last one. */
export const STEP_BASE: Partial<DrillState> = {
  pattern: "both", cell: 4, octaves: 1, includeTop: false, sub: 4, grouping: 4,
  meter: "4-4", resolve: "full", swing: false,
};

export const ROUTINES: Routine[] = [
  {
    id: "updown", name: "Up and down", trad: "sarali varisai",
    what: "Straight up and down, then the same notes re-ordered into cells.",
    steps: [
      { label: "Up and down", state: { pattern: "both" } },
      { label: "Cells of 4", state: { pattern: "cells", cell: 4 } },
      { label: "Cells of 3, in triplets", state: { pattern: "cells", cell: 3, sub: 3, grouping: 3 } },
    ],
  },
  {
    id: "higher", name: "Going higher", trad: "melsthayi varisai",
    what: "The same material, carried into the upper octave.",
    steps: [
      { label: "Two octaves up", state: { pattern: "aroha", octaves: 2 } },
      { label: "Two octaves, up and down", state: { pattern: "both", octaves: 2, sub: 3 } },
    ],
  },
  {
    id: "lower", name: "Coming down", trad: "mandrasthayi varisai",
    what: "The mirror image. Descending gets less practice, so it has its own rung.",
    steps: [
      { label: "Two octaves down", state: { pattern: "avaroha", octaves: 2 } },
      { label: "Cells running down", state: { pattern: "cellsDown", cell: 4 } },
    ],
  },
  {
    id: "doubled", name: "Doubled notes", trad: "janta varisai",
    what: "Every note played twice, for an even attack.",
    steps: [
      { label: "Doubled, up and down", state: { pattern: "janta" } },
      { label: "Doubled, in sixes", state: { pattern: "janta", sub: 6, grouping: 6 } },
    ],
  },
  {
    id: "skips", name: "Skips", trad: "dhatu varisai",
    what: "Leaps instead of steps: thirds, fourths and the scale's own chords.",
    steps: [
      { label: "Thirds", state: { pattern: "thirds" } },
      { label: "Fourths", state: { pattern: "fourths" } },
      { label: "Broken chords, in triplets", state: { pattern: "chordLadder", sub: 3, grouping: 3 } },
    ],
  },
  {
    id: "talas", name: "Across the talas", trad: "alankaram",
    what: "The pattern stays; the rhythmic cycle changes. The seven talas usually taught first.",
    steps: SAPTA_TALAS.map((t) => ({
      label: `${t.name} (${aksharas(t, t.defaultJati)} beats)`,
      state: { pattern: "both", meter: talaAsMeter(t, t.defaultJati).id, sub: 2, grouping: 4 },
    })),
  },
];

/** The first speed. ×2 and ×4 double it and double it again. */
export const BASE_BPM = 50;
export const SPEEDS = KALA.map((k) => ({
  id: k.id, label: `×${k.multiplier}`, multiplier: k.multiplier, bpm: BASE_BPM * k.multiplier,
}));

/** The full state change for one step at one speed. Key and scale stay put. */
export function stepState(step: RoutineStep, bpm: number): Partial<DrillState> {
  return { ...STEP_BASE, ...step.state, bpm };
}
