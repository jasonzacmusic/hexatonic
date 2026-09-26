/**
 * A chord is a PITCH-CLASS SET carrying a LIST of names — never one root + one
 * quality. Am7 and C6 are not two chords that sound alike; they are one object
 * seen from two angles, and the UI must be able to flip between the readings.
 *
 * This is the most important data-model decision in the harmony module and also
 * the most valuable teaching moment in the app.
 */

import { intervalName, Letter, letterIndex, LETTERS, midi, Note, note, noteName, pc, spell, stepLetter } from "./note";

type Family = "tertian" | "sus" | "quartal";

const TRIADS: Record<string, [string, Family]> = {
  "0,4,7": ["", "tertian"],
  "0,3,7": ["m", "tertian"],
  "0,3,6": ["dim", "tertian"],
  "0,4,8": ["aug", "tertian"],
  "0,2,7": ["sus2", "sus"],
  "0,5,7": ["sus4", "sus"],
  "0,5,10": ["quartal", "quartal"],
};

const TETRADS: Record<string, [string, Family]> = {
  "0,4,7,11": ["maj7", "tertian"],
  "0,4,7,10": ["7", "tertian"],
  "0,3,7,10": ["m7", "tertian"],
  "0,3,6,10": ["m7b5", "tertian"],
  "0,3,6,9": ["dim7", "tertian"],
  "0,4,7,9": ["6", "tertian"],
  "0,3,7,9": ["m6", "tertian"],
  "0,4,8,11": ["maj7#5", "tertian"],
  "0,3,7,11": ["mMaj7", "tertian"],
  "0,2,7,10": ["7sus2", "sus"],
  "0,5,7,10": ["7sus4", "sus"],
  "0,2,5,7": ["quartal4", "quartal"],
};


/** How many letter names above the root each chord tone sits. A chord is
 *  spelled from its own root (a minor third is always two letters up), not
 *  borrowed from the scale — so G♭ A D♭ is named F♯m, never "G♭m". */
function letterSteps(suffix: string, iv: number): number {
  if (iv === 0) return 0;
  if (iv === 1 || iv === 2) return 1;
  if (iv === 3 || iv === 4) return 2;
  if (iv === 5) return 3;
  if (iv === 6) return suffix.startsWith("sus") || suffix.startsWith("quartal") ? 3 : 4;
  if (iv === 7 || iv === 8) return 4;
  if (iv === 9) return suffix === "dim7" ? 6 : 5;
  return 6;
}

/** Spell every tone from a root letter; null if any tone needs a double accidental. */
function spellFrom(rootLetter: Letter, rootPc: number, ivs: number[], suffix: string): Note[] | null {
  const out: Note[] = [];
  for (const iv of ivs) {
    const n = spell(stepLetter(rootLetter, letterSteps(suffix, iv)), (rootPc + iv) % 12);
    if (!n || Math.abs(n.alt) > 1) return null;
    out.push(n);
  }
  return out;
}

/** The scale's own spelling if it is a correct stack; otherwise the enharmonic
 *  root that spells cleanly (F♯m rather than G♭m with a B𝄫). */
function chordSpelling(rootNote: Note, ivs: number[], suffix: string): Note[] | null {
  // Diminished chords keep the scale's letters (C°7 is C E♭ G♭ A, not B♯°7).
  if (suffix === "dim" || suffix === "dim7") return null;
  const rp = pc(rootNote);
  const own = spellFrom(rootNote.letter, rp, ivs, suffix);
  if (own) return own;
  for (const L of LETTERS) {
    const r = spell(L as Letter, rp);
    if (!r || Math.abs(r.alt) > 1 || r.letter === rootNote.letter) continue;
    const alt = spellFrom(r.letter, rp, ivs, suffix);
    if (alt) return alt;
  }
  return null;
}

const FAMILY_RANK: Record<Family, number> = { tertian: 0, sus: 1, quartal: 2 };

export interface ChordName {
  symbol: string;
  root: string;
  family: Family;
  notes: string[];
  /** Close-position voicing above this reading's root, used for playback. */
  voicing: Note[];
}

