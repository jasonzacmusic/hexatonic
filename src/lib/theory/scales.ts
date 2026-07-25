/**
 * Scale families.
 *
 * THE ARCHITECTURAL RULE: the diatonic hexachord is ONE pitch-class set with SIX
 * rotations. We store it once and rotate. There is no separate "major hexatonic"
 * and "minor hexatonic" object — they are the same six notes (Theorem 2), and
 * modelling them separately makes every later feature subtly inconsistent.
 *
 * NAMING: modal-intersection names, sourced to Cecil Sharp's folk-song
 * classification. Never "gospel scale" (that name means 1 2 b3 3 5 6, the major
 * blues scale), never "Sunday scale" (Peter Martin's, different scale), never a
 * bare "major hexatonic" (ambiguous — usually means the no-7 collection).
 */

import {
  Alt, Letter, Note, note, pc, spell, stepLetter, letterIndex, noteName,
  primeForm, intervalVector, forteName, parseNoteName,
} from "./note";

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
export const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11];
export const MELODIC_MINOR = [0, 2, 3, 5, 7, 9, 11];

export const KEYS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];

const DEG_SEMI: Record<string, number> = {
  "1": 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, b5: 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11,
};
const DEG_LETTER: Record<string, number> = {
  "1": 0, b2: 1, "2": 1, b3: 2, "3": 2, "4": 3, b5: 4, "5": 4, b6: 5, "6": 5, b7: 6, "7": 6,
};

