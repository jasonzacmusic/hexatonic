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

import { Note, pc, spell, stepLetter, noteName, parseNoteName } from "./note";
import { voiceLead } from "./vamps";
import { FUNCTION_LABEL, HarmonicFunction } from "./functions";

export interface BluesBar {
  /** which bar of the form, 0-11 */
  bar: number;
  symbol: string;      // e.g. "C7"
  roman: "I7" | "IV7" | "V7";
  bass: number;        // midi
  voicing: number[];   // midi, ascending — 3rd, 5th and ♭7, voice-led bar to bar
  /** pitch classes of the chord, for lighting keys/frets */
  chordPcs: number[];
  /** the walking bass for this bar, one note per beat */
  walk: number[];
  fn: HarmonicFunction;
  fnLabel: string;
}

/** The line the page prints about the blues, as a rule. */
export const BLUES_RULE =
  "The blues uses I7, IV7 and V7, which step outside the scale on purpose; that rub is the blues sound.";

/** Spell the root a degree away from the key: IV = +3 letters/+5 semis, V = +4/+7. */
function degreeRoot(key: string, roman: "I7" | "IV7" | "V7"): Note {
  const t = parseNoteName(key);
  if (roman === "I7") return t;
  const [letters, semis] = roman === "IV7" ? [3, 5] : [4, 7];
  const s = spell(stepLetter(t.letter, letters), (pc(t) + semis) % 12, t.octave);
  if (!s) throw new Error(`${key} cannot spell its ${roman}`);
  return s;
}

const FN: Record<BluesBar["roman"], HarmonicFunction> = { I7: "tonic", IV7: "predominant", V7: "dominant" };

/** The form. Bar 2 becomes IV7 with the "quick change". Bar 12 is the V7 turnaround. */
const FORM: ("I7" | "IV7" | "V7")[] =
  ["I7", "I7", "I7", "I7", "IV7", "IV7", "I7", "I7", "V7", "IV7", "I7", "V7"];

/**
 * The twelve bars, with the chords voice-led: each bar plays the 3rd, 5th and
 * ♭7 of its chord (the bass has the root), placed as close as possible to the
 * bar before, so C7 to F7 moves E–B♭ to E♭–A by a half step each. The bass
 * walks 1–3–5–6 in each bar and, when the chord is about to change, steps to
 * the new root by a half step.
 */
export function twelveBar(key: string, quickChange: boolean): BluesBar[] {
  const romans = [...FORM];
  if (quickChange) romans[1] = "IV7";
  let prev: number[] | null = null;
  const bars: BluesBar[] = romans.map((roman, bar) => {
    const root = degreeRoot(key, roman);
    const rootPc = pc(root);
    const chordPcs = [rootPc, (rootPc + 4) % 12, (rootPc + 7) % 12, (rootPc + 10) % 12];
    const voicing = voiceLead(chordPcs.slice(1), prev, 55, 76);
    prev = voicing;
    const bass = 36 + rootPc;
    return {
      bar, roman, symbol: `${noteName(root)}7`, bass, voicing, chordPcs,
      walk: [bass, bass + 4, bass + 7, bass + 9], fn: FN[roman], fnLabel: FUNCTION_LABEL[FN[roman]],
    };
  });
  /* A change coming: the bass walks toward the new root, the short way, and
     reaches it by a half step. In G: G7 → C7 walks G F E C♯ | C, and
     C7 → G7 walks C E F F♯ | G. */
  bars.forEach((b, i) => {
    const next = bars[(i + 1) % bars.length];
    if (next.symbol === b.symbol) return;
    const r = b.bass, n = next.bass, d = n - r;
    b.walk =
      d <= -3 ? [r, r - 2, r - 3, n + 1]
      : d < 0 ? [r, r - 3, r - 5, n - 1]
      : d === 7 ? [r, r + 4, r + 5, n - 1]
      : d === 5 ? [r, r + 4, r + 7, n + 1]
      : [r, r + 4, r + 7, n - 1];
  });
  return bars;
}

/** What to play over it — computed per key so the names are real. */
export function bluesScales(key: string): { name: string; notes: string }[] {
  const t = parseNoteName(key);
  const rel = spell(stepLetter(t.letter, 5), (pc(t) + 9) % 12, t.octave); // the relative minor
  return [
    { name: `${key} minor blues`, notes: "works over the whole form" },
    { name: `${key} major blues`, notes: `the same six notes as ${rel ? noteName(rel) : "?"} minor blues, and sweeter` },
  ];
}

/** The distinct chords of the form whose four notes all sit inside the scale.
 *  For both blues scales, in every key, this is empty — which is the point. */
export function chordsInsideScale(scalePcs: number[], bars: BluesBar[]): string[] {
  const have = new Set(scalePcs);
  return [...new Set(bars.filter((b) => b.chordPcs.every((p) => have.has(p))).map((b) => b.symbol))];
}

/** The blues note to lean on: the scale's ♭3 against the I7's major 3rd. */
export function bluesTip(key: string, scalePcs: number[]): string {
  const t = parseNoteName(key);
  const minor3 = spell(stepLetter(t.letter, 2), (pc(t) + 3) % 12);
  const major3 = spell(stepLetter(t.letter, 2), (pc(t) + 4) % 12);
  const p = (n: Note | null) => (n ? noteName(n).replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯") : "?");
  const hasMinor3 = scalePcs.includes((pc(t) + 3) % 12);
  return hasMinor3
    ? `Lean on ${p(minor3)} against the ${p(t)}7's ${p(major3)}, then slide up to ${p(major3)} or down to ${p(t)}: that one rub is the whole style.`
    : `Land on ${p(t)} at the top of each 4-bar line and answer yourself in the next.`;
}
