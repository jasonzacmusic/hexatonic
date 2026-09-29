/**
 * Chords that are inversions of each other (Jason, 28 Sep 2026).
 *
 * findChords already groups a scale's chords by their notes, so C6 and Am7 are
 * one ChordSet with two names. This module says it the way a player says it:
 * the lead name, then every other name as that chord over the lead's bass —
 *   C6 = Am7/C          (A C E G with C in the bass is C6)
 *   G+ = B+/G = D♯+/G   (one augmented chord, three roots)
 *   A°7 = C°7/A = E♭°7/A = F♯°7/A
 * The other roots are named as the scale names them (D♯ in G whole tone,
 * E♭ in G A♯ B D E♭ F♯), so no alias ever shows a C♭+ or a B♯°7 the scale
 * does not have. The lead name is left exactly as ownSpellingFirst chose it.
 */

import type { ChordSet } from "./chords";
import { Note, noteName, pc } from "./note";

/** ASCII symbol → display: ♭ ♯ + ° (Caug → C+, Bbdim7 → B♭°7, F#m7b5 → F♯m7♭5). */
export function prettyChord(sym: string): string {
  return sym
    .replace(/aug(?=\/|$)/g, "+").replace(/dim7/g, "°7").replace(/dim(?=\/|$)/g, "°")
    .replace(/([A-G])##/g, "$1𝄪").replace(/([A-G])bb/g, "$1𝄫")
    .replace(/([A-G])#/g, "$1♯").replace(/([A-G])b/g, "$1♭")
    .replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯");
}

export interface SameNotes {
  /** the lead name, ASCII ("C6", "Gaug") */
  lead: string;
  /** every other name, as that chord over the lead's bass, ASCII ("Am7/C") */
  others: string[];
}

/** Only tertian readings count (a sus2 that is also a sus4 is a different story). */
export function sameNotes(c: ChordSet, scale: Note[]): SameNotes {
  const lead = c.names[0];
  const scaleName = (p: number, fallback: string) => {
    const n = scale.find((x) => pc(x) === p);
    return n ? noteName(n) : fallback;
  };
  const up = (n: ChordSet["names"][number]) => (((pc(n.voicing[0]) - pc(lead.voicing[0])) % 12) + 12) % 12;
  /* the other roots in climbing order from the lead: G+ = B+/G = D♯+/G */
  const others = c.names.slice(1)
    .filter((n) => n.family === lead.family)
    .sort((a, b) => up(a) - up(b))
    .map((n) => {
      const suffix = n.symbol.slice(n.root.length);
      return `${scaleName(pc(n.voicing[0]), n.root)}${suffix}/${lead.root}`;
    });
  return { lead: lead.symbol, others };
}

/** "C6 = Am7/C", ready to show. */
export const sameNotesLine = (c: ChordSet, scale: Note[]) => {
  const s = sameNotes(c, scale);
  return [s.lead, ...s.others].map(prettyChord).join(" = ");
};
