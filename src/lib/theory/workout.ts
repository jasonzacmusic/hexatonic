/**
 * The Workout engine: every way of getting to a six-note scale, and what each
 * one is related to.
 *
 *  1. KNOCK ONE OUT. Take a seven-note parent (major, natural minor, harmonic
 *     minor, melodic minor) and remove each degree in turn. 4 × 7 = 28
 *     hexatonics per key, each with its tritone count and its triads. The
 *     diatonic hexachord is just the two tritone-free rows of the major parent.
 *  2. IDENTITY. The same six notes carry several names — C major blues is
 *     A minor blues, C major no-4 is A minor no-♭6. `identify` lists them all.
 *  3. NEIGHBOURS. Two hexatonics that share five notes are one finger apart.
 *     That is the similarity that matters at the keyboard: it is the move you
 *     make to modulate, to recolour, or to hear a single note change.
 *  4. HARMONISATION. Which triads and sevenths live inside the scale, rooted on
 *     which degrees — built by real interval, never by skipping scale degrees
 *     (in a six-note scale "every other note" is not a third).
 *  5. THE BARRY HARRIS LENS. Which of the sixth-diminished scales contain the
 *     hexatonic, which notes are chord tones and which belong to the
 *     diminished, and the 6th/dim7 chord Barry would put under each note.
 *     There is still no six-note collection in Barry's system (see
 *     barryharris.ts). This is a relation computed between two systems, not a
 *     claim about what he taught.
 */

import { Note, midi, noteName, pc, primeForm, intervalVector, forteName } from "./note";
import { buildDiatonic, buildScale, FAMILIES, KEYS, DIATONIC_MODES } from "./scales";
import { findChords, ChordSet } from "./chords";
import { SIXTH_DIMINISHED, SixthFamily, buildSixthDim, harmonise } from "./barryharris";
import { encodeCustom } from "./custom";

/* ── pitch-class masks ─────────────────────────────────────────────────── */

export const maskOf = (pcs: number[]): number =>
  pcs.reduce((m, p) => m | (1 << ((((p % 12) + 12) % 12))), 0);
export const popcount = (m: number): number => {
  let c = 0;
  for (let x = m; x; x &= x - 1) c++;
  return c;
};
export const pcsOf = (m: number): number[] =>
  Array.from({ length: 12 }, (_, i) => i).filter((i) => m & (1 << i));

/** The KEYS spelling of a pitch class — the only tonics the drill URL accepts. */
export const keyForPc = (p: number): string =>
  KEYS.find((k) => pc(buildDiatonic(k, [0])![0]) === (((p % 12) + 12) % 12))!;

/* ── 1. knock one out ──────────────────────────────────────────────────── */

export interface ParentScale {
  id: string;
  name: string;
  semis: number[];
  degrees: string[];
  note: string;
}

export const PARENTS: ParentScale[] = [
  {
    id: "major", name: "Major", semis: [0, 2, 4, 5, 7, 9, 11],
    degrees: ["1", "2", "3", "4", "5", "6", "7"],
    note: "One tritone (4–7). Knock out either member and it is gone: those are the only two tritone-free rows.",
  },
  {
    id: "minor", name: "Natural minor", semis: [0, 2, 3, 5, 7, 8, 10],
    degrees: ["1", "2", "b3", "4", "5", "b6", "b7"],
    note: "The same seven notes as the relative major, so the same single tritone — here it is 2–♭6.",
  },
  {
    id: "harmonic", name: "Harmonic minor", semis: [0, 2, 3, 5, 7, 8, 11],
    degrees: ["1", "2", "b3", "4", "5", "b6", "7"],
    note: "Two tritones (2–♭6 and 4–7) that share no note. One removal can only kill one of them, so no row here is tritone-free.",
  },
  {
    id: "melodic", name: "Melodic minor", semis: [0, 2, 3, 5, 7, 9, 11],
    degrees: ["1", "2", "b3", "4", "5", "6", "7"],
    note: "Two tritones again (♭3–6 and 4–7), disjoint — every row keeps one. Removing the 4 or the 7 leaves the sweetest of them.",
  },
];

export const parentById = (id: string): ParentScale =>
  PARENTS.find((p) => p.id === id) ?? PARENTS[0];

export interface TriadCount { major: number; minor: number; dim: number; aug: number }

export interface KnockOutRow {
  parent: ParentScale;
  removedIndex: number;
  removedDegree: string;
  removedNote: Note;
  notes: Note[];
  degrees: string[];
  /** semitones above the PARENT tonic — the tonic itself is absent when removedIndex is 0 */
  semis: number[];
  tritones: number;
  intervalVector: number[];
  primeForm: number[];
  forte: string;
  triads: TriadCount;
  tertian: ChordSet[];
  hasThird: boolean;
  hasFifth: boolean;
  /** other names for the same six pitch classes, from the catalogue */
  names: string[];
  mask: number;
}

