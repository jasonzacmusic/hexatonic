/**
 * One short tune per sound, written for the ear games.
 *
 * A scale run tells you the notes; a tune tells you the COLOUR. Each phrase
 * starts and ends on the tonic, uses every one of the sound's notes (so it
 * can never be mistaken for another six-note set), moves mostly by step, and
 * leans on the note that gives the sound its colour: the tell is held longer
 * and falls on a strong beat.
 *
 * A phrase is a list of [semitones above the tonic, length in steps]. One step
 * is a gentle eighth note. The blues sounds are swung.
 * tests/ear.test.ts checks every rule above.
 */

export type PhraseNote = readonly [semi: number, steps: number];

export const PHRASES: Record<string, readonly PhraseNote[]> = {
  /* bright: up through the 3 to the 7, which leans into the octave */
  "maj-no4": [[0, 1], [4, 1], [7, 1], [9, 1], [11, 1], [12, 2], [11, 1], [9, 1], [7, 1], [4, 2], [2, 1], [0, 3]],
  /* sunny, like a folk song: tops out on the 6 and never reaches a 7 */
  folk: [[0, 1], [4, 1], [5, 1], [7, 1], [9, 2], [7, 1], [5, 1], [4, 1], [2, 1], [4, 1], [0, 3]],
  /* the 4 sits where a 3rd would be, and is held there */
  sus: [[0, 1], [2, 1], [5, 2], [7, 1], [10, 1], [9, 1], [7, 1], [5, 2], [2, 1], [0, 3]],
  /* soft minor: the ♭3 is held on the way up and on the way home */
  "min-no6": [[0, 1], [3, 1], [5, 1], [7, 1], [10, 2], [7, 1], [5, 1], [3, 2], [2, 1], [0, 3]],
  /* the ♭6 leans down onto the 5, twice */
  dark: [[0, 1], [3, 1], [5, 1], [7, 1], [8, 2], [7, 1], [10, 1], [8, 1], [7, 1], [5, 1], [3, 1], [0, 3]],
  /* the ♭2 hangs just above the tonic; there is no 5th to land on */
  unstable: [[0, 1], [1, 2], [0, 1], [3, 1], [5, 1], [8, 2], [10, 1], [8, 1], [5, 1], [3, 1], [1, 2], [0, 3]],
  /* dominant: the 3 and the ♭7 */
  mixo: [[0, 1], [4, 1], [7, 1], [9, 1], [10, 2], [9, 1], [7, 1], [4, 2], [2, 1], [0, 3]],
  /* the classic lick: ♭5 squeezed between the 4 and the 5 */
  blues: [[0, 1], [3, 1], [5, 1], [6, 1], [7, 2], [10, 1], [7, 1], [6, 1], [5, 1], [3, 1], [0, 3]],
  /* the ♭3 slides into the 3 */
  "blues-major": [[0, 1], [2, 1], [3, 1], [4, 2], [7, 1], [9, 1], [7, 1], [4, 1], [3, 1], [2, 1], [0, 3]],
  /* an augmented triad, then whole steps floating down */
  whole: [[0, 1], [4, 1], [8, 2], [6, 1], [10, 1], [12, 2], [8, 1], [6, 1], [4, 1], [2, 1], [0, 3]],
  /* the two augmented triads a half step apart */
  aug: [[0, 1], [4, 1], [8, 1], [12, 2], [11, 1], [7, 1], [3, 2], [4, 1], [0, 3]],
  /* whole steps up to the ♯4, then the 6 and ♭7 side by side */
  prometheus: [[0, 1], [2, 1], [4, 1], [6, 2], [9, 1], [10, 2], [9, 1], [6, 1], [4, 1], [2, 1], [0, 3]],
  /* koto: each half step (2 to ♭3, 5 to ♭6) then a leap */
  hirajoshi: [[0, 1], [2, 1], [3, 1], [7, 2], [8, 2], [7, 1], [3, 1], [2, 1], [0, 3]],
  /* the ♭2 hangs over the tonic; no 3rd, a bare 4 and 5 */
  insen: [[0, 1], [1, 2], [5, 1], [7, 2], [10, 1], [7, 1], [5, 1], [1, 2], [0, 3]],
};

/** Swung: the second eighth of each pair lands late, two-to-one. */
export const SWUNG = new Set(["blues", "blues-major"]);

/** Where a step position falls in time, in steps. Straight, or swung 2:1. */
export function stepTime(pos: number, swing: boolean): number {
  if (!swing) return pos;
  const pair = Math.floor(pos / 2) * 2;
  const off = pos - pair;
  return pair + (off >= 1 ? 4 / 3 + (off - 1) * (2 / 3) : off * (4 / 3));
}
