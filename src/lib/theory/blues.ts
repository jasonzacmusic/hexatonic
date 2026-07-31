/**
 * The 12-bar blues lane.
 *
 * THE DELIBERATE EXCEPTION: every vamp in vamps.ts is built only from notes the
 * scale contains — that is its lesson. The blues teaches the OPPOSITE lesson:
 * one scale held over dominant harmony that keeps stepping outside it. So this
 * module knowingly builds chords the scale does not contain, and that is not a
 * violation of the vamp rule — it is the other half of the curriculum.
 *
 * Spelling follows the same law as everything else: the IV of F is Bb because
 * it is a perfect fourth up by LETTER, never "A#".
 */

import { Note, midi, note, pc, spell, stepLetter, letterIndex, noteName, parseNoteName } from "./note";

export interface BluesBar {
  /** which bar of the form, 0-11 */
  bar: number;
  symbol: string;      // e.g. "C7"
  roman: "I7" | "IV7" | "V7";
  bass: number;        // midi
  voicing: number[];   // midi, ascending — a shell the student improvises over
  /** pitch classes of the chord, for lighting keys/frets */
  chordPcs: number[];
}

/** Spell the root a degree away from the key: IV = +3 letters/+5 semis, V = +4/+7. */
function degreeRoot(key: string, roman: "I7" | "IV7" | "V7"): Note {
  const t = parseNoteName(key);
  if (roman === "I7") return t;
  const [letters, semis] = roman === "IV7" ? [3, 5] : [4, 7];
  const s = spell(stepLetter(t.letter, letters), (pc(t) + semis) % 12, t.octave);
  if (!s) throw new Error(`${key} cannot spell its ${roman}`);
  return s;
}

/** A dominant 7th shell on a root: 3rd and ♭7 (+ root in the bass). */
function dom7(root: Note): { symbol: string; bass: number; voicing: number[]; chordPcs: number[] } {
  const r = midi(root);                       // root around octave 4
  const clamp = (m: number) => {
    let v = m;
    while (v < 55) v += 12;
    while (v > 84) v -= 12;
    return v;
  };
  const voicing = [...new Set([clamp(r + 4), clamp(r + 10), clamp(r + 16)])] // 3, b7, 10th
    .sort((a, b) => a - b);
  let bass = r - 24;
  while (bass < 36) bass += 12;
  const rootPc = pc(root);
  return {
    symbol: `${noteName(root)}7`,
    bass,
    voicing,
    chordPcs: [rootPc, (rootPc + 4) % 12, (rootPc + 7) % 12, (rootPc + 10) % 12],
  };
}

/** The form. Bar 2 becomes IV7 with the "quick change". Bar 12 is the V7 turnaround. */
const FORM: ("I7" | "IV7" | "V7")[] =
  ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"];

export function twelveBar(key: string, quickChange: boolean): BluesBar[] {
  const romans = [...FORM];
  if (quickChange) romans[1] = "IV7";
  return romans.map((roman, bar) => {
    const root = degreeRoot(key, roman);
    return { bar, roman, ...dom7(root) };
  });
}

/** What to play over it — the teaching text, computed per key so the names are real. */
export function bluesScales(key: string): { name: string; notes: string }[] {
  const t = parseNoteName(key);
  const rel = spell(stepLetter(t.letter, 5), (pc(t) + 9) % 12, t.octave); // the relative minor
  return [
    { name: `${key} minor blues`, notes: "works over the whole form — the classic sound" },
    { name: `${key} major blues`, notes: `same six notes as ${rel ? noteName(rel) : "?"} minor blues — sweeter, use on the I7` },
    { name: "mix them", notes: "major blues on the I, minor blues on the IV and V — the real vocabulary" },
  ];
}
