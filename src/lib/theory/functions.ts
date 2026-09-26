/**
 * What a chord DOES in the scale: its Roman numeral and its harmonic function
 * (tonic, pre-dominant, dominant), measured from the scale's first note.
 *
 * The function groups follow common-practice teaching:
 *   Tonic:        I / i, iii / ♭III, vi / ♭VI   (home and its substitutes)
 *   Pre-dominant: ii / ii°, IV / iv, ♭II        (lead away from home)
 *   Dominant:     V / v, vii°, ♭VII             (pull back home; ♭VII is the
 *                                                 modal stand-in for V)
 * The mediant and submediant are tonic substitutes here because they share
 * two notes with the tonic triad.
 */

import { letterIndex, Note, pc } from "./note";

export type HarmonicFunction = "tonic" | "predominant" | "dominant";

export const FUNCTION_LABEL: Record<HarmonicFunction, string> = {
  tonic: "Tonic",
  predominant: "Pre-dominant",
  dominant: "Dominant",
};

export const FUNCTION_LINE: Record<HarmonicFunction, string> = {
  tonic: "Home. Rest here.",
  predominant: "Moves away from home, toward the dominant.",
  dominant: "Pulls back to home.",
};

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
/** Major-scale semitones for each degree, the yardstick for ♭ and ♯. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export type TriadQuality = "maj" | "min" | "dim" | "aug";

export function triadQuality(root: Note, third: Note, fifth: Note): TriadQuality {
  const t = (pc(third) - pc(root) + 12) % 12;
  const f = (pc(fifth) - pc(root) + 12) % 12;
  if (t === 4 && f === 7) return "maj";
  if (t === 3 && f === 7) return "min";
  if (t === 3 && f === 6) return "dim";
  return "aug";
}

/** Roman numeral for a triad rooted on `root` in a scale whose first note is `tonic`. */
export function romanNumeral(tonic: Note, root: Note, quality: TriadQuality): string {
  const deg = (letterIndex(root.letter) - letterIndex(tonic.letter) + 7) % 7;
  const semis = (pc(root) - pc(tonic) + 12) % 12;
  const diff = ((semis - MAJOR[deg] + 18) % 12) - 6;
  const acc = diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff);
  const base = NUMERALS[deg];
  const n = quality === "min" || quality === "dim" ? base.toLowerCase() : base;
  return acc + n + (quality === "dim" ? "°" : quality === "aug" ? "+" : "");
}

/** Harmonic function from the scale degree the chord is built on. */
export function harmonicFunction(tonic: Note, root: Note): HarmonicFunction {
  const deg = (letterIndex(root.letter) - letterIndex(tonic.letter) + 7) % 7;
  // 1st, 3rd, 6th degrees: tonic family. 2nd, 4th: pre-dominant. 5th, 7th: dominant.
  return deg === 0 || deg === 2 || deg === 5 ? "tonic" : deg === 1 || deg === 3 ? "predominant" : "dominant";
}
