/**
 * The sixth–diminished SYSTEM of Barry Harris, step by step.
 *
 * barryharris.ts spells the four eight-note scales. This file builds the
 * exercises a player works through with them, in the order they are taught:
 *
 *   a. the eight-note scale
 *   b. the harmonised scale: melody on top, the 6th chord under its own four
 *      notes (1 3 5 6), the diminished 7th under the other four (2 4 ♭6 7)
 *   c. the same line in close, drop 2, drop 3 and drop 2 & 4
 *   d. the 6th chord's four inversions, joined by the diminished between them
 *   e. borrowing: one note of the 6th chord swapped for its neighbour from the
 *      diminished, which makes maj7, 6/9, maj9 and their cousins
 *   f. the family: one diminished 7th, four names, four parent chords
 *
 * Every chord symbol here is READ from the notes (tetradName), never declared
 * next to them, so a wrong note cannot hide behind a right name.
 */

import {
  buildSixthDim, sixthDimById, SixthFamily, SIXTH_DIMINISHED,
} from "./barryharris";
import {
  Letter, LETTER_PC, midi, Note, note, noteName, parseNoteName, pc, stepLetter,
} from "./note";

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const FAMILY_ORDER: SixthFamily[] = ["major6", "minor6", "dominant7", "dominant7b5"];

/** The names Jason uses in class, and the degree formula of each scale. */
export const FAMILY_INFO: Record<SixthFamily, { name: string; short: string; degrees: string[]; suffix: string }> = {
  major6: { name: "Major 6th diminished", short: "Major 6", degrees: ["1", "2", "3", "4", "5", "b6", "6", "7"], suffix: "6" },
  minor6: { name: "Minor 6th diminished", short: "Minor 6", degrees: ["1", "2", "b3", "4", "5", "b6", "6", "7"], suffix: "m6" },
  dominant7: { name: "Dominant 7th diminished", short: "Dominant 7", degrees: ["1", "2", "3", "4", "5", "b6", "b7", "7"], suffix: "7" },
  dominant7b5: { name: "Dominant 7th ♭5 diminished", short: "7♭5", degrees: ["1", "2", "3", "4", "b5", "b6", "b7", "7"], suffix: "7b5" },
};

/* ── roots ──────────────────────────────────────────────────────────────── */

/** One name per pitch class. The minor family reads C♯ and G♯ (the keys a
 *  player knows) where the others read D♭ and A♭; D♭ minor would need F♭ as
 *  its third. */
const ROOT_NAMES: Record<SixthFamily, string[]> = {
  major6: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  minor6: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"],
  dominant7: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
  dominant7b5: ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
};

/** The twelve roots for a family, chromatic from C. */
export const barryRoots = (f: SixthFamily) => ROOT_NAMES[f];

/** The family's name for a pitch class. */
export const rootFor = (p: number, f: SixthFamily) => ROOT_NAMES[f][mod(p, 12)];

/** Carry a root across families: G stays G, D♭ becomes C♯ for the minor. */
export const sameRoot = (root: string, f: SixthFamily) => rootFor(pc(parseNoteName(root)), f);

/** All twelve roots, starting at `root` and climbing in fourths (C F B♭ E♭…),
 *  the order jazz players take a new idea round the keys. */
export function rootsByFourths(root: string, f: SixthFamily): string[] {
  const p = pc(parseNoteName(root));
  return Array.from({ length: 12 }, (_, i) => rootFor(p + 5 * i, f));
}

/** The key signature the staff uses: the root's own major key, and for the
 *  minor family the relative major (G minor → B♭). */
export function keySignatureFor(root: string, f: SixthFamily): string {
  const p = pc(parseNoteName(root)) + (f === "minor6" ? 3 : 0);
  return ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"][mod(p, 12)];
}

/* ── naming chords from their notes ─────────────────────────────────────── */

/** Four-note chords read from a root: interval set → suffix. The rootless
 *  entries are what borrowing produces (the bass or the left hand has the root). */