/** Build a 7-note scale spelled with one letter per degree. */
export function buildDiatonic(tonicName: string, modeSemis: number[]): Note[] | null {
  const t = parseNoteName(tonicName);
  const out: Note[] = [];
  for (let d = 0; d < modeSemis.length; d++) {
    const L = stepLetter(t.letter, d);
    const oct = t.octave + Math.floor((letterIndex(t.letter) + d) / 7);
    const s = spell(L, (pc(t) + modeSemis[d]) % 12, oct);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

export interface ModeDef {
  index: number;
  name: string;
  aka: string[];
  degrees: string;
  teaching: string;
  hasThird: boolean;
  hasFifth: boolean;
}

/** The six rotations of the diatonic hexachord. */
export const DIATONIC_MODES: ModeDef[] = [
  {
    index: 0,
    name: "Ionian/Lydian Hexatonic",
    aka: ["major hexatonic (no 4)", "major pentatonic + 7"],
    degrees: "1 2 3 5 6 7",
    teaching:
      "Refuses to commit to 4 or ♯4 — which is exactly why it sits on both maj7 and maj7♯11. Stack all six in thirds and you get maj13(no 11): every note is a chord tone.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 1,
    name: "Sus Hexatonic",
    aka: ["no 3rd", "quartal mode"],
    degrees: "1 2 4 5 6 b7",
    teaching:
      "No third at all. A genuinely rootless, suspended, quartal colour — the McCoy Tyner / modern-gospel stack.",
    hasThird: false, hasFifth: true,
  },
  {
    index: 2,
    name: "Phrygian Hexatonic",
    aka: ["no 2nd"],
    degrees: "1 b3 4 5 b6 b7",
    teaching: "The dark one. No 2nd, so it never softens; the ♭6 does the work.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 3,
    name: "Ionian/Mixolydian Hexatonic",
    aka: ["Guidonian hexachord", "major hexatonic (no 7)", "folk / bluegrass"],
    degrees: "1 2 3 4 5 6",
    teaching:
      "Guido d'Arezzo's ut–re–mi–fa–sol–la. For centuries Western musicians learned to sight-sing on exactly these six notes.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 4,
    name: "Dorian/Aeolian Hexatonic",
    aka: ["minor hexatonic (no ♭6)", "raga Pushpalathika", "minor pentatonic + 9"],
    degrees: "1 2 b3 4 5 b7",
    teaching:
      "No 6th of any kind — and the 6th is the note that decides Dorian from Aeolian. So it is ambiguous by construction and works over both m7 and m6 harmony. This is raga Pushpalathika, dhaivata-varjya, janya of mela 22.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 5,
    name: "Locrian Hexatonic",
    aka: ["no 5th"],
    degrees: "1 b2 b3 4 b6 b7",
    teaching: "No perfect fifth anywhere. A real colour, but rarely a tonic.",
    hasThird: true, hasFifth: false,
  },
];

export type FamilyKind = "rotation" | "omit" | "omitMulti" | "fixed";

export interface Family {
  id: string;
  label: string;
  short: string;
  kind: FamilyKind;
  size: number;
  modes?: ModeDef[];
  parent?: number[];
  omit?: number | number[];
  semis?: number[];
  letters?: number[];
  note?: string;
}

export const FAMILIES: Family[] = [
  {
    id: "diatonic", short: "Diatonic hexachord",
    label: "Diatonic hexachord (6-32) — the core", kind: "rotation", size: 6,
    modes: DIATONIC_MODES,
    note: "Zero tritones, five perfect fourths. The most consonant six-note set there is.",
  },
  {
    id: "mixo", short: "Mixolydian hexatonic",
    label: "Mixolydian hexatonic (no 4)", kind: "omit", size: 6,
    parent: [0, 2, 4, 5, 7, 9, 10], omit: 4,
    note: "The dominant colour. Keeps its tritone, so it pulls where the diatonic hexachord rests.",
  },
  {
    id: "blues", short: "Blues hexatonic",
    label: "Blues hexatonic", kind: "fixed", size: 6,
    semis: [0, 3, 5, 6, 7, 10], letters: [0, 2, 3, 4, 4, 6],
    note: "Minor pentatonic plus the ♭5. Set class 6-Z47 — the SAME class as the major blues scale, a minor third away.",
  },
  {
    id: "aug", short: "Augmented hexatonic",
    label: "Augmented hexatonic (jazz 'the hexatonic scale')", kind: "fixed", size: 6,
    semis: [0, 3, 4, 7, 8, 11], letters: [0, 1, 2, 4, 5, 6],
    note: "Two augmented triads a semitone apart. Contains 3 major and 3 minor triads — and ZERO dominant 7ths, which is why it behaves as a tonic-major colour.",
  },
  {
    id: "whole", short: "Whole tone",
    label: "Whole tone", kind: "fixed", size: 6,
    semis: [0, 2, 4, 6, 8, 10], letters: [0, 1, 2, 3, 4, 5],
    note: "No perfect fifth anywhere. Only two distinct transpositions exist.",
  },
  {
    id: "prometheus", short: "Prometheus",
    label: "Prometheus / mystic (Scriabin)", kind: "fixed", size: 6,
    semis: [0, 2, 4, 6, 9, 10], letters: [0, 1, 2, 3, 5, 6],
    note: "Scriabin's synthetic harmony. 'Mystic chord' was coined by Arthur Eaglefield Hull in 1916 — Scriabin never used the term.",
  },
  {
    id: "penta", short: "Audava (5)",
    label: "Audava (5) — major pentatonic", kind: "omitMulti", size: 5,
    parent: MAJOR, omit: [4, 7],
    note: "Remove two notes instead of one. Same engine, no code change.",
  },
  {
    id: "hepta", short: "Sampurna (7)",
    label: "Sampurna (7) — the major scale", kind: "omitMulti", size: 7,
    parent: MAJOR, omit: [],
    note: "The parent. One tritone (F–B), and it is the note we remove that kills it.",
  },
];

export const familyById = (id: string): Family =>
  FAMILIES.find((f) => f.id === id) ?? FAMILIES[0];

export interface ScaleInstance {
  notes: Note[];
  removed: Note | null;
  label: string;
  aka: string[];
  teaching: string;
  degrees: string[];
  family: Family;
  modeIndex: number;
  tonic: string;
  pcs: number[];
  primeForm: number[];
  intervalVector: number[];
  forte: string;
  tritones: number;
  error?: string;
}

export function buildScale(tonicName: string, familyId: string, modeIndex = 0): ScaleInstance {
  const family = familyById(familyId);
  const fail = (msg: string): ScaleInstance => ({
    notes: [], removed: null, label: family.label, aka: [], teaching: "",
    degrees: [], family, modeIndex, tonic: tonicName, pcs: [], primeForm: [],
    intervalVector: [], forte: "—", tritones: 0, error: msg,
  });

  let notes: Note[] = [];
  let removed: Note | null = null;
  let label = family.label;
  let aka: string[] = [];
  let teaching = family.note ?? "";
  let degrees: string[] = [];

  if (family.kind === "rotation") {
    const md = family.modes![modeIndex] ?? family.modes![0];
    const degs = md.degrees.split(" ");
    const t = parseNoteName(tonicName);
    for (const d of degs) {
      const L = stepLetter(t.letter, DEG_LETTER[d]);
      const oct = t.octave + Math.floor((letterIndex(t.letter) + DEG_LETTER[d]) / 7);
      const s = spell(L, (pc(t) + DEG_SEMI[d]) % 12, oct);
      if (!s) return fail(`${tonicName} needs a triple accidental in this mode. Try another key.`);
      notes.push(s);
    }
    degrees = degs;
    label = md.name;
    aka = md.aka;
    teaching = md.teaching;
    removed = findRemoved(notes);
  } else if (family.kind === "omit") {
    const full = buildDiatonic(tonicName, family.parent!);
    if (!full) return fail(`${tonicName} cannot be spelled here.`);
    const k = family.omit as number;
    notes = full.filter((_, i) => i !== k - 1);
    removed = full[k - 1];
  } else if (family.kind === "omitMulti") {
    const full = buildDiatonic(tonicName, family.parent!);
    if (!full) return fail(`${tonicName} cannot be spelled here.`);
    const om = family.omit as number[];
    notes = full.filter((_, i) => !om.includes(i + 1));
  } else {
    const t = parseNoteName(tonicName);
    for (let i = 0; i < family.semis!.length; i++) {
      const L = stepLetter(t.letter, family.letters![i]);
      const oct = t.octave + Math.floor((letterIndex(t.letter) + family.letters![i]) / 7);
      const s = spell(L, (pc(t) + family.semis![i]) % 12, oct);
      if (!s) return fail(`${tonicName} needs a triple accidental in this scale. Try another key.`);
      notes.push(s);
    }
  }

  const pcs = notes.map(pc);
  const iv = intervalVector(pcs);
  if (!degrees.length) degrees = degreesFromSemis(notes);

  return {
    notes, removed, label, aka, teaching, degrees, family, modeIndex,
    tonic: tonicName, pcs, primeForm: primeForm(pcs), intervalVector: iv,
    forte: forteName(pcs), tritones: iv[5],
  };
}

const SEMI_DEG: Record<number, string> = {
  0: "1", 1: "b2", 2: "2", 3: "b3", 4: "3", 5: "4",
  6: "b5", 7: "5", 8: "b6", 9: "6", 10: "b7", 11: "7",
};
function degreesFromSemis(notes: Note[]): string[] {
  if (!notes.length) return [];
  const root = pc(notes[0]);
  return notes.map((n) => SEMI_DEG[(((pc(n) - root) % 12) + 12) % 12]);
}

/** Which note did we knock off? Find the major scale containing all of ours. */
function findRemoved(notes: Note[]): Note | null {
  const have = new Set(notes.map(pc));
  for (const root of KEYS) {
    const full = buildDiatonic(root, MAJOR);
    if (!full) continue;
    const fpc = full.map(pc);
    if ([...have].every((p) => fpc.includes(p))) {
      const miss = full.filter((n) => !have.has(pc(n)));
      if (miss.length === 1) return miss[0];
    }
  }
  return null;
}

/** THEOREM 1: remove each degree of a major scale, count the tritones left. */
export interface OmissionRow {
  removedDegree: number;
  removedNote: string;
  notes: string[];
  primeForm: number[];
  forte: string;
  intervalVector: number[];
  tritones: number;
  is632: boolean;
}
export function omissionSurvey(tonicName = "C"): OmissionRow[] {
  const full = buildDiatonic(tonicName, MAJOR)!;
  return full.map((removedNote, i) => {
    const kept = full.filter((_, j) => j !== i);
    const pcs = kept.map(pc);
    const pf = primeForm(pcs);
    const iv = intervalVector(pcs);
    return {
      removedDegree: i + 1,
      removedNote: noteName(removedNote),
      notes: kept.map(noteName),
      primeForm: pf,
      forte: forteName(pcs),
      intervalVector: iv,
      tritones: iv[5],
      is632: pf.join(",") === "0,2,4,5,7,9",
    };
  });
}
