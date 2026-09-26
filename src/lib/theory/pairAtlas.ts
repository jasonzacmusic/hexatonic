/**
 * Two-triad pairs, computed from a scale — never typed in.
 *
 * Two triads that share no note make six notes. The Harmony tab finds them two
 * ways, and both stay inside a real scale:
 *
 *   1. From a seven-note PARENT (the seven modes, harmonic and melodic minor).
 *      Build the triad on every degree. Only NEIGHBOURING triads can be
 *      disjoint (degrees d, d+2, d+4 against d+1, d+3, d+5), so a parent has
 *      exactly seven pairs, and each one leaves out one note: the degree just
 *      below the first chord. Every note is spelled from the parent, one letter
 *      per degree, so every triad is spelled in thirds for free.
 *
 *   2. From every SIX-NOTE scale the app has. Search all 4 × 12 major, minor,
 *      diminished and augmented triads for pairs that share nothing and cover
 *      exactly the six notes. Some scales split once, the augmented scale four
 *      ways, and some not at all (the blues needs a sus chord).
 *
 * Then either pair runs as Jason's inversion ladder: shape A in root position,
 * shape B above it, shape A in first inversion, and so on up to shape A an
 * octave higher, every voice moving to the next note of the six.
 */

import { TriadQuality, triadPairsCovering } from "./chords";
import {
  enharmonicTonic, Letter, LETTER_PC, LETTERS, letterIndex, midi, note, Note, notePretty,
  noteName, pc, spell, stepLetter,
} from "./note";
import {
  buildDiatonic, buildScale, DIATONIC_MODES, FAMILIES, FamilyGroup, HARMONIC_MINOR, MAJOR,
  MELODIC_MINOR,
} from "./scales";

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/* ── the parent scales ─────────────────────────────────────────────────── */

export type ParentId =
  | "ionian" | "dorian" | "phrygian" | "lydian" | "mixolydian" | "aeolian" | "locrian"
  | "harmonic" | "melodic";

export interface ParentDef {
  id: ParentId;
  /** the name a player reads, e.g. "Major" */
  name: string;
  /** the modal name, when it differs, e.g. "Ionian" */
  mode: string | null;
  semis: number[];
}

export const PARENTS: ParentDef[] = [
  { id: "ionian", name: "Major", mode: "Ionian", semis: MAJOR },
  { id: "dorian", name: "Dorian", mode: null, semis: [0, 2, 3, 5, 7, 9, 10] },
  { id: "phrygian", name: "Phrygian", mode: null, semis: [0, 1, 3, 5, 7, 8, 10] },
  { id: "lydian", name: "Lydian", mode: null, semis: [0, 2, 4, 6, 7, 9, 11] },
  { id: "mixolydian", name: "Mixolydian", mode: null, semis: [0, 2, 4, 5, 7, 9, 10] },
  { id: "aeolian", name: "Minor", mode: "Aeolian", semis: [0, 2, 3, 5, 7, 8, 10] },
  { id: "locrian", name: "Locrian", mode: null, semis: [0, 1, 3, 5, 6, 8, 10] },
  { id: "harmonic", name: "Harmonic minor", mode: null, semis: HARMONIC_MINOR },
  { id: "melodic", name: "Melodic minor", mode: null, semis: MELODIC_MINOR },
];

export const parentById = (id: string): ParentDef => PARENTS.find((p) => p.id === id) ?? PARENTS[0];

/** "G major", "G Dorian", "G harmonic minor". */
export function parentInKey(tonic: Note, parent: ParentDef): string {
  const lower = parent.id === "ionian" || parent.id === "aeolian" ||
    parent.id === "harmonic" || parent.id === "melodic";
  return `${notePretty(tonic)} ${lower ? parent.name.toLowerCase() : parent.name}`;
}

/** Degree label against the major scale: "♭3", "♯4", "7". */
function degreeLabel(semi: number, degree: number): string {
  const diff = semi - MAJOR[degree];
  return (diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff)) + String(degree + 1);
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const SUFFIX: Record<TriadQuality, string> = { maj: "", min: "m", dim: "°", aug: "+" };
const SHAPE: Record<TriadQuality, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
};

function romanFor(degree: number, semi: number, quality: TriadQuality): string {
  const diff = semi - MAJOR[degree];
  const prefix = diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff);
  const base = quality === "min" || quality === "dim" ? ROMAN[degree].toLowerCase() : ROMAN[degree];
  return prefix + base + (quality === "dim" ? "°" : quality === "aug" ? "+" : "");
}