export interface ChordSet {
  size: 3 | 4;
  pcs: number[];
  notes: Note[];
  noteNames: string[];
  names: ChordName[];
  primaryFamily: Family;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = [];
  const walk = (start: number, cur: T[]) => {
    if (cur.length === k) { res.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) { cur.push(arr[i]); walk(i + 1, cur); cur.pop(); }
  };
  walk(0, []);
  return res;
}

/** Every chord fully contained in the scale, grouped by pitch-class SET. */
export function findChords(scaleNotes: Note[], sizes: (3 | 4)[] = [3, 4]): ChordSet[] {
  const byPc = new Map<number, Note>();
  for (const n of scaleNotes) if (!byPc.has(pc(n))) byPc.set(pc(n), n);
  const pcs = [...byPc.keys()].sort((a, b) => a - b);
  const out: ChordSet[] = [];

  for (const size of sizes) {
    const table = size === 3 ? TRIADS : TETRADS;
    for (const set of combinations(pcs, size)) {
      const names: ChordName[] = [];
      for (const root of set) {
        const iv = set.map((p) => (((p - root) % 12) + 12) % 12).sort((a, b) => a - b).join(",");
        const hit = table[iv];
        if (!hit) continue;
        const [suffix, family] = hit;
        const rootNote = byPc.get(root)!;
        const ordered = [...set].sort(
          (a, b) => ((((a - root) % 12) + 12) % 12) - ((((b - root) % 12) + 12) % 12)
        );
        const voicing: Note[] = [];
        let previousMidi = -Infinity;
        for (const pitchClass of ordered) {
          const source = byPc.get(pitchClass)!;
          let voiced = note(source.letter, source.alt, source.octave);
          while (midi(voiced) <= previousMidi)
            voiced = note(voiced.letter, voiced.alt, voiced.octave + 1);
          voicing.push(voiced);
          previousMidi = midi(voiced);
        }
        const ivs = ordered.map((p) => (((p - root) % 12) + 12) % 12);
        const spelled = chordSpelling(rootNote, ivs, suffix);
        const scaleSpelled = spelled?.every((n, k) => noteName(n) === noteName(byPc.get(ordered[k])!));
        // Respell the voicing only when the scale's own letters don't stack.
        if (spelled && !scaleSpelled) spelled.forEach((n, k) => {
          voicing[k] = note(n.letter, n.alt, voicing[k].octave + Math.round((midi(voicing[k]) - midi(note(n.letter, n.alt, voicing[k].octave))) / 12));
        });
        const r = spelled ? spelled[0] : rootNote;
        names.push({
          symbol: noteName(r) + suffix,
          root: noteName(r),
          family,
          notes: spelled ? spelled.map(noteName) : ordered.map((p) => noteName(byPc.get(p)!)),
          voicing,
        });
      }
      if (!names.length) continue;
      names.sort((a, b) => FAMILY_RANK[a.family] - FAMILY_RANK[b.family]);
      out.push({
        size,
        pcs: set,
        notes: names[0].voicing,
        noteNames: names[0].notes,
        names,
        primaryFamily: names[0].family,
      });
    }
  }
  out.sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size;
    if (a.primaryFamily !== b.primaryFamily)
      return FAMILY_RANK[a.primaryFamily] - FAMILY_RANK[b.primaryFamily];
    return a.pcs[0] - b.pcs[0];
  });
  return out;
}

export const tertianOnly = (cs: ChordSet[]) => cs.filter((c) => c.primaryFamily === "tertian");
export const susQuartal = (cs: ChordSet[]) => cs.filter((c) => c.primaryFamily !== "tertian");

/* ── triad pairs (the jazz route in) ─────────────────────────────────────── */

const TRIAD_SHAPES: Record<string, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
};

/** Two triads with no shared notes generate a hexatonic.
 *  VALIDATION RULE: for two MAJOR triads this is only possible at a semitone,
 *  a whole step, or a tritone. C major + Eb major share G — five notes, not six. */
