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
}

const cost = (ns: Note[]) => ns.reduce((a, n) => a + Math.abs(n.alt) * (Math.abs(n.alt) === 2 ? 50 : 1), 0);

/** An augmented triad on `root`, spelled in thirds (root, +2 letters, +4 letters). */
export function augTriad(root: Note): Note[] | null {
  const r = pc(root);
  const third = spell(stepLetter(root.letter, 2), mod12(r + 4));
  const fifth = spell(stepLetter(root.letter, 4), mod12(r + 8));
  return third && fifth ? [root, third, fifth] : null;
}

/** The four augmented triangles, each marked as in the scale or not. When it
 *  is in the scale it is spelled from the scale's own notes, choosing the root
 *  that needs the fewest accidentals (the tonic wins a tie). */
export function augTriangles(scale: Note[]): AugTriangle[] {
  const have = new Map(scale.map((n) => [pc(n), n]));
  const tonicPc = scale.length ? pc(scale[0]) : -1;
  return TRIANGLES.map((t, index) => {
    const inScale = t.pcs.every((p) => have.has(p));
    let best: Note[] | null = null;
    let bestCost = Infinity;
    if (inScale) {
      for (const p of t.pcs) {
        const tri = augTriad(have.get(p)!);
        if (!tri) continue;
        /* a note written differently from the scale costs most: the triangle
           should read in the scale's own letters */
        const mismatch = tri.filter((n) => { const h = have.get(pc(n))!; return h.letter !== n.letter; }).length;
        const c = mismatch * 10 + cost(tri) - (p === tonicPc ? 0.5 : 0);
        if (c < bestCost) { best = tri; bestCost = c; }
      }
    }
    const notes = best ?? augTriad(parseNoteName(t.root))!;
    return { index, pcs: t.pcs, inScale, notes, name: notes.map(notePretty).join(" ") };
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