function qualityOf(notes: Note[]): TriadQuality | null {
  const third = mod12(pc(notes[1]) - pc(notes[0]));
  const fifth = mod12(pc(notes[2]) - pc(notes[0]));
  for (const q of ["maj", "min", "dim", "aug"] as TriadQuality[])
    if (SHAPE[q][1] === third && SHAPE[q][2] === fifth) return q;
  return null;
}

export interface PairChord {
  root: Note;
  quality: TriadQuality;
  /** root, 3rd, 5th, spelled a third apart */
  notes: Note[];
  /** "Am", "F♯°", "B♭+" */
  symbol: string;
  /** "ii", "♭VII", "♭III+" — null where there is no key to measure from */
  roman: string | null;
}

export interface ParentScale {
  parent: ParentDef;
  /** the key asked for */
  asked: string;
  /** the tonic as spelled; C♯ when D♭ Dorian would need seven flats */
  tonic: Note;
  respelled: boolean;
  /** seven notes, one letter per degree, ascending from the tonic */
  notes: Note[];
  degrees: string[];
  /** the triad on every degree, in degree order */
  triads: PairChord[];
}

const accidentalCost = (ns: Note[]) =>
  ns.reduce((a, n) => a + (Math.abs(n.alt) >= 2 ? 100 : Math.abs(n.alt)), 0);

/**
 * A parent scale spelled one letter per degree. When the enharmonic tonic
 * reads with fewer accidentals it wins (C♯ Dorian, not D♭ Dorian with seven
 * flats; D♯ Locrian, not E♭ Locrian with a B𝄫).
 */
export function buildParent(key: string, id: ParentId | string = "ionian"): ParentScale {
  const parent = parentById(id);
  let best: { tonic: string; notes: Note[]; cost: number } | null = null;
  for (const t of [key, enharmonicTonic(key)]) {
    if (!t) continue;
    const ns = buildDiatonic(t, parent.semis);
    if (!ns) continue;
    const cost = accidentalCost(ns);
    if (!best || cost < best.cost) best = { tonic: t, notes: ns, cost };
  }
  if (!best) throw new Error(`${key} ${parent.name} cannot be spelled`);
  const notes = best.notes;
  const triads = notes.map((root, d): PairChord => {
    const ns = [0, 2, 4].map((k) => {
      const src = notes[(d + k) % 7];
      return note(src.letter, src.alt, src.octave + (d + k >= 7 ? 1 : 0));
    });
    const quality = qualityOf(ns)!;
    return {
      root: ns[0], quality, notes: ns,
      symbol: notePretty(root) + SUFFIX[quality],
      roman: romanFor(d, parent.semis[d], quality),
    };
  });
  return {
    parent, asked: key, tonic: notes[0], respelled: best.tonic !== key, notes,
    degrees: parent.semis.map(degreeLabel), triads,
  };
}

/* ── naming six notes ──────────────────────────────────────────────────── */

export interface ParentFit {
  parent: ParentDef;
  /** the one note that turns the six back into this parent */
  add: Note;
}

const DEG_SEMI: Record<string, number> = {
  "1": 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, b5: 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11,
};

/** The app's own named six-note scales, as semitones above their tonic. */
function namedSixNoteSets(): { semis: number[]; name: string; modal: string | null }[] {
  const out: { semis: number[]; name: string; modal: string | null }[] = [];
  for (const md of DIATONIC_MODES)
    out.push({ semis: md.degrees.split(" ").map((d) => DEG_SEMI[d]), name: md.name, modal: md.modal });
  for (const f of FAMILIES) {
    if (f.size !== 6) continue;
    if (f.kind === "fixed" && f.semis) out.push({ semis: f.semis, name: f.short, modal: null });
    if (f.kind === "omit" && f.parent && typeof f.omit === "number")
      out.push({ semis: f.parent.filter((_, i) => i !== (f.omit as number) - 1), name: f.short, modal: null });
  }
  return out;
}
const NAMED = namedSixNoteSets();

/** Every parent, on this tonic, that holds all six notes, and the note it adds. */
export function parentFits(tonic: Note, semis: number[], first?: ParentId): ParentFit[] {
  const out: ParentFit[] = [];
  for (const p of PARENTS) {
    if (!semis.every((s) => p.semis.includes(s))) continue;
    const i = p.semis.findIndex((s) => !semis.includes(s));
    const full = buildDiatonic(noteName(tonic), p.semis);
    if (i < 0 || !full) continue;
    out.push({ parent: p, add: full[i] });
  }
  return first ? [...out.filter((f) => f.parent.id === first), ...out.filter((f) => f.parent.id !== first)] : out;
}

