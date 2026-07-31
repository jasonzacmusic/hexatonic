/**
 * Pattern generation.
 *
 * Every pattern is generated as a DEGREE sequence first and then spelled — never
 * as notes directly, because notes-first cannot be transposed.
 */

import { Note, note, intervalName, pc, noteName } from "./note";
import { findChords, tertianOnly } from "./chords";

export type PatternId =
  | "aroha" | "avaroha" | "both"
  | "thirds" | "fourths" | "fifths" | "sixths"
  | "cells" | "cellsDown" | "triads"
  | "janta" | "chordLadder";

export interface PatternDef {
  id: PatternId;
  label: string;
  hint: string;
  usesTopNote: boolean;
  usesCell: boolean;
}

export const PATTERNS: PatternDef[] = [
  { id: "both",      label: "Aroha–Avaroha — up and down", hint: "Up, turn, and back down with no note repeated. The top note is the turning point and the bottom is left to the next pass, so the loop is seamless.", usesTopNote: false, usesCell: false },
  { id: "aroha",     label: "Aroha — ascending",           hint: "Straight up.", usesTopNote: true,  usesCell: false },
  { id: "avaroha",   label: "Avaroha — descending",        hint: "Straight down.", usesTopNote: true, usesCell: false },
  { id: "thirds",    label: "In thirds (step 2 degrees)",  hint: "In a six-note scale this is NOT thirds — you get 2 major 3rds, 2 minor 3rds and 2 perfect 4ths. The fourths appear where the removed note left a gap.", usesTopNote: false, usesCell: false },
  { id: "fourths",   label: "In fourths (step 3 degrees)", hint: "Every single degree yields a perfect 4th or 5th. Six for six. The major scale cannot do this — F–B comes out an augmented 4th.", usesTopNote: false, usesCell: false },
  { id: "fifths",    label: "In fifths (step 4 degrees)",  hint: "Sixths and fifths mixed. Here the heptatonic is actually the more uniform one — don't overclaim.", usesTopNote: false, usesCell: false },
  { id: "sixths",    label: "In sixths (step 5 degrees)",  hint: "Mostly sevenths, by letter-distance.", usesTopNote: false, usesCell: false },
  { id: "janta",     label: "Janta — every note doubled",  hint: "The Carnatic twin exercise: CC DD EE, up and back down. Doubling every attack builds evenness and, on a keyboard, repeated-note control. The pattern is twice as long, and the resolution maths knows it.", usesTopNote: false, usesCell: false },
  { id: "chordLadder", label: "Arpeggio ladder — every chord in the scale", hint: "The scale's real triads (from the chord table, not degree-skipping — Theorem 5 says those differ), each arpeggiated in turn. Four triads in the diatonic hexachord makes a 12-note pattern: the arithmetic sweet spot.", usesTopNote: false, usesCell: false },
  { id: "cells",     label: "Cells of N — running up",     hint: "Classic sequence practice. Cell of 4: C D E G / D E G A / E G A B …", usesTopNote: false, usesCell: true },
  { id: "cellsDown", label: "Cells of N — running down",   hint: "Cells descend and their contents descend. Teachers disagree about this; both are offered.", usesTopNote: false, usesCell: true },
  { id: "triads",    label: "Triad arpeggios",             hint: "The available triads, in order, through the range.", usesTopNote: false, usesCell: false },
];

export const patternById = (id: PatternId): PatternDef =>
  PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

/** The octave note is a REAL choice, not a detail: including it makes a
 *  hexatonic pattern 7 notes long, and 7 shares factors with nothing — which
 *  throws away the entire arithmetic advantage of a six-note scale. Both answers
 *  are musically correct, so the UI exposes it rather than deciding silently. */
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

function triadRun(scale: Note[], octaves: number): Note[] {
  // stack thirds through the ladder: degrees 0-2-4, 1-3-5, …
  const L = ladder(scale, octaves + 1, true);
  const out: Note[] = [];
  for (let i = 0; i < scale.length * octaves; i++) {
    out.push(L[i], L[i + 2], L[i + 4]);
  }
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
      const up = ladder(scale, octaves, true);       // C D E G A B C
      const down = [...up].slice(1, -1).reverse();   // B A G E D   (no top, no bottom)
      return up.concat(down);
    }
    case "thirds":    return skip(scale, octaves, 2);
    case "fourths":   return skip(scale, octaves, 3);
    case "fifths":    return skip(scale, octaves, 4);
    case "sixths":    return skip(scale, octaves, 5);
    case "cells":     return cells(scale, octaves, cellLen, false);
    case "cellsDown": return cells(scale, octaves, cellLen, true);
    case "triads":    return triadRun(scale, octaves);
    case "janta":     return buildPattern("both", scale, octaves, cellLen, includeTop)
                               .flatMap((n) => [n, n]);
    case "chordLadder": return chordLadder(scale, octaves);
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
