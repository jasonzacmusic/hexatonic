/**
 * Facts the Practice page prints about the current drill. Every sentence here
 * is computed from src/lib/theory, never typed in, and each is locked by
 * tests/practice.test.ts.
 */

import type { Note } from "../../lib/theory/note";
import { pc } from "../../lib/theory/note";
import { RAGAS, buildRaga, type Raga } from "../../lib/theory/ragas";
import { solveResolution, type ResolveMode } from "../../lib/theory/resolution";
import type { Family } from "../../lib/theory/scales";

/** Carnatic ragas that use exactly these notes, the same way up and down. */
export function ragasForScale(tonic: string, notes: Note[]): Raga[] {
  if (!notes.length) return [];
  const want = new Set(notes.map(pc));
  return RAGAS.filter((r) => r.tradition === "carnatic" && !r.vakra).filter((r) => {
    const inst = buildRaga(tonic, r.id);
    if (inst.error) return false;
    const up = new Set(inst.arohana.map(pc));
    const down = new Set(inst.avarohana.map(pc));
    const same = (a: Set<number>) => a.size === want.size && [...a].every((p) => want.has(p));
    return same(up) && same(down);
  });
}

/** With the top note on, how many bars the drill takes, against without it. */
export function topNoteCost(
  patternLength: number, sub: number, beats: number, grouping: number, mode: ResolveMode,
): { withTop: number; without: number; length: number } {
  return {
    length: patternLength,
    withTop: solveResolution(patternLength, sub, beats, grouping, mode).bars,
    without: solveResolution(patternLength - 1, sub, beats, grouping, mode).bars,
  };
}

/** If triplets would bring the same drill home in fewer bars, say so. */
export function tripletHint(
  patternLength: number, sub: number, beats: number, grouping: number, mode: ResolveMode,
): string | null {
  if (sub === 3) return null;
  const now = solveResolution(patternLength, sub, beats, grouping, mode).bars;
  const trip = solveResolution(patternLength, 3, beats, grouping, mode).bars;
  if (now <= 4 || trip >= now) return null;
  return `In triplets the same drill lands in ${trip} bar${trip === 1 ? "" : "s"}.`;
}

/* ── the family menu ──────────────────────────────────────────────────────
   Six-note scales first; everything else is there to compare with. If the
   theory module gives a family its own `group`, that wins; otherwise this
   local map decides, so the menu never depends on another file's timing. */

const LOCAL_GROUP: Record<string, string> = {
  diatonic: "Six-note scales", mixo: "Six-note scales", blues: "Six-note scales",
  "blues-major": "Six-note scales", aug: "Six-note scales", whole: "Six-note scales",
  prometheus: "Six-note scales", petrushka: "Six-note scales", messiaen5: "Six-note scales",
  custom: "Build your own",
};

export const familyGroup = (f: Family): string => {
  const g = (f as Family & { group?: unknown }).group;
  if (typeof g === "string" && g.trim()) return g;
  return LOCAL_GROUP[f.id] ?? (f.size === 6 ? "Six-note scales" : "Compare with");
};

/** Families grouped for an <optgroup> menu, in first-seen order. */
export function groupFamilies(families: Family[]): { group: string; families: Family[] }[] {
  const out: { group: string; families: Family[] }[] = [];
  for (const f of families) {
    const g = familyGroup(f);
    let slot = out.find((o) => o.group === g);
    if (!slot) { slot = { group: g, families: [] }; out.push(slot); }
    slot.families.push(f);
  }
  return out;
}

/** The six-note families "Surprise me" may roll (never custom). */
export const isSixNoteSound = (f: Family) =>
  f.size === 6 && f.kind !== "custom" && familyGroup(f) !== "Compare with";

/** "b3" → "♭3", for display. */
export const prettyDegree = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");