export interface HexatonicName {
  /** "Sunday Scale (no 7)", or computed: "Lydian (no 7)" */
  name: string;
  /** the modal-intersection name, where the app already has one */
  modal: string | null;
}

function nameFor(semis: number[], fallback: string): HexatonicName {
  const key = [...semis].sort((a, b) => a - b).join(",");
  const hit = NAMED.find((n) => [...n.semis].sort((a, b) => a - b).join(",") === key);
  return hit ? { name: hit.name, modal: hit.modal } : { name: fallback, modal: null };
}

/* ── one pair, whichever way it was found ─────────────────────────────── */

export interface TwoChordPair {
  id: string;
  /** shape A holds the scale's tonic when either chord does */
  shapes: [PairChord, PairChord];
  symbol: string;
  roman: string | null;
  tonic: Note;
  /** the six notes, ascending from the tonic (or the first note above it) */
  notes: Note[];
  degrees: string[];
  /** the parent note left out — the one red note */
  removed: Note | null;
  removedDegree: string | null;
  name: string;
  modal: string | null;
  /** parents on this tonic that hold the six notes */
  fits: ParentFit[];
  /** the tonic is the note left out */
  rootless: boolean;
  /** both chords major or minor */
  plain: boolean;
  /** the six notes alternate A B A B A B, so every voice can move by step */
  stepwise: boolean;
}

const pcSet = (ns: Note[]) => new Set(ns.map(pc));

function isStepwise(a: PairChord, b: PairChord): boolean {
  const r = pc(a.root);
  const order = [...a.notes.map((n) => ({ d: mod12(pc(n) - r), s: 0 })), ...b.notes.map((n) => ({ d: mod12(pc(n) - r), s: 1 }))]
    .sort((x, y) => x.d - y.d)
    .map((x) => x.s);
  return order.join("") === "010101";
}

/* ── 1. pairs inside a parent scale ───────────────────────────────────── */

/**
 * The seven pairs of neighbouring triads in a parent, most useful first: two
 * major or minor chords before a diminished or augmented one; within that, the
 * pairs holding the home chord, then IV + V, then the rest, and the pair that
 * leaves out the tonic last.
 */
export function parentPairs(ps: ParentScale): TwoChordPair[] {
  const pairs = ps.triads.map((_, d) => {
    const e = (d + 1) % 7;
    const omitted = (d + 6) % 7;
    const withTonic = d === 0 || e === 0;
    const [ia, ib] = withTonic && e === 0 ? [e, d] : [d, e];
    const a = ps.triads[ia];
    const b = ps.triads[ib];
    const notes = ps.notes.filter((_, i) => i !== omitted);
    const degrees = ps.degrees.filter((_, i) => i !== omitted);
    const semis = ps.parent.semis.filter((_, i) => i !== omitted);
    const rootless = omitted === 0;
    const fallback = rootless
      ? `${ps.parent.name} without its root`
      : `${ps.parent.name} (no ${ps.degrees[omitted]})`;
    const named = rootless ? { name: fallback, modal: null } : nameFor(semis, fallback);
    const pair: TwoChordPair = {
      id: `${ps.parent.id}:${Math.min(ia, ib)}-${Math.max(ia, ib)}`,
      shapes: [a, b],
      symbol: `${a.symbol} + ${b.symbol}`,
      roman: `${a.roman} + ${b.roman}`,
      tonic: ps.tonic,
      notes, degrees,
      removed: ps.notes[omitted],
      removedDegree: ps.degrees[omitted],
      name: named.name,
      modal: named.modal,
      fits: rootless ? [] : parentFits(ps.tonic, semis, ps.parent.id),
      rootless,
      plain: [a, b].every((t) => t.quality === "maj" || t.quality === "min"),
      stepwise: isStepwise(a, b),
    };
    const score = (pair.plain ? 0 : 100) + (rootless ? 40 : 0) + (withTonic ? 0 : 10) +
      (d === 3 ? 0 : 5) + d * 0.1;
    return { pair, score };
  });
  return pairs.sort((x, y) => x.score - y.score).map((x) => x.pair);
}

/* ── 2. every six-note scale the app has ──────────────────────────────── */