const TETRADS: Record<string, string> = {
  "0,4,7,11": "maj7", "0,4,7,10": "7", "0,3,7,10": "m7", "0,3,6,10": "m7b5",
  "0,3,6,9": "dim7", "0,4,7,9": "6", "0,3,7,9": "m6", "0,3,7,11": "m(maj7)",
  "0,4,6,10": "7b5", "0,4,8,10": "7#5", "0,4,8,11": "maj7#5",
};
const ROOTLESS: Record<string, string> = {
  "2,4,7,9": "6/9", "2,4,7,11": "maj9", "2,3,7,9": "m6/9", "2,3,7,11": "m(maj9)",
  "2,4,7,10": "9", "2,4,8,10": "9#5", "2,4,6,10": "9b5",
};

const intervalKey = (ns: Note[], rootPc: number) =>
  [...new Set(ns.map((n) => mod(pc(n) - rootPc, 12)))].sort((a, b) => a - b).join(",");

/** The chord's name read from `root`, or null when these notes are not one of
 *  the shapes above. `rootless` is true when the root itself is absent. */
export function tetradName(ns: Note[], root: Note): { symbol: string; rootless: boolean } | null {
  const k = intervalKey(ns, pc(root));
  if (TETRADS[k]) return { symbol: noteName(root) + TETRADS[k], rootless: false };
  if (ROOTLESS[k]) return { symbol: noteName(root) + ROOTLESS[k], rootless: true };
  return null;
}

/** A diminished 7th ordered from whichever of its notes stacks in thirds by
 *  letter, trying `prefer` first: B D F A♭ reads from B, D♯ F♯ A C from D♯. */
export function dimInThirds(ns: Note[], prefer: Note | null = null): Note[] {
  const order = prefer ? [prefer, ...ns.filter((n) => pc(n) !== pc(prefer))] : ns;
  for (const r of order) {
    const want = [0, 2, 4, 6].map((k) => stepLetter(r.letter, k));
    const found = want.map((L) => ns.find((n) => n.letter === L));
    if (found.every(Boolean)) return found as Note[];
  }
  return [...ns].sort((a, b) => mod(pc(a) - pc(order[0]), 12) - mod(pc(b) - pc(order[0]), 12));
}

/* ── a. the scale ──────────────────────────────────────────────────────── */

export interface BarryScale {
  root: Note;
  family: SixthFamily;
  /** eight notes, ascending from the root */
  notes: Note[];
  /** the four notes of the 6th (or 7th) chord, root first */
  chord: Note[];
  /** the diminished 7th, stacked in thirds from its own root */
  dim: Note[];
  chordSymbol: string;
  dimSymbol: string;
  /** the same four notes as the parent chord, read from its 6th:
   *  G6 = Em7, Gm6 = Em7♭5. Null for the two dominant families. */
  relative: string | null;
}

export function barryScale(root: string, f: SixthFamily, octave = 4): BarryScale {
  const notes = buildSixthDim(root, f, octave);
  const def = sixthDimById(f);
  const chord = [0, 2, 4, 6].map((i) => notes[i]);
  /* Barry builds the diminished on the 7th degree, the note a semitone below
     the root: F♯°7 in G, G°7 in A♭. Its notes are listed upwards from there. */
  const dim = [7, 1, 3, 5].map((i) => notes[i]);
  const r = notes[0];
  let relative: string | null = null;
  if (f === "major6" || f === "minor6") relative = tetradName(chord, notes[6])?.symbol ?? null;
  return {
    root: r, family: f, notes, chord, dim,
    chordSymbol: noteName(r) + def.chordName.replace("♭", "b"),
    dimSymbol: noteName(dim[0]) + "dim7",
    relative,
  };
}

/** Scale note k steps from the root, any octave: k = 8 is the root an octave up. */
function at(s: Note[], k: number): Note {
  const n = s[mod(k, 8)];
  return note(n.letter, n.alt, n.octave + Math.floor(k / 8));
}