export function triadPair(
  rootA: number, qualA: keyof typeof TRIAD_SHAPES,
  rootB: number, qualB: keyof typeof TRIAD_SHAPES
): number[] | null {
  const a = new Set(TRIAD_SHAPES[qualA].map((i) => (rootA + i) % 12));
  const b = new Set(TRIAD_SHAPES[qualB].map((i) => (rootB + i) % 12));
  for (const x of a) if (b.has(x)) return null;
  return [...new Set([...a, ...b])].sort((x, y) => x - y);
}

/** The augmented-triad parity rule — complete, and provable in two lines.
 *  Same parity → whole-tone (6-35). Opposite parity → augmented hexatonic (6-20).
 *  No other outcome is possible. */
export function augmentedPair(a: 0 | 1 | 2 | 3, b: 0 | 1 | 2 | 3): {
  pcs: number[]; result: "whole-tone" | "augmented";
} {
  const t = (r: number) => [r % 12, (r + 4) % 12, (r + 8) % 12];
  const pcs = [...new Set([...t(a), ...t(b)])].sort((x, y) => x - y);
  return { pcs, result: a % 2 === b % 2 ? "whole-tone" : "augmented" };
}

/* ── what goes under each note ───────────────────────────────────────────── */

const ROLE: Record<number, string> = {
  0: "root", 3: "3rd", 4: "3rd", 6: "5th", 7: "5th", 8: "5th", 9: "6th", 10: "7th", 11: "7th",
};

export interface NoteHarmony {
  note: Note;
  /** tertian chords rooted on this note */
  rooted: string[];
  /** every tertian chord of the scale containing this note, voiced with it on top */
  under: { symbol: string; role: string; voicing: number[] }[];
}

/** For each scale note: every chord built only from the scale's own notes that
 *  contains it, with the note's job in that chord and a voicing that puts the
 *  note on top — the way you harmonise a melody. */
export function chordsUnderEachNote(notes: Note[]): NoteHarmony[] {
  const chords = tertianOnly(findChords(notes, [3, 4]));
  return notes.map((n) => {
    const p = pc(n);
    const rooted: string[] = [];
    const under: NoteHarmony["under"] = [];
    for (const c of chords) {
      if (!c.pcs.includes(p)) continue;
      for (const name of c.names)
        if (name.family === "tertian" && pc(name.voicing[0]) === p) rooted.push(name.symbol);
      const primary = c.names[0];
      const rel = (((p - pc(primary.voicing[0])) % 12) + 12) % 12;
      const top = midi(n);
      const below = primary.voicing
        .filter((v) => pc(v) !== p)
        .map((v) => { let m = midi(v); while (m >= top) m -= 12; while (m < top - 12) m += 12; return m; })
        .sort((a, b) => a - b);
      under.push({
        symbol: c.names.map((x) => x.symbol).join(" = "),
        role: ROLE[rel] ?? "?",
        voicing: [...below, top],
      });
    }
    return { note: n, rooted, under };
  });
}

/* ── the whole scale as one chord ───────────────────────────────────────── */

export interface ThirdsStack {
  /** the notes bottom to top, with octaves */
  notes: Note[];
  /** the gap between each neighbouring pair, by interval name (M3, m3, P4…) */
  gaps: string[];
  /** how many of those gaps are thirds */
  thirds: number;
  /** each note's place in the chain 1 3 5 7 9 11 13, with ♭/♯ — only when the
   *  scale can be stacked purely by letter; otherwise empty */
  degrees: string[];
  /** the links of 1 3 5 7 9 11 13 the scale does not have ("11") */
  missing: string[];
}

const CHAIN = ["1", "3", "5", "7", "9", "11", "13"];
const CHAIN_SEMIS = [0, 4, 7, 11, 2, 5, 9];

/**
 * Stack the scale in thirds from its tonic. Where the letters allow it this is
 * exact — 1 3 5 7 9 11 13, keeping the ones the scale has. A scale that uses a
 * letter twice (the blues ♭5 and 5) cannot be stacked purely by letter, so it
 * is stacked by ear instead: the nearest note a third above, or the nearest
 * note of any kind when no third is left. The gaps are reported, so nothing is
 * claimed that the stack does not show.
 */