/** Spell a triad from its root letter a third apart; null past one accidental. */
function spellTriad(rootLetter: Letter, rootPc: number, q: TriadQuality): Note[] | null {
  const out: Note[] = [];
  for (let i = 0; i < 3; i++) {
    const n = spell(stepLetter(rootLetter, i * 2), mod12(rootPc + SHAPE[q][i]));
    if (!n || Math.abs(n.alt) > 1) return null;
    out.push(n);
  }
  return out;
}

/**
 * The spelling that reads as the chord: letters a third apart, the scale's own
 * letters where they already do that, fewest accidentals otherwise. An
 * augmented triad has three equal roots; the tonic wins if it is one of them.
 */
function chordFromPcs(
  rootPc: number, q: TriadQuality, scale: Note[], tonic: Note,
): PairChord | null {
  const roots = q === "aug" ? [0, 4, 8].map((i) => mod12(rootPc + i)) : [rootPc];
  let best: { notes: Note[]; cost: number } | null = null;
  const scaleLetter = (p: number) => scale.find((n) => pc(n) === p)?.letter;
  for (const r of roots) {
    for (const L of LETTERS.split("") as Letter[]) {
      const ns = spellTriad(L, r, q);
      if (!ns) continue;
      const cost = ns.reduce((a, n) => a + Math.abs(n.alt) + (scaleLetter(pc(n)) === n.letter ? 0 : 0.5), 0) +
        (q === "aug" && r === pc(tonic) ? -2 : 0);
      if (!best || cost < best.cost) best = { notes: ns, cost };
    }
  }
  if (!best) return null;
  return {
    root: best.notes[0], quality: q, notes: best.notes,
    symbol: notePretty(best.notes[0]) + SUFFIX[q],
    roman: romanFrom(tonic, best.notes[0], q),
  };
}

/** Roman numeral by LETTER distance, so C + F♯ is I + ♯IV and C + G♭ is I + ♭V. */
function romanFrom(tonic: Note, root: Note, q: TriadQuality): string {
  const degree = ((letterIndex(root.letter) - letterIndex(tonic.letter)) % 7 + 7) % 7;
  let semi = mod12(pc(root) - pc(tonic));
  if (semi - MAJOR[degree] > 6) semi -= 12;
  if (MAJOR[degree] - semi > 6) semi += 12;
  return romanFor(degree, semi, q);
}

/** Lay notes out ascending from the first, starting at or above `lowest`. */
function placeAscending(ns: Note[], lowest: number): Note[] {
  const out: Note[] = [];
  let previous = -Infinity;
  ns.forEach((n, i) => {
    let m = LETTER_PC[n.letter] + n.alt;
    if (i === 0) { while (m < lowest) m += 12; while (m >= lowest + 12) m -= 12; }
    else { while (m <= previous) m += 12; }
    out.push(atMidi(n, m));
    previous = m;
  });
  return out;
}

/** The same spelled note at a given MIDI number. */
function atMidi(n: Note, m: number): Note {
  const octave = Math.round((m - LETTER_PC[n.letter] - n.alt) / 12) - 1;
  return note(n.letter, n.alt, octave);
}

export interface SixNoteScale {
  id: string;
  familyId: string;
  mode: number;
  name: string;
  modal: string | null;
  group: FamilyGroup;
  tonic: Note;
  /** as the app spells the scale */
  notes: Note[];
  removed: Note | null;
  pairs: TwoChordPair[];
  /** when no two triads work: the splits that need a sus chord, e.g. "Gsus4 + B♭m" */
  susSplits: string[];
}

const SUS4 = [0, 5, 7];

function susName(set: number[], scale: Note[]): string {
  /* {r, r+5, r+7} is rsus4 (and (r+5)sus2); name it as the sus4. */
  for (const r of set) {
    if (!SUS4.every((i) => set.includes(mod12(r + i)))) continue;
    const n = scale.find((x) => pc(x) === r)!;
    return `${notePretty(n)}sus4`;
  }
  return "?";
}