/* ── b. the harmonised scale ────────────────────────────────────────────── */

export interface SystemChord {
  /** ascending */
  notes: Note[];
  /** the melody note (top of the close voicing) */
  top: Note;
  isDiminished: boolean;
  /** ASCII symbol: "G6", "F#dim7", "Gmaj7" */
  symbol: string;
  rootless: boolean;
  /** scale index 0–7 of the note the chord is built on (melody, or bass on the ladder) */
  degree: number;
  /** "root position", "1st inversion" … on the ladder */
  label?: string;
  /** what borrowing changed, "E→F♯" style ASCII: "E->F#" */
  change?: string;
}

/**
 * Melody on top, up one octave: nine chords, root to root. Each chord is the
 * melody note and the three scale notes found by skipping every other note
 * downwards, so the eight notes split cleanly into the parent chord (under
 * 1 3 5 6) and the diminished (under 2 4 ♭6 7), in strict alternation.
 */
export function harmonisedScale(root: string, f: SixthFamily, octave = 4): SystemChord[] {
  const bs = barryScale(root, f, octave);
  const s = bs.notes;
  return Array.from({ length: 9 }, (_, m) => {
    const notes = [at(s, m - 6), at(s, m - 4), at(s, m - 2), at(s, m)];
    const isDim = m % 2 === 1;
    return {
      notes, top: notes[3], isDiminished: isDim, rootless: false,
      symbol: isDim ? bs.dimSymbol : bs.chordSymbol, degree: m % 8,
    };
  });
}

/* ── c. voicings ───────────────────────────────────────────────────────── */

export type VoicingKind = "close" | "drop2" | "drop3" | "drop24";

export const VOICINGS: { id: VoicingKind; label: string; says: string }[] = [
  { id: "close", label: "Close", says: "All four notes inside one octave, melody on top." },
  { id: "drop2", label: "Drop 2", says: "The second note from the top drops an octave." },
  { id: "drop3", label: "Drop 3", says: "The third note from the top drops an octave." },
  { id: "drop24", label: "Drop 2 & 4", says: "The second and fourth notes from the top drop an octave." },
];

const down = (n: Note) => note(n.letter, n.alt, n.octave - 1);

/** Voice a four-note close-position chord. Voices are counted from the TOP:
 *  in C E G A (melody A), the second from the top is G, the third E, the
 *  fourth C. Returned ascending; the melody never moves. */
export function voice(close: Note[], kind: VoicingKind): Note[] {
  if (close.length !== 4) throw new Error("a drop voicing needs four notes");
  const [n4, n3, n2, top] = [...close].sort((a, b) => midi(a) - midi(b));
  const out =
    kind === "close" ? [n4, n3, n2, top]
    : kind === "drop2" ? [down(n2), n4, n3, top]
    : kind === "drop3" ? [down(n3), n4, n2, top]
    : [down(n4), down(n2), n3, top];
  return out.sort((a, b) => midi(a) - midi(b));
}

/* ── d. the inversion ladder ────────────────────────────────────────────── */

const INVERSION = ["root position", "1st inversion", "2nd inversion", "3rd inversion"];

/**
 * The parent chord through its four inversions and back to root position an
 * octave up, with the diminished between each pair: nine close-position
 * chords, the BASS climbing the scale. Every voice moves up one scale step.
 */
export function inversionLadder(root: string, f: SixthFamily, octave = 3): SystemChord[] {
  const bs = barryScale(root, f, octave);
  const s = bs.notes;
  return Array.from({ length: 9 }, (_, d) => {
    const notes = [at(s, d), at(s, d + 2), at(s, d + 4), at(s, d + 6)];
    const isDim = d % 2 === 1;
    const bass = notes[0];
    return {
      notes, top: notes[3], isDiminished: isDim, rootless: false, degree: d % 8,
      symbol: isDim ? bs.dimSymbol
        : d % 8 === 0 ? bs.chordSymbol : `${bs.chordSymbol}/${noteName(bass)}`,
      label: isDim ? "diminished between" : INVERSION[(d % 8) / 2],
    };
  });
}

