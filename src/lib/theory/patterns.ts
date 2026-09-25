/**
 * Pattern generation.
 *
 * Every pattern is generated as a DEGREE sequence first and then spelled — never
 * as notes directly, because notes-first cannot be transposed.
 *
 * Six families, each training something different: runs, fourths, thirds,
 * sequences, broken chords and doubled notes. Twelve drills used to overlap
 * (in a six-note scale a skip of four is a skip of two turned upside down, and a
 * skip of five is a step turned upside down), so those were cut. Old share links
 * still open: LEGACY_PATTERN maps every retired id to its nearest drill.
 */

import { Note, note, intervalName, pc, noteName } from "./note";
import { findChords, tertianOnly } from "./chords";

/** The concrete drills the engine can build. Share links carry these ids. */
export type PatternId =
  | "both" | "aroha" | "avaroha"
  | "fourths" | "thirds"
  | "cells" | "cellsDown"
  | "chordLadder" | "janta";

export type PatternFamilyId = "runs" | "fourths" | "thirds" | "sequences" | "chords" | "doubled";

export interface PatternDef {
  id: PatternId;
  family: PatternFamilyId;
  /** the variant's short name inside its family ("Up", "Down"…) */
  variant: string;
  /** the full plain name */
  label: string;
  hint: string;
  usesTopNote: boolean;
  usesCell: boolean;
}

export interface PatternFamily {
  id: PatternFamilyId;
  /** plain name, first */
  name: string;
  /** the tradition's term or a short gloss, shown small */
  sub: string;
  /** what this family trains */
  trains: string;
  patterns: PatternId[];
}

export const PATTERN_FAMILIES: PatternFamily[] = [
  { id: "runs", name: "Runs", sub: "aroha–avaroha",
    trains: "The scale in order: evenness, and the shape of the six notes.",
    patterns: ["both", "aroha", "avaroha"] },
  { id: "fourths", name: "Fourths", sub: "skip of three",
    trains: "Each note, then the note three scale steps above it.",
    patterns: ["fourths"] },
  { id: "thirds", name: "Thirds", sub: "skip of two",
    trains: "Each note, then the note two scale steps above it. Where a note is missing, a 3rd can stretch into a 4th.",
    patterns: ["thirds"] },
  { id: "sequences", name: "Sequences", sub: "cells of 3, 4 or 5",
    trains: "A short run started from every note in turn.",
    patterns: ["cells", "cellsDown"] },
  { id: "chords", name: "Broken chords", sub: "every triad inside",
    trains: "The scale's own triads, one note at a time.",
    patterns: ["chordLadder"] },
  { id: "doubled", name: "Doubled notes", sub: "janta",
    trains: "Every note twice: repeated-note control and an even attack.",
    patterns: ["janta"] },
];

export const PATTERNS: PatternDef[] = [
  { id: "both", family: "runs", variant: "Up and down", label: "Runs: up and down",
    hint: "Up, turn, and back down with no note repeated. The top note is the turning point and the bottom note is left to the next pass, so the loop is seamless.",
    usesTopNote: false, usesCell: false },
  { id: "aroha", family: "runs", variant: "Up", label: "Runs: up",
    hint: "Straight up, then round again from the bottom.",
    usesTopNote: true, usesCell: false },
  { id: "avaroha", family: "runs", variant: "Down", label: "Runs: down",
    hint: "Straight down, then round again from the top.",
    usesTopNote: true, usesCell: false },
  { id: "fourths", family: "fourths", variant: "Fourths", label: "Fourths",
    hint: "Each note, then the note three scale steps above it.",
    usesTopNote: false, usesCell: false },
  { id: "thirds", family: "thirds", variant: "Thirds", label: "Thirds",
    hint: "Each note, then the note two scale steps above it.",
    usesTopNote: false, usesCell: false },
  { id: "cells", family: "sequences", variant: "Up", label: "Sequences: up",
    hint: "A short run from each note in turn, climbing.",
    usesTopNote: false, usesCell: true },
  { id: "cellsDown", family: "sequences", variant: "Down", label: "Sequences: down",
    hint: "The same cells, each played downwards, starting from the top.",
    usesTopNote: false, usesCell: true },
  { id: "chordLadder", family: "chords", variant: "Broken chords", label: "Broken chords",
    hint: "Every triad the scale contains, lowest root first, each played as an arpeggio. The triads come from the chord table, not from skipping every other note, so only real chords appear.",
    usesTopNote: false, usesCell: false },
  { id: "janta", family: "doubled", variant: "Doubled notes", label: "Doubled notes",
    hint: "Up and down with every note played twice. The pattern is twice as long, and the bar count allows for it.",
    usesTopNote: false, usesCell: false },
];