/** Splits using a sus chord, for the scales two triads cannot make. */
function susSplitsOf(pcs: number[], scale: Note[]): string[] {
  const target = [...pcs].sort((a, b) => a - b).join(",");
  const sets: { pcs: number[]; name: (s: Note[]) => string }[] = [];
  const seen = new Set<string>();
  const add = (p: number[], name: (s: Note[]) => string) => {
    const k = [...p].sort((a, b) => a - b).join(",");
    if (seen.has(k) || !p.every((x) => pcs.includes(x))) return;
    seen.add(k);
    sets.push({ pcs: p, name });
  };
  for (let r = 0; r < 12; r++) {
    const s = SUS4.map((i) => mod12(r + i));
    add(s, (sc) => susName(s, sc));
    for (const q of ["maj", "min", "dim", "aug"] as TriadQuality[]) {
      const t = SHAPE[q].map((i) => mod12(r + i));
      add(t, (sc) => {
        const n = sc.find((x) => pc(x) === r)!;
        return notePretty(n) + SUFFIX[q];
      });
    }
  }
  const out: string[] = [];
  for (let i = 0; i < sets.length; i++)
    for (let j = i + 1; j < sets.length; j++) {
      const u = [...new Set([...sets[i].pcs, ...sets[j].pcs])].sort((a, b) => a - b).join(",");
      if (u === target && sets[i].pcs.length + sets[j].pcs.length === 6)
        out.push(`${sets[i].name(scale)} + ${sets[j].name(scale)}`);
    }
  return out;
}

const SIX_NOTE_GROUPS: FamilyGroup[] = ["remove", "pentatonic", "symmetric", "colour"];

