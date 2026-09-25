/**
 * The facts on /learn ("Why six notes"), computed rather than typed.
 *
 * Every sentence on that page that names a note, a chord or a count reads it
 * from here, and tests/learn.test.ts locks each one. The examples are in G,
 * the app's home key; every function takes the key so the tests can prove the
 * same facts hold in all twelve.
 */

import { buildDiatonic, buildScale, MAJOR, omissionSurvey, OmissionRow, ScaleInstance } from "./scales";
import { skipCycle, SkipCycle } from "./patterns";
import { findChords, tertianOnly, ChordSet } from "./chords";
import { midi, Note, note, noteName, pc, isPerfect } from "./note";

export const LEARN_KEY = "G";

/** "F#" → "F♯", "Bb" → "B♭". Only a flat that follows a letter is a flat. */
export const pretty = (s: string): string =>
  s.replace(/#/g, "♯").replace(/([A-G])b/g, "$1♭");

/** "F#dim" → "F♯°", "Bm" → "Bm", "G" → "G". */
export const chordLabel = (symbol: string): string =>
  pretty(symbol.replace(/dim$/, "°"));

/** "Bm" → "B minor", "F#dim" → "F♯°", "D" → "D". For sentences. */
export const chordWords = (symbol: string): string =>
  symbol.endsWith("dim") ? chordLabel(symbol)
    : symbol.endsWith("m") ? `${pretty(symbol.slice(0, -1))} minor`
    : pretty(symbol);

/** Join as English: "A", "A and B", "A, B and C". */
export const listWords = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/* The six notes are the major scale without its 4th. buildScale's `removed`
   is the parent-key reading, which in flat keys names the ♯4 instead (the same
   six notes also sit in the major scale a fifth up), so Learn takes the 4th
   straight from the major scale. */
const fourthOf = (key: string): Note => buildDiatonic(key, MAJOR)![3];

const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

/* ── 1. only the 4th or the 7th can go ─────────────────────────────────── */

export interface TritoneFact {
  major: Note[];
  /** the only tritone in the major scale, lower note first */
  tritone: [Note, Note];
  tritoneCount: number;
  rows: OmissionRow[];
  /** the removals that leave no tritone, with their degree as a word */
  clean: { note: string; degree: string }[];
}

export function tritoneFact(key = LEARN_KEY): TritoneFact {
  const major = buildDiatonic(key, MAJOR)!;
  const pairs: [Note, Note][] = [];
  for (let i = 0; i < major.length; i++)
    for (let j = i + 1; j < major.length; j++)
      if (((pc(major[j]) - pc(major[i])) % 12 + 12) % 12 === 6) pairs.push([major[i], major[j]]);
  const rows = omissionSurvey(key);
  return {
    major,
    tritone: pairs[0],
    tritoneCount: pairs.length,
    rows,
    clean: rows.filter((r) => r.tritones === 0)
      .map((r) => ({ note: r.removedNote, degree: ordinal(r.removedDegree) })),
  };
}

/* ── 2. major and minor are the same six notes ─────────────────────────── */

export interface SameSixFact {
  major: ScaleInstance;     // mode 0: major, no 4th
  minor: ScaleInstance;     // mode 4 on the 6th degree: minor, no ♭6
  /** the one note both leave out: the major's 4th, which is the minor's ♭6 */
  removed: Note;
  sameNotes: boolean;
}

export function sameSixFact(key = LEARN_KEY): SameSixFact {
  const major = buildScale(key, "diatonic", 0);
  // The relative minor starts on the major scale's 6th degree, which is the
  // 5th of the six notes (1 2 3 5 [6] 7).
  const minor = buildScale(noteName(major.notes[4]), "diatonic", 4);
  const a = new Set(major.notes.map(pc));
  const sameNotes = minor.notes.length === 6 && minor.notes.every((n) => a.has(pc(n)));
  return { major, minor, removed: fourthOf(key), sameNotes };
}

/* ── 3. the scale is one chord ─────────────────────────────────────────── */

export interface ChordStackFact {
  /** the seven-note scale stacked in thirds from the tonic; one of them is the
   *  removed note, which leaves the one gap in the stack */
  stack: { note: Note; removed: boolean }[];
  /** the six notes that remain, voiced upward from octave 3 */
  voiced: Note[];
  removed: Note;
}

export function chordStackFact(key = LEARN_KEY): ChordStackFact {
  const major = buildDiatonic(key, MAJOR)!;
  const removed = fourthOf(key);
  const order = [0, 2, 4, 6, 1, 3, 5];        // 1 3 5 7 9 11 13
  const stack = order.map((i) => ({ note: major[i], removed: pc(major[i]) === pc(removed) }));
  const voiced: Note[] = [];
  let prev = -Infinity;
  for (const { note: n, removed: gone } of stack) {
    if (gone) continue;
    let v = note(n.letter, n.alt, 3);
    while (midi(v) <= prev) v = note(v.letter, v.alt, v.octave + 1);
    voiced.push(v);
    prev = midi(v);
  }
  return { stack, voiced, removed };
}

/* ── 4. only four chords fit ───────────────────────────────────────────── */

export interface SmallHarmonyFact {
  /** the triads inside the six notes, in scale order from the tonic */
  triads: ChordSet[];
  /** the triads of the full major scale that the six notes cannot make */
  lost: ChordSet[];
  removed: Note;
  /** every lost triad contains the removed note */
  lostAllNeedRemoved: boolean;
}

export function smallHarmonyFact(key = LEARN_KEY): SmallHarmonyFact {
  const hexa = buildScale(key, "diatonic", 0);
  const major = buildDiatonic(key, MAJOR)!;
  const removed = fourthOf(key);
  const degree = (c: ChordSet) =>
    major.findIndex((n) => noteName(n) === c.names[0].root);
  const byDegree = (a: ChordSet, b: ChordSet) => degree(a) - degree(b);
  const triads = tertianOnly(findChords(hexa.notes, [3])).sort(byDegree);
  const have = new Set(triads.map((c) => c.pcs.join(",")));
  const lost = tertianOnly(findChords(major, [3]))
    .filter((c) => !have.has(c.pcs.join(","))).sort(byDegree);
  return {
    triads, lost, removed,
    lostAllNeedRemoved: lost.every((c) => c.pcs.includes(pc(removed))),
  };
}

/* ── 5. every fourth is perfect ────────────────────────────────────────── */

export interface FourthsFact {
  six: SkipCycle;
  seven: SkipCycle;
  /** the one jump in the seven-note scale that is not perfect */
  breaks: SkipCycle["pairs"];
  removed: Note;
}

export function fourthsFact(key = LEARN_KEY): FourthsFact {
  const hexa = buildScale(key, "diatonic", 0);
  const seven = skipCycle(buildDiatonic(key, MAJOR)!, 3);
  return {
    six: skipCycle(hexa.notes, 3),
    seven,
    breaks: seven.pairs.filter((p) => !isPerfect(p.interval)),
    removed: fourthOf(key),
  };
}