/* ── e. borrowing ──────────────────────────────────────────────────────── */

export interface BorrowDef {
  id: string;
  /** semitones above the root: each note that moves, and where it moves to */
  swaps: [number, number][];
}

/** Each swap lifts a chord tone to the scale note just above it, which is a
 *  note of the diminished. One swap, or two. */
export const BORROWINGS: Record<SixthFamily, BorrowDef[]> = {
  major6: [
    { id: "maj7", swaps: [[9, 11]] },          // 6 → 7
    { id: "6/9", swaps: [[0, 2]] },            // 1 → 9
    { id: "maj9", swaps: [[0, 2], [9, 11]] },  // both
  ],
  minor6: [
    { id: "m(maj7)", swaps: [[9, 11]] },
    { id: "m6/9", swaps: [[0, 2]] },
    { id: "m(maj9)", swaps: [[0, 2], [9, 11]] },
  ],
  dominant7: [
    { id: "9", swaps: [[0, 2]] },              // 1 → 9
    { id: "7#5", swaps: [[7, 8]] },            // 5 → ♯5
    { id: "9#5", swaps: [[0, 2], [7, 8]] },
  ],
  dominant7b5: [
    { id: "9b5", swaps: [[0, 2]] },            // 1 → 9
    { id: "7#5", swaps: [[6, 8]] },            // ♭5 → ♯5
    { id: "9#5", swaps: [[0, 2], [6, 8]] },
  ],
};

export interface Borrowed {
  id: string;
  /** the parent chord with the swaps applied, root position, ascending */
  notes: Note[];
  symbol: string;
  rootless: boolean;
  /** each swap as [from, to] */
  moves: [Note, Note][];
}

/** One borrowing on the parent chord in root position, named from its notes. */
export function borrowedChord(root: string, f: SixthFamily, id: string, octave = 4): Borrowed {
  const bs = barryScale(root, f, octave);
  const def = BORROWINGS[f].find((b) => b.id === id);
  if (!def) throw new Error(`${f} has no borrowing ${id}`);
  const s = bs.notes;
  const rp = pc(bs.root);
  const moves: [Note, Note][] = [];
  let notes = [...bs.chord];
  for (const [from, to] of def.swaps) {
    const i = s.findIndex((n) => mod(pc(n) - rp, 12) === from);
    const j = s.findIndex((n) => mod(pc(n) - rp, 12) === to);
    if (i < 0 || j !== i + 1) throw new Error(`${f} ${id}: ${from}→${to} is not a step up the scale`);
    moves.push([s[i], s[j]]);
    notes = notes.map((n) => (pc(n) === pc(s[i]) ? s[j] : n));
  }
  notes.sort((a, b) => midi(a) - midi(b));
  const name = tetradName(notes, bs.root)!;
  return { id, notes, symbol: name.symbol, rootless: name.rootless, moves };
}

/**
 * The harmonised scale with one borrowing applied to every parent chord. The
 * melody note never moves: when the note to swap IS the melody, that swap is
 * skipped and the chord is named for what it then is.
 */
