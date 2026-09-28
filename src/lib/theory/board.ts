/**
 * The board layer: what Jason draws on the class board, computed.
 *
 *   · the circle of fifths, and the four augmented triads that make its star;
 *   · the interval between each pair of neighbouring notes (augmented: the
 *     3-and-1 semitone steps), named from the notes as SPELLED;
 *   · the major-third arcs of the whole-tone scale, drawn only where the
 *     spelling really is a major third.
 *
 * Nothing here is typed in by hand; tests/board.test.ts checks it in all keys.
 */

import { Note, pc, spell, stepLetter, intervalName, notePretty, parseNoteName } from "./note";

const mod12 = (v: number) => ((v % 12) + 12) % 12;

/** Where a note sits on the circle of fifths, in slots clockwise from the tonic. */
export const fifthsSlot = (rel: number) => mod12(rel * 7);

/* ── the four augmented triads ────────────────────────────────────────── */

/** Each triangle, by pitch class, with the root used when the scale does not
 *  spell it: C E G♯, G B D♯, D F♯ A♯, A C♯ E♯. */
const TRIANGLES: { pcs: number[]; root: string }[] = [
  { pcs: [0, 4, 8], root: "C" },
  { pcs: [7, 11, 3], root: "G" },
  { pcs: [2, 6, 10], root: "D" },
  { pcs: [9, 1, 5], root: "A" },
];

export interface AugTriangle {
  /** 0–3, fixed per triangle, so each keeps its own colour in every key */
  index: number;
  pcs: number[];
  /** all three notes are in the scale */
  inScale: boolean;
  /** the triad spelled root, major 3rd, augmented 5th: "G B D♯" */
  notes: Note[];
  name: string;
  /** For a triangle in the scale: 0 for the one on the tonic, then in the
   *  order the scale reaches them. -1 when not in the scale. */
  order: number;
  /** Notes the chord spells differently from the scale, e.g. E♯ written F. */
  written: { chord: Note; scale: Note }[];
}

const hasDouble = (ns: Note[]) => ns.some((n) => Math.abs(n.alt) >= 2);

/** The same pitch on a neighbouring letter, with at most one accidental. */
function respell(n: Note): Note | null {
  for (const k of [1, -1]) {
    const s = spell(stepLetter(n.letter, k), pc(n));
    if (s && Math.abs(s.alt) <= 1) return s;
  }
  return null;
}

/** An augmented triad on `root`, spelled in thirds (root, +2 letters, +4 letters). */
export function augTriad(root: Note): Note[] | null {
  const r = pc(root);
  const third = spell(stepLetter(root.letter, 2), mod12(r + 4));
  const fifth = spell(stepLetter(root.letter, 4), mod12(r + 8));
  return third && fifth ? [root, third, fifth] : null;
}

/**
 * The four augmented triangles, each marked as in the scale or not.
 *
 * A triangle in the scale is named as a chord on its lowest note above the
 * tonic, so the tonic's own triangle comes first and is named from the tonic
 * (G augmented: G B D♯ then B♭ D F♯; G whole tone: G B D♯ then A C♯ E♯).
 * When that root would need a double sharp or flat it is respelled (A♯+ is
 * written B♭+). Where the chord spells a note differently from the scale it
 * says so: in G whole tone, A C♯ E♯ has its E♯ written F in the scale.
 */
export function augTriangles(scale: Note[]): AugTriangle[] {
  const have = new Map(scale.map((n) => [pc(n), n]));
  const tonicPc = scale.length ? pc(scale[0]) : 0;
  const up = (p: number) => mod12(p - tonicPc);
  const inside = TRIANGLES.map((t) => t.pcs.every((p) => have.has(p)));
  const lowest = TRIANGLES.map((t) => Math.min(...t.pcs.map(up)));
  const ranked = TRIANGLES.map((_, i) => i).filter((i) => inside[i]).sort((x, y) => lowest[x] - lowest[y]);

  return TRIANGLES.map((t, index) => {
    const inScale = inside[index];
    let notes: Note[] | null = null;
    if (inScale) {
      const rootPc = t.pcs.find((p) => up(p) === lowest[index])!;
      const root = have.get(rootPc)!;
      notes = augTriad(root);
      if (!notes || hasDouble(notes)) {
        const alt = respell(root);
        const again = alt ? augTriad(alt) : null;
        if (again && !hasDouble(again)) notes = again;
      }
    }
    notes ??= augTriad(parseNoteName(t.root))!;
    const written = inScale
      ? notes.filter((n) => have.get(pc(n))!.letter !== n.letter).map((n) => ({ chord: n, scale: have.get(pc(n))! }))
      : [];
    return {
      index, pcs: t.pcs, inScale, notes, name: notes.map(notePretty).join(" "),
      order: ranked.indexOf(index), written,
    };
  });
}

/* ── intervals between notes ──────────────────────────────────────────── */

/** "A2" → "aug2", "d4" → "dim4": the way it is said in class. */
export const sayInterval = (iv: string) =>
  iv.startsWith("A") ? `aug${iv.slice(1)}` : iv.startsWith("d") ? `dim${iv.slice(1)}` : iv;

export interface Step {
  from: number;
  to: number;
  /** named from the spelling: m2, aug2, m3 … */
  name: string;
  semis: number;
}

/** The interval from each note to the next, in the order given (no wrap). */
export function steps(notes: Note[]): Step[] {
  const out: Step[] = [];
  for (let i = 0; i + 1 < notes.length; i++)
    out.push({
      from: i, to: i + 1,
      name: sayInterval(intervalName(notes[i], notes[i + 1])),
      semis: mod12(pc(notes[i + 1]) - pc(notes[i])),
    });
  return out;
}

/** Arcs over every other note that is spelled as a major third. */
export function majorThirdArcs(notes: Note[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i + 2 < notes.length; i++)
    if (intervalName(notes[i], notes[i + 2]) === "M3") out.push({ from: i, to: i + 2 });
  return out;
}

/** The interval from the first note to each note, as written on page 3 of the
 *  board (M2, P4, ♭7 …). */
export function fromTonic(notes: Note[]): string[] {
  return notes.map((n, i) => (i === 0 ? "1" : sayInterval(intervalName(notes[0], n))));
}

export type BoardStyle = "degrees" | "steps" | "thirds";

/**
 * Which picture tells this scale's story. The whole-tone scale is all major
 * seconds, so its story is the major thirds they make; the augmented scale
 * alternates 3 and 1 semitones, so its story is the steps; everything else
 * reads best as intervals from the tonic.
 */
export function boardStyle(notes: Note[]): BoardStyle {
  if (notes.length !== 6) return "degrees";
  const s = notes.map((n, i) => mod12(pc(notes[(i + 1) % 6]) - pc(n)));
  if (s.every((x) => x === 2)) return "thirds";
  const alt = s.every((x, i) => x === s[i % 2]) && ((s[0] === 3 && s[1] === 1) || (s[0] === 1 && s[1] === 3));
  return alt ? "steps" : "degrees";
}