export function stackInThirds(scale: Note[]): ThirdsStack {
  if (!scale.length) return { notes: [], gaps: [], thirds: 0, degrees: [], missing: [] };
  const t = scale[0];
  const letters = new Set(scale.map((n) => n.letter));
  let order: Note[];
  const degrees: string[] = [];
  const missing: string[] = [];
  if (letters.size === scale.length) {
    const offset = (n: Note) => (((letterIndex(n.letter) - letterIndex(t.letter)) % 7) + 7) % 7;
    order = [];
    [0, 2, 4, 6, 1, 3, 5].forEach((o, i) => {
      const n = scale.find((x) => offset(x) === o);
      if (!n) { missing.push(CHAIN[i]); return; }
      order.push(n);
      const d = (((pc(n) - pc(t) - CHAIN_SEMIS[i]) % 12) + 18) % 12 - 6;
      degrees.push((d < 0 ? "♭".repeat(-d) : "♯".repeat(d)) + CHAIN[i]);
    });
  } else {
    order = [t];
    const left = scale.slice(1);
    while (left.length) {
      const top = order[order.length - 1];
      const up = (n: Note) => (((pc(n) - pc(top)) % 12) + 12) % 12;
      let i = left.findIndex((n) => up(n) === 3 || up(n) === 4);
      if (i < 0) i = left.reduce((b, n, j) => (up(n) < up(left[b]) ? j : b), 0);
      order.push(left.splice(i, 1)[0]);
    }
  }
  const out: Note[] = [];
  let prev = -Infinity;
  for (const n of order) {
    let v = note(n.letter, n.alt, t.octave);
    while (midi(v) <= prev) v = note(v.letter, v.alt, v.octave + 1);
    out.push(v);
    prev = midi(v);
  }
  const gaps = out.slice(1).map((n, i) => intervalName(out[i], n));
  return { notes: out, gaps, thirds: gaps.filter((g) => g === "m3" || g === "M3").length, degrees, missing };
}

/* ── what the removed note took with it ─────────────────────────────────── */

/** Triads of the seven-note parent that the six-note scale no longer has. */
export function lostTriads(parent: Note[], scale: Note[]): ChordSet[] {
  const have = new Set(tertianOnly(findChords(scale, [3])).map((c) => c.pcs.join(",")));
  return tertianOnly(findChords(parent, [3])).filter((c) => !have.has(c.pcs.join(",")));
}

/* ── which triad pairs make a given six-note set ─────────────────────────── */

export type TriadQuality = "maj" | "min" | "dim" | "aug";

export interface TriadPairCover {
  a: { root: number; qual: TriadQuality };
  b: { root: number; qual: TriadQuality };
}

/** Every pair of triads (no shared note) whose six notes are exactly `pcs`. */
export function triadPairsCovering(pcs: number[]): TriadPairCover[] {
  const target = [...new Set(pcs.map((p) => ((p % 12) + 12) % 12))].sort((a, b) => a - b).join(",");
  const quals: TriadQuality[] = ["maj", "min", "dim", "aug"];
  const triads: { root: number; qual: TriadQuality }[] = [];
  const seen = new Set<string>();
  for (const qual of quals)
    for (let root = 0; root < 12; root++) {
      const k = TRIAD_SHAPES[qual].map((i) => (root + i) % 12).sort((a, b) => a - b).join(",");
      if (seen.has(k)) continue;           // C+ = E+ = G♯+: one triad, not three
      seen.add(k);
      triads.push({ root, qual });
    }
  const out: TriadPairCover[] = [];
  for (let i = 0; i < triads.length; i++)
    for (let j = i + 1; j < triads.length; j++) {
      const pair = triadPair(triads[i].root, triads[i].qual, triads[j].root, triads[j].qual);
      if (pair && pair.join(",") === target) out.push({ a: triads[i], b: triads[j] });
    }
  return out;
}