export function harmonisedWithBorrowing(root: string, f: SixthFamily, id: string, octave = 4): SystemChord[] {
  const bs = barryScale(root, f, octave);
  const def = BORROWINGS[f].find((b) => b.id === id);
  const base = harmonisedScale(root, f, octave);
  if (!def) return base;
  const s = bs.notes;
  const rp = pc(bs.root);
  return base.map((c) => {
    if (c.isDiminished) return c;
    let notes = [...c.notes];
    const changes: string[] = [];
    for (const [from, to] of def.swaps) {
      const k = notes.findIndex((n) => mod(pc(n) - rp, 12) === from);
      if (k < 0 || k === 3) continue;                   // the melody stays put
      const i = s.findIndex((n) => pc(n) === pc(notes[k]));
      const next = s[i + 1];
      /* The next scale note up, directly above the note it replaces. */
      let v = note(next.letter, next.alt, notes[k].octave);
      while (midi(v) <= midi(notes[k])) v = note(v.letter, v.alt, v.octave + 1);
      while (midi(v) - midi(notes[k]) > 2) v = note(v.letter, v.alt, v.octave - 1);
      changes.push(`${noteName(notes[k])}->${noteName(v)}`);
      notes[k] = v;
    }
    notes = notes.sort((a, b) => midi(a) - midi(b));
    const name = changes.length ? tetradName(notes, bs.root) : null;
    return name
      ? { ...c, notes, top: notes[3], symbol: name.symbol, rootless: name.rootless, change: changes.join(", ") }
      : c;
  });
}

/* ── f. the family ─────────────────────────────────────────────────────── */

export interface FamilyMember {
  /** the diminished, named from one of its notes */
  dim: Note[];
  dimSymbol: string;
  /** the parent chord a semitone above that note */
  parent: Note[];
  parentSymbol: string;
  parentRoot: string;
  /** the dominant 7th that is the same diminished with one note lowered a
   *  semitone, and resolves to the same parent */
  dominant: Note[];
  dominantSymbol: string;
  /** the note of the diminished that drops to make that dominant */
  lowered: [Note, Note];
  /** the resolution, close position: the diminished, then every voice up one
   *  scale step into the parent */
  resolution: [Note[], Note[]];
}

/**
 * One diminished 7th has four notes, so four names, and each name resolves up
 * a semitone to its own parent chord. The four parents sit a minor third
 * apart: F♯°7 (A°7, C°7, D♯°7) → G6, B♭6, D♭6, E6.
 */
export function diminishedFamily(root: string, f: SixthFamily): FamilyMember[] {
  const home = pc(parseNoteName(root));
  return [0, 3, 6, 9].map((k) => {
    const pr = rootFor(home + k, f);
    const bs = barryScale(pr, f, 4);
    const ladder = inversionLadder(pr, f, 3);
    const five = spellAbove(bs.root, 4, 7);
    const dominant = [five, spellAbove(five, 2, 4), spellAbove(five, 4, 7), spellAbove(five, 6, 10)];
    /* The dim note a semitone above the dominant's root is the one lowered. */
    const loweredFrom = bs.dim.find((n) => mod(pc(n) - pc(five), 12) === 1)!;
    return {
      dim: bs.dim.map((n) => n),
      dimSymbol: bs.dimSymbol,
      parent: bs.chord,
      parentSymbol: bs.chordSymbol,
      parentRoot: pr,
      dominant,
      dominantSymbol: noteName(five) + "7",
      lowered: [loweredFrom, five],
      resolution: [ladder[7].notes, ladder[8].notes],
    };
  });
}

/** A note `letters` letters and `semis` semitones above `n`, respelled to a
 *  neighbouring letter if that would need a double accidental. */
function spellAbove(n: Note, letters: number, semis: number): Note {
  const target = midi(n) + semis;
  for (const d of [0, -1, 1]) {
    const L = stepLetter(n.letter, letters + d) as Letter;
    let alt = mod(target - LETTER_PC[L], 12);
    if (alt > 6) alt -= 12;
    if (Math.abs(alt) >= 2) continue;
    return note(L, alt as Note["alt"], (target - LETTER_PC[L] - alt) / 12 - 1);
  }
  throw new Error("cannot spell");
}

/* ── two chords, eight notes ────────────────────────────────────────────── */

export interface TetradPair {
  a: { notes: Note[]; symbol: string; also: string[] };
  b: { notes: Note[]; symbol: string; also: string[] };
}

/** Every reading of four notes as one of the TETRADS shapes, e.g. C E G A is
 *  C6 and Am7. Diminished 7ths read from their first-listed root only. */