export function triadCount(chords: ChordSet[]): TriadCount {
  const t: TriadCount = { major: 0, minor: 0, dim: 0, aug: 0 };
  /* Count SETS, not readings: an augmented triad is symmetric and carries three
     root readings, but it is one triad under the hand. */
  for (const c of chords) {
    if (c.size !== 3 || c.primaryFamily !== "tertian") continue;
    const n = c.names[0];
    const q = n.symbol.slice(n.root.length);
    if (q === "") t.major++;
    else if (q === "m") t.minor++;
    else if (q === "dim") t.dim++;
    else if (q === "aug") t.aug++;
  }
  return t;
}

export function knockOut(tonic: string, parentId: string): KnockOutRow[] {
  const parent = parentById(parentId);
  const full = buildDiatonic(tonic, parent.semis);
  if (!full) return [];
  return full.map((removedNote, i) => {
    const notes = full.filter((_, j) => j !== i);
    const semis = parent.semis.filter((_, j) => j !== i);
    const degrees = parent.degrees.filter((_, j) => j !== i);
    const pcs = notes.map(pc);
    const iv = intervalVector(pcs);
    const tertian = findChords(notes, [3, 4]).filter((c) => c.primaryFamily === "tertian");
    const mask = maskOf(pcs);
    return {
      parent, removedIndex: i, removedDegree: parent.degrees[i], removedNote,
      notes, degrees, semis, tritones: iv[5], intervalVector: iv,
      primeForm: primeForm(pcs), forte: forteName(pcs),
      triads: triadCount(tertian), tertian,
      hasThird: semis.includes(3) || semis.includes(4),
      hasFifth: semis.includes(7),
      names: identify(mask).map((e) => e.name),
      mask,
    };
  });
}

/* ── 2. the catalogue, and identity ────────────────────────────────────── */

export interface CatalogEntry {
  mask: number;
  tonic: string;
  name: string;
  /** lower sorts first when several names share one set */
  rank: number;
  /** a /practice query string that loads this exact scale */
  practice: string;
}