/** Retired ids from the twelve-pattern menu, mapped to their nearest drill. */
export const LEGACY_PATTERN: Record<string, PatternId> = {
  fifths: "thirds",       // a skip of four is a skip of two turned upside down
  sixths: "both",         // a skip of five is a step turned upside down
  triads: "chordLadder",  // the second triad pattern overlapped the first
};

export const patternById = (id: PatternId): PatternDef =>
  PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

export const patternFamilyOf = (id: PatternId): PatternFamily =>
  PATTERN_FAMILIES.find((f) => f.patterns.includes(id)) ?? PATTERN_FAMILIES[0];

/** Any pattern id a link might carry, old or new. Null when unknown. */
export function resolvePatternId(raw: string | null): PatternId | null {
  if (raw === null) return null;
  if (PATTERNS.some((p) => p.id === raw)) return raw as PatternId;
  return LEGACY_PATTERN[raw] ?? null;
}

const SEMITONE_NAME: Record<number, string> = {
  1: "half step", 2: "whole step", 3: "minor 3rd", 4: "major 3rd", 5: "perfect 4th",
  6: "tritone", 7: "perfect 5th", 8: "minor 6th", 9: "major 6th", 10: "minor 7th",
  11: "major 7th",
};

/** What a skip pattern sounds like in THIS scale, measured in semitones (what
 *  the ear hears). Most frequent first. */