/** Every six-note scale the app offers (not Custom), in one key. */
export function sixNoteScales(key = "G"): SixNoteScale[] {
  const out: SixNoteScale[] = [];
  for (const f of FAMILIES) {
    if (f.size !== 6 || f.kind === "custom" || !SIX_NOTE_GROUPS.includes(f.group)) continue;
    const modes = f.modes?.length ?? 1;
    for (let m = 0; m < modes; m++) {
      const s = buildScale(key, f.id, m);
      if (s.error || s.notes.length !== 6) continue;
      const tonic = s.notes[0];
      const semis = s.notes.map((n) => mod12(pc(n) - pc(tonic)));
      const modal = f.modes?.[m]?.modal ?? null;
      const pairs: TwoChordPair[] = [];
      triadPairsCovering(s.pcs).forEach((c, i) => {
        let a = chordFromPcs(c.a.root, c.a.qual, s.notes, tonic);
        let b = chordFromPcs(c.b.root, c.b.qual, s.notes, tonic);
        if (!a || !b) return;
        if (!pcSet(a.notes).has(pc(tonic))) [a, b] = [b, a];
        /* The six notes as the chords spell them, from the tonic up. */
        const byPc = new Map([...a.notes, ...b.notes].map((n) => [pc(n), n]));
        const six = [...s.notes].sort((x, y) => mod12(pc(x) - pc(tonic)) - mod12(pc(y) - pc(tonic)))
          .map((n) => byPc.get(pc(n))!);
        pairs.push({
          id: `${f.id}-${m}:${i}`,
          shapes: [a, b],
          symbol: `${a.symbol} + ${b.symbol}`,
          roman: `${a.roman} + ${b.roman}`,
          tonic: six[0],
          notes: placeAscending(six, midi(tonic)),
          degrees: s.degrees.map((d) => d.replace(/b/g, "♭").replace(/#/g, "♯")),
          removed: s.removed,
          removedDegree: null,
          name: f.modes ? s.label : f.short, modal,
          fits: parentFits(tonic, semis),
          rootless: false,
          plain: [a, b].every((t) => t.quality === "maj" || t.quality === "min"),
          stepwise: isStepwise(a, b),
        });
      });
      /* Stepwise pairs first: those are the ones Jason's ladder walks cleanly. */
      pairs.sort((x, y) => Number(y.stepwise) - Number(x.stepwise) || Number(y.plain) - Number(x.plain));
      out.push({
        id: `${f.id}-${m}`, familyId: f.id, mode: m,
        name: f.modes ? s.label : f.short, modal, group: f.group,
        tonic, notes: s.notes, removed: s.removed, pairs,
        susSplits: pairs.length ? [] : susSplitsOf(s.pcs, s.notes),
      });
    }
  }
  return out;
}

/* ── the ladder ────────────────────────────────────────────────────────── */

export type InversionIndex = 0 | 1 | 2;
export const INVERSION_NAMES = ["root position", "first inversion", "second inversion"] as const;

export interface LadderStep {
  shape: 0 | 1;
  notes: Note[];
  voicing: number[];
  label: string;
  inversion: InversionIndex;
}

/**
 * Both shapes through every inversion, alternating, going up: A, B, A¹, B¹,
 * A², B², A an octave up. Each chord is closed position on its bass. When the
 * six notes alternate A B A B A B (every pair from a parent does), that is the
 * same as stepping every voice to the next note of the scale, which is how
 * Jason plays it: B♭, Cm, B♭/D, Cm/E♭, B♭/F, Cm/G, B♭.
 *
 * `lowest` places shape A's root in the octave from that MIDI note up.
 */
export function pairLadder(pair: TwoChordPair, lowest = 53): LadderStep[] {
  const [A, B] = pair.shapes;
  const r = pc(A.root);
  const ordered = [...A.notes.map((n) => ({ n, s: 0 as const })), ...B.notes.map((n) => ({ n, s: 1 as const }))]
    .sort((x, y) => mod12(pc(x.n) - r) - mod12(pc(y.n) - r));
  const placed = placeAscending(ordered.map((x) => x.n), lowest).map((n, i) => ({ n, s: ordered[i].s }));
  const member = (s: 0 | 1) => {
    const base = placed.filter((x) => x.s === s).map((x) => x.n);
    return [0, 1, 2].flatMap((o) => base.map((n) => atMidi(n, midi(n) + 12 * o)));
  };
  const lists = [member(0), member(1)];
  const chordAt = (s: 0 | 1, k: number): LadderStep => {
    const ns = lists[s].slice(k, k + 3);
    const shape = s === 0 ? A : B;
    const bass = ns[0];
    const inversion = shape.notes.findIndex((n) => pc(n) === pc(bass)) as InversionIndex;
    return {
      shape: s, notes: ns, voicing: ns.map(midi),
      label: inversion === 0 ? shape.symbol : `${shape.symbol}/${notePretty(bass)}`,
      inversion,
    };
  };
  return [chordAt(0, 0), chordAt(1, 0), chordAt(0, 1), chordAt(1, 1), chordAt(0, 2), chordAt(1, 2), chordAt(0, 3)];
}

export type LadderDirection = "up-down" | "up";

export interface PairEvent {
  id: string;
  /** index into the ladder, or the scale degree, or null for a held beat */
  step: number | null;
  voicing: number[] | null;
  label: string;
  shape: 0 | 1 | null;
  accent: boolean;
}

/** Four beats to the bar; every material is a whole number of bars, so a
 *  change always lands cleanly on a downbeat. */
export const PAIR_BEATS = 4;

const accentBars = (events: Omit<PairEvent, "accent">[]): PairEvent[] =>
  events.map((e, i) => ({ ...e, accent: i % PAIR_BEATS === 0 }));

/** Up and down is 12 chords (three bars): up to A an octave higher, then back.
 *  Up only is the seven chords and a held beat (two bars). */
export function ladderEvents(steps: LadderStep[], dir: LadderDirection = "up-down"): PairEvent[] {
  const order = dir === "up-down" ? [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1] : [0, 1, 2, 3, 4, 5, 6, null];
  return accentBars(order.map((k, i) => k === null
    ? { id: `hold-${i}`, step: null, voicing: null, label: "hold", shape: null }
    : { id: `ladder-${i}`, step: k, voicing: steps[k].voicing, label: steps[k].label, shape: steps[k].shape }));
}

/** The six-note scale up to the octave and back: 12 notes, three bars. */
export function scaleEvents(pair: TwoChordPair, lowest = 55): PairEvent[] {
  const up = placeAscending(pair.notes, lowest);
  const top = atMidi(up[0], midi(up[0]) + 12);
  const line = [...up, top, ...up.slice(1).reverse()];
  const shapeOf = (n: Note): 0 | 1 => (pcSet(pair.shapes[0].notes).has(pc(n)) ? 0 : 1);
  return accentBars(line.map((n, i) => ({
    id: `scale-${i}`, step: i <= 6 ? i : 12 - i, voicing: [midi(n)], label: notePretty(n), shape: shapeOf(n),
  })));
}

/* ── proofs, used by the tests and shown on screen ────────────────────── */

export interface PairProof {
  disjoint: boolean;
  /** the two triads make exactly the six notes */
  covers: boolean;
  /** every note belongs to the scale it was found in */
  inside: boolean;
}

export function provePair(pair: TwoChordPair, scalePcs: number[]): PairProof {
  const a = pcSet(pair.shapes[0].notes);
  const b = pcSet(pair.shapes[1].notes);
  const six = pcSet(pair.notes);
  const union = new Set([...a, ...b]);
  return {
    disjoint: [...a].every((p) => !b.has(p)),
    covers: union.size === 6 && six.size === 6 && [...six].every((p) => union.has(p)),
    inside: [...union].every((p) => scalePcs.includes(p)),
  };
}