const PRETTY = (s: string) => s.replace(/#/g, "♯").replace(/b/g, "♭");

let CATALOG: CatalogEntry[] | null = null;

/** Every named six-note scale in the app, in every key. Built once, lazily. */
export function catalog(): CatalogEntry[] {
  if (CATALOG) return CATALOG;
  const out: CatalogEntry[] = [];
  const seen = new Set<string>();
  const push = (e: CatalogEntry) => {
    const k = `${e.mask}|${e.name}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  FAMILIES.forEach((fam, famRank) => {
    if (fam.size !== 6 || fam.kind === "custom") return;
    const modes = fam.kind === "rotation" ? DIATONIC_MODES.map((m) => m.index) : [0];
    for (const k of KEYS) {
      for (const m of modes) {
        const s = buildScale(k, fam.id, m);
        if (s.error) continue;
        const tonic = noteName(s.notes[0]);
        const q = new URLSearchParams({ k, f: fam.id });
        if (fam.kind === "rotation") q.set("m", String(m));
        push({
          mask: maskOf(s.pcs), tonic,
          name: `${PRETTY(tonic)} ${fam.kind === "rotation" ? s.label : fam.short}`,
          rank: famRank * 10 + (fam.kind === "rotation" ? m : 0),
          practice: q.toString(),
        });
      }
    }
  });
  PARENTS.forEach((parent, pi) => {
    for (const k of KEYS) {
      const full = buildDiatonic(k, parent.semis);
      if (!full) continue;
      full.forEach((_, i) => {
        const notes = full.filter((__, j) => j !== i);
        push({
          mask: maskOf(notes.map(pc)), tonic: k,
          name: `${PRETTY(k)} ${parent.name.toLowerCase()} without ${PRETTY(parent.degrees[i])}`,
          rank: 1000 + pi * 10 + i,
          practice: practiceQuery(k, parent.semis.filter((__, j) => j !== i)),
        });
      });
    }
  });
  CATALOG = out;
  return out;
}

/** Every catalogued name for exactly this set, best-known first. */
export function identify(mask: number): CatalogEntry[] {
  return catalog().filter((e) => e.mask === mask).sort((a, b) => a.rank - b.rank);
}

/** A /practice query for any set, via the custom family. A set that has lost its
 *  tonic is re-rooted on its lowest note, because the drill always starts on 1. */
export function practiceQuery(tonic: string, semis: number[]): string {
  const tpc = pc(buildDiatonic(tonic, [0])![0]);
  let root = tpc;
  let rel = semis;
  if (!semis.includes(0)) {
    const low = Math.min(...semis);
    root = (tpc + low) % 12;
    rel = semis.map((s) => s - low);
  }
  return new URLSearchParams({ k: keyForPc(root), f: "custom", cs: encodeCustom(rel) }).toString();
}

/* ── 3. neighbours — one note apart ────────────────────────────────────── */

export interface Neighbour {
  mask: number;
  /** the pitch class you let go of, and the one you take instead */
  drop: number;
  add: number;
  /** semitone distance of the move, 1..6 — a semitone nudge is the smoothest */
  move: number;
  names: CatalogEntry[];
}

export function neighbours(mask: number): Neighbour[] {
  const byMask = new Map<number, CatalogEntry[]>();
  for (const e of catalog()) {
    if (e.mask === mask || popcount(e.mask) !== popcount(mask)) continue;
    if (popcount(e.mask & mask) !== popcount(mask) - 1) continue;
    const list = byMask.get(e.mask) ?? [];
    list.push(e);
    byMask.set(e.mask, list);
  }
  const out: Neighbour[] = [];
  for (const [m, names] of byMask) {
    const drop = pcsOf(mask & ~m)[0];
    const add = pcsOf(m & ~mask)[0];
    const d = (((add - drop) % 12) + 12) % 12;
    out.push({ mask: m, drop, add, move: Math.min(d, 12 - d), names: names.sort((a, b) => a.rank - b.rank) });
  }
  return out.sort((a, b) => a.move - b.move || a.names[0].rank - b.names[0].rank);
}

/** Notes two sets share — the fingers that do not move. */
export const commonTones = (a: number, b: number): number[] => pcsOf(a & b);

/* ── 4. harmonisation ──────────────────────────────────────────────────── */

const ROLE: Record<number, string> = {
  0: "root", 3: "3rd", 4: "3rd", 6: "5th", 7: "5th", 8: "5th", 9: "6th", 10: "7th", 11: "7th",
};

export interface DegreeHarmony {
  note: Note;
  /** tertian triads and sevenths ROOTED on this note */
  rooted: string[];
  /** every tertian chord in the scale that CONTAINS this note, with its role —
   *  the list you choose from to harmonise it as a melody note */
  under: { symbol: string; role: string; voicing: number[] }[];
}

export function harmonizeDegrees(notes: Note[]): DegreeHarmony[] {
  const chords = findChords(notes, [3, 4]).filter((c) => c.primaryFamily === "tertian");
  return notes.map((n) => {
    const p = pc(n);
    const rooted: string[] = [];
    const under: DegreeHarmony["under"] = [];
    for (const c of chords) {
      if (!c.pcs.includes(p)) continue;
      for (const name of c.names) {
        if (name.family !== "tertian") continue;
        const rootPc = pc(name.voicing[0]);
        if (rootPc === p) rooted.push(name.symbol);
      }
      const primary = c.names[0];
      const rel = (((p - pc(primary.voicing[0])) % 12) + 12) % 12;
      /* Voice it with the melody note on top: everything else drops below it. */
      const top = midi(n);
      const below = primary.voicing
        .filter((v) => pc(v) !== p)
        .map((v) => { let m = midi(v); while (m >= top) m -= 12; while (m < top - 12) m += 12; return m; })
        .sort((a, b) => a - b);
      under.push({ symbol: c.names.map((x) => x.symbol).join(" = "), role: ROLE[rel] ?? "?", voicing: [...below, top] });
    }
    return { note: n, rooted, under };
  });
}

/* ── 5. the Barry Harris lens ──────────────────────────────────────────── */

export interface BarryContainer {
  root: string;
  family: SixthFamily;
  familyName: string;
  chordSymbol: string;
  /** hexatonic notes that are tones of the parent 6th/7th chord */
  chordTones: string[];
  /** hexatonic notes that belong to the related diminished 7th */
  dimTones: string[];
  /** the same diminished tones as pitch classes, ascending */
  dimPcs: number[];
  /** the two scale notes the hexatonic leaves out */
  missing: string[];
  /** four-part voicing for each hexatonic note as the melody: chord or dim7 */
  melody: { note: string; label: string; isDiminished: boolean; voicing: number[] }[];
}

export function barryLens(notes: Note[]): BarryContainer[] {
  const mask = maskOf(notes.map(pc));
  const hexPcs = new Set(notes.map(pc));
  const out: BarryContainer[] = [];
  for (const def of SIXTH_DIMINISHED) {
    for (const k of KEYS) {
      let scale: Note[];
      try { scale = buildSixthDim(k, def.id); } catch { continue; }
      const smask = maskOf(scale.map(pc));
      if ((smask & mask) !== mask) continue;
      const rootPc = pc(scale[0]);
      const chordPcs = new Set(def.chord.map((s) => (rootPc + s) % 12));
      const named = (pred: (n: Note) => boolean) =>
        scale.filter((n) => hexPcs.has(pc(n)) && pred(n)).map(noteName);
      const steps = harmonise(k, def.id);
      const melody = scale.filter((n) => hexPcs.has(pc(n))).map((n) => {
        const step = steps.find((s) => pc(s.notes[3]) === pc(n)) ?? steps[0];
        return {
          note: noteName(n), label: step.label, isDiminished: step.isDiminished,
          voicing: step.voicing,
        };
      });
      out.push({
        root: noteName(scale[0]), family: def.id, familyName: def.name,
        chordSymbol: `${noteName(scale[0])}${def.chordName}`,
        chordTones: named((n) => chordPcs.has(pc(n))),
        dimTones: named((n) => !chordPcs.has(pc(n))),
        dimPcs: [...hexPcs].filter((p) => !chordPcs.has(p)).sort((a, b) => a - b),
        missing: scale.filter((n) => !hexPcs.has(pc(n))).map(noteName),
        melody,
      });
    }
  }
  return out;
}