export function skipSummary(
  scale: Note[], step: number,
): { name: string; semis: number; count: number }[] {
  const n = scale.length;
  if (!n) return [];
  const counts = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const semis = (((pc(scale[(i + step) % n]) - pc(scale[i])) % 12) + 12) % 12;
    counts.set(semis, (counts.get(semis) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([semis, count]) => ({ semis, count, name: SEMITONE_NAME[semis] ?? `${semis} semitones` }))
    .sort((x, y) => y.count - x.count || x.semis - y.semis);
}

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight"];

/** One plain sentence for the skip patterns, computed from the scale. */
export function describeSkip(scale: Note[], step: number): string {
  const parts = skipSummary(scale, step).map(
    (p) => `${WORD[p.count] ?? p.count} ${p.name}${p.count === 1 ? "" : "s"}`,
  );
  if (!parts.length) return "";
  const list = parts.length === 1 ? parts[0]
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `In this scale that gives ${list}.`;
}

/** The octave note is a REAL choice, not a detail: including it makes a
 *  hexatonic pattern 7 notes long. Six splits into 2s and 3s, so it lines up
 *  with most bar lengths quickly; seven is prime and lines up only with groups
 *  of 7. Both answers are musically correct, so the UI exposes the choice and
 *  prints the bar count each way rather than deciding silently. */
export function ladder(scale: Note[], octaves: number, includeTop: boolean): Note[] {
  const n = scale.length;
  const count = n * octaves + (includeTop ? 1 : 0);
  const out: Note[] = [];
  for (let i = 0; i < count; i++) {
    const b = scale[i % n];
    out.push(note(b.letter, b.alt, b.octave + Math.floor(i / n)));
  }
  return out;
}

function skip(scale: Note[], octaves: number, step: number): Note[] {
  const L = ladder(scale, octaves + 1, true);
  const out: Note[] = [];
  for (let i = 0; i < scale.length * octaves; i++) {
    out.push(L[i]);
    out.push(L[i + step]);
  }
  return out;
}

function cells(scale: Note[], octaves: number, len: number, down: boolean): Note[] {
  const L = ladder(scale, octaves + 1, true);
  const out: Note[] = [];
  const total = scale.length * octaves;
  for (let i = 0; i < total; i++) {
    const cell: Note[] = [];
    for (let k = 0; k < len; k++) cell.push(L[i + k]);
    out.push(...cell);
  }
  if (down) {
    const chunks: Note[][] = [];
    for (let i = 0; i < out.length; i += len) chunks.push(out.slice(i, i + len).reverse());
    return chunks.reverse().flat();
  }
  return out;
}

/** Real chords, not degree-stacks: look them up, order by scale degree of the
 *  root, and arpeggiate each. Falls back to a plain ladder if the set contains
 *  no tertian triad at all (some custom scales). */
function chordLadder(scale: Note[], octaves: number): Note[] {
  const chords = tertianOnly(findChords(scale, [3]));
  if (!chords.length) return ladder(scale, octaves, false);
  const degIdx = (root: string) => scale.findIndex((n) => noteName(n) === root);
  const seq = chords
    .map((c) => c.names.find((x) => x.family === "tertian") ?? c.names[0])
    .filter((x) => degIdx(x.root) >= 0)
    .sort((a, b) => degIdx(a.root) - degIdx(b.root));
  const out: Note[] = [];
  for (let o = 0; o < octaves; o++)
    for (const ch of seq)
      for (const n of ch.voicing) out.push(note(n.letter, n.alt, n.octave + o));
  return out;
}

export function buildPattern(
  id: PatternId, scale: Note[], octaves: number, cellLen: number, includeTop: boolean
): Note[] {
  switch (id) {
    case "aroha":     return ladder(scale, octaves, includeTop);
    case "avaroha":   return [...ladder(scale, octaves, includeTop)].reverse();
    case "both": {
      /* Up, turn, and back down with NOTHING repeated.
         The turning note at the top is played once, and the bottom note is left
         off the end because the loop supplies it again on the next pass. For a
         hexatonic over one octave that gives exactly 12 notes — which happens to
         resolve in three bars of 16ths, the shortest useful cycle in the app. */
      const up = ladder(scale, octaves, true);       // G A B D E F# G
      const down = [...up].slice(1, -1).reverse();   // F# E D B A   (no top, no bottom)
      return up.concat(down);
    }
    case "thirds":    return skip(scale, octaves, 2);
    case "fourths":   return skip(scale, octaves, 3);
    case "cells":     return cells(scale, octaves, cellLen, false);
    case "cellsDown": return cells(scale, octaves, cellLen, true);
    case "janta":     return buildPattern("both", scale, octaves, cellLen, includeTop)
                               .flatMap((n) => [n, n]);
    case "chordLadder": return chordLadder(scale, octaves);
    default:          return buildPattern("both", scale, octaves, cellLen, includeTop);
  }
}

/** The interval content of a skip cycle — Theorem 5 in one call. */
export interface SkipCycle {
  step: number;
  pairs: { from: Note; to: Note; interval: string }[];
  tally: Record<string, number>;
  allPerfect: boolean;
}

export function skipCycle(scale: Note[], step: number): SkipCycle {
  const n = scale.length;
  const pairs = scale.map((a, i) => {
    const j = i + step;
    const b0 = scale[j % n];
    const b = note(b0.letter, b0.alt, b0.octave + Math.floor(j / n));
    return { from: a, to: b, interval: intervalName(a, b) };
  });
  const tally: Record<string, number> = {};
  for (const p of pairs) tally[p.interval] = (tally[p.interval] ?? 0) + 1;
  const allPerfect = Object.keys(tally).every((k) => k === "P4" || k === "P5");
  return { step, pairs, tally, allPerfect };
}