function readings(ns: Note[]): { root: Note; symbol: string; suffix: string }[] {
  const out: { root: Note; symbol: string; suffix: string }[] = [];
  for (const r of ns) {
    const k = intervalKey(ns, pc(r));
    if (TETRADS[k]) out.push({ root: r, symbol: noteName(r) + TETRADS[k], suffix: TETRADS[k] });
  }
  return out;
}

/** Which reading to lead with: 6th and 7th chords before their relatives. */
const PREFERENCE = ["dim7", "6", "m6", "7", "maj7", "7b5", "m7", "m7b5", "m(maj7)", "7#5", "maj7#5"];

/**
 * Every way to split an eight-note collection into two four-note chords that
 * share no note. `notes` supplies the spelling. Barry's four scales each split
 * into their 6th (or 7th) chord and a diminished 7th; the octatonic splits
 * into two diminished 7ths, and more besides.
 */
export function tetradPairsCovering(notes: Note[]): TetradPair[] {
  const byPc = new Map<number, Note>();
  for (const n of notes) if (!byPc.has(pc(n))) byPc.set(pc(n), n);
  const pcs = [...byPc.keys()].sort((a, b) => a - b);
  if (pcs.length !== 8) return [];
  const out: TetradPair[] = [];
  const first = pcs[0];
  const rest = pcs.slice(1);
  /* Choose the three partners of the lowest note; the other four are the second chord. */
  for (let i = 0; i < rest.length; i++)
    for (let j = i + 1; j < rest.length; j++)
      for (let k = j + 1; k < rest.length; k++) {
        const A = [first, rest[i], rest[j], rest[k]];
        const B = pcs.filter((p) => !A.includes(p));
        const na = A.map((p) => byPc.get(p)!);
        const nb = B.map((p) => byPc.get(p)!);
        const ra = readings(na), rb = readings(nb);
        if (!ra.length || !rb.length) continue;
        const best = (rs: typeof ra) =>
          [...rs].sort((x, y) => PREFERENCE.indexOf(x.suffix) - PREFERENCE.indexOf(y.suffix));
        const sa = best(ra), sb = best(rb);
        const pack = (ns: Note[], rs: typeof ra) => {
          const r = rs[0].root;
          const ordered = [...ns].sort((x, y) => mod(pc(x) - pc(r), 12) - mod(pc(y) - pc(r), 12));
          const dimNotes = rs[0].suffix === "dim7" ? dimInThirds(ns, r) : null;
          return {
            notes: dimNotes ?? ordered,
            symbol: dimNotes ? noteName(dimNotes[0]) + "dim7" : rs[0].symbol,
            also: rs.slice(1).filter((x) => x.suffix !== "dim7").map((x) => x.symbol),
          };
        };
        const pa = pack(na, sa), pb = pack(nb, sb);
        /* Lead with the more common chord. */
        const rank = (rs: typeof ra) => PREFERENCE.indexOf(rs[0].suffix);
        out.push(rank(sa) <= rank(sb) ? { a: pa, b: pb } : { a: pb, b: pa });
      }
  return out;
}

/** Barry's own split of one of his scales: the parent chord and the diminished. */
export function barrySplit(root: string, f: SixthFamily): TetradPair {
  const bs = barryScale(root, f);
  return {
    a: { notes: bs.chord, symbol: bs.chordSymbol, also: bs.relative ? [bs.relative] : [] },
    b: { notes: bs.dim, symbol: bs.dimSymbol, also: [] },
  };
}

/** The bebop dominant scale (1 2 3 4 5 6 ♭7 7), spelled from Barry's dominant
 *  scale with its ♭6 raised to 6 — the scale his is so often confused with. */
export function bebopDominant(root: string): Note[] {
  const dom = buildSixthDim(root, "dominant7");
  const six = buildSixthDim(root, "major6")[6];
  return dom.map((n, i) => (i === 5 ? six : n));
}

export { SIXTH_DIMINISHED };
