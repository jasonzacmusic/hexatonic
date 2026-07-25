/**
 * A chord is a PITCH-CLASS SET carrying a LIST of names — never one root + one
 * quality. Am7 and C6 are not two chords that sound alike; they are one object
 * seen from two angles, and the UI must be able to flip between the readings.
 *
 * This is the most important data-model decision in the harmony module and also
 * the most valuable teaching moment in the app.
 */

import { midi, Note, note, noteName, pc } from "./note";

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
        names.push({
          symbol: noteName(rootNote) + suffix,
          root: noteName(rootNote),
          family,
          notes: ordered.map((p) => noteName(byPc.get(p)!)),
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
