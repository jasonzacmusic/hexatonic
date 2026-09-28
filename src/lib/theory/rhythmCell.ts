/**
 * Rhythm cells: one bar of 4/4 that a ladder or a scale plays through, one
 * chord (or note) per hit.
 *
 * Rhythm cell 1 is from Jason's board (Hexatonic series, board page 2):
 *
 *   beat 1: two eighths, beamed
 *   beat 2: dotted eighth + sixteenth, beamed
 *   beat 3: eighth rest + eighth
 *   beat 4: quarter note
 *
 * Counted in sixteenths from the downbeat, the hits are 0, 2, 4, 7, 10, 12:
 * six hits a bar, so the six notes of a hexatonic scale, or the twelve chords
 * of a pair ladder up and back, fill whole bars exactly.
 *
 * Pure: shared by the players, the notation and the tests.
 */

import type { Note } from "./note";

/** One slot of a cell, in sixteenths. */
export interface CellSlot {
  /** sixteenths from the downbeat */
  at: number;
  /** length in sixteenths */
  len: number;
  rest: boolean;
  /** VexFlow duration: "8", "8d", "16", "q" (a rest adds "r" when engraved) */
  vex: string;
}

export interface RhythmCell {
  id: string;
  label: string;
  /** sixteenths per bar (16 in 4/4) */
  bar: number;
  slots: CellSlot[];
}

export const RHYTHM_CELL_1: RhythmCell = {
  id: "cell1",
  label: "Rhythm cell 1",
  bar: 16,
  slots: [
    { at: 0, len: 2, rest: false, vex: "8" },
    { at: 2, len: 2, rest: false, vex: "8" },
    { at: 4, len: 3, rest: false, vex: "8d" },
    { at: 7, len: 1, rest: false, vex: "16" },
    { at: 8, len: 2, rest: true, vex: "8" },
    { at: 10, len: 2, rest: false, vex: "8" },
    { at: 12, len: 4, rest: false, vex: "q" },
  ],
};

/** How the material is laid out in time. */
export type RhythmMode =
  /** one chord per beat (the plain ladder) */
  | "straight"
  /** rhythm cell 1, every bar */
  | "cell1"
  /** rhythm cell 1 for a bar, then a bar with hands off (clap) */
  | "cell1-gap";

export const RHYTHM_MODES: { id: RhythmMode; label: string }[] = [
  { id: "straight", label: "one per beat" },
  { id: "cell1", label: "Rhythm cell 1" },
  { id: "cell1-gap", label: "cell 1 + gap" },
];

export const isRhythmMode = (x: string | null): x is RhythmMode =>
  RHYTHM_MODES.some((m) => m.id === x);

export const cellHits = (cell: RhythmCell): CellSlot[] => cell.slots.filter((s) => !s.rest);

/** A bar of hits in sixteenths, for the one-per-beat mode. */
const STRAIGHT: RhythmCell = {
  id: "straight", label: "one per beat", bar: 16,
  slots: [0, 4, 8, 12].map((at) => ({ at, len: 4, rest: false, vex: "q" })),
};

export const cellFor = (mode: RhythmMode): RhythmCell => (mode === "straight" ? STRAIGHT : RHYTHM_CELL_1);

/** One sixteenth of the laid-out music. */
export interface CellStep<T> {
  /** the item struck on this sixteenth, or null */
  hit: T | null;
  /** the item still sounding (struck on this or an earlier sixteenth of its slot) */
  holding: T | null;
  /** its index in the input list, or -1 */
  held: number;
  /** how many sixteenths the struck item lasts */
  len: number;
  /** index of the struck item in the input list, or -1 */
  item: number;
  /** a hands-off bar: clap */
  gap: boolean;
}

export interface CellLayout<T> {
  steps: CellStep<T>[];
  bars: number;
  /** per bar: the slots engraved, each with its item (null = rest), and whether it is a gap bar */
  engraving: { gap: boolean; slots: { slot: CellSlot; item: number }[] }[];
}

/**
 * Lay a list of items (chords or notes) on the cell, one per hit, in order.
 * The last bar is filled out with rests when the items run out. With the gap,
 * every played bar is followed by one silent bar.
 */
export function layOnCell<T>(items: T[], mode: RhythmMode): CellLayout<T> {
  const cell = cellFor(mode);
  const hits = cellHits(cell);
  const played = Math.max(1, Math.ceil(items.length / hits.length));
  const gap = mode === "cell1-gap";
  const steps: CellStep<T>[] = [];
  const engraving: CellLayout<T>["engraving"] = [];
  let next = 0;
  for (let b = 0; b < played; b++) {
    const bar: CellStep<T>[] = Array.from({ length: cell.bar }, () => ({
      hit: null, holding: null, held: -1, len: 0, item: -1, gap: false,
    }));
    const slots: { slot: CellSlot; item: number }[] = [];
    for (const slot of cell.slots) {
      if (slot.rest || next >= items.length) {
        slots.push({ slot, item: -1 });
        continue;
      }
      const i = next++;
      bar[slot.at] = { ...bar[slot.at], hit: items[i], len: slot.len, item: i };
      for (let k = 0; k < slot.len; k++) { bar[slot.at + k].holding = items[i]; bar[slot.at + k].held = i; }
      slots.push({ slot, item: i });
    }
    steps.push(...bar);
    engraving.push({ gap: false, slots });
    if (gap) {
      steps.push(...Array.from({ length: cell.bar }, () => ({
        hit: null, holding: null, held: -1, len: 0, item: -1, gap: true,
      })));
      engraving.push({ gap: true, slots: [] });
    }
  }
  return { steps, bars: engraving.length, engraving };
}

/** The scale up to its octave and back down, from the notes as spelled. */
export function upAndBack(scale: Note[]): Note[] {
  if (!scale.length) return [];
  const top = { ...scale[0], octave: scale[0].octave + 1 };
  return [...scale, top, ...scale.slice(1).reverse()];
}
