/**
 * The sounds the ear games ask about.
 *
 * Each sound is defined HERE by its semitones above the tonic, and spelled by
 * the app's own theory code (buildScale). The semitones are the contract: when
 * a sound is spelled, the result is checked against them, so if a family or a
 * mode is ever renamed or reordered in scales.ts the games fail loudly in the
 * tests instead of quietly asking about the wrong scale.
 *
 * The diatonic rotations are found by CONTENT, not by index, for the same
 * reason.
 */

import { buildScale } from "../theory/scales";
import { Letter, Note, letterIndex, midi, notePretty, parseNoteName, pc, spell, stepLetter } from "../theory/note";

export type Quality = "major" | "minor" | "sus";

export interface SoundDef {
  id: string;
  /** plain name, shown on the answer button */
  label: string;
  /** one short word or phrase under the label */
  hint: string;
  /** family id in src/lib/theory/scales.ts */
  family: string;
  /** semitones above the tonic, ascending, starting at 0 (six notes, or five
   *  for the two world scales) */
  semis: number[];
  /** what gives this sound its colour; {n} is replaced by the degree and note */
  tell: string;
  /** the semitones that the tell points at (outlined in the reveal) */
  tellSemis: number[];
  /** the 3rd decides major / minor / suspended; null when both 3rds or neither
   *  apply in a way the first game should not ask about */
  quality: Quality | null;
}

export const SOUNDS: SoundDef[] = [
  /* the six rotations of the diatonic hexachord */
  {
    id: "maj-no4", label: "Major (no 4)", hint: "bright, open",
    family: "diatonic", semis: [0, 2, 4, 7, 9, 11],
    tell: "The {4} and the {11} make it bright. There is no 4th.",
    tellSemis: [4, 11], quality: "major",
  },
  {
    id: "folk", label: "Sunday Scale (no 7)", hint: "warm, singable",
    family: "diatonic", semis: [0, 2, 4, 5, 7, 9],
    tell: "The {4} makes it major. There is no 7th, so nothing leans up into the tonic.",
    tellSemis: [4], quality: "major",
  },
  {
    id: "sus", label: "Suspended (no 3rd)", hint: "open, neither",
    family: "diatonic", semis: [0, 2, 5, 7, 9, 10],
    tell: "There is no 3rd at all, so it is neither major nor minor. The {5} takes its place.",
    tellSemis: [5], quality: "sus",
  },
  {
    id: "min-no6", label: "Minor (no 6)", hint: "soft minor",
    family: "diatonic", semis: [0, 2, 3, 5, 7, 10],
    tell: "The {3} makes it minor. There is no 6th, so it is neither Dorian nor Aeolian.",
    tellSemis: [3], quality: "minor",
  },
  {
    id: "dark", label: "Dark minor (no 2)", hint: "heavy, dark",
    family: "diatonic", semis: [0, 3, 5, 7, 8, 10],
    tell: "The {8} made it dark. There is no 2nd.",
    tellSemis: [8], quality: "minor",
  },
  {
    id: "unstable", label: "Unstable (no 5th)", hint: "floating, tense",
    family: "diatonic", semis: [0, 1, 3, 5, 8, 10],
    tell: "There is no 5th, so it floats. The {1} sits a half step above the tonic.",
    tellSemis: [1], quality: null,
  },

  /* the other six-note families */
  {
    id: "mixo", label: "Mixolydian (no 4)", hint: "dominant",
    family: "mixo", semis: [0, 2, 4, 7, 9, 10],
    tell: "A major {4} with a {10}: the dominant colour.",
    tellSemis: [4, 10], quality: "major",
  },
  {
    id: "blues", label: "Blues", hint: "bite",
    family: "blues", semis: [0, 3, 5, 6, 7, 10],
    tell: "The {6} right next to the 5th gives it the bite.",
    tellSemis: [6], quality: "minor",
  },
  {
    id: "blues-major", label: "Major blues", hint: "church",
    family: "blues-major", semis: [0, 2, 3, 4, 7, 9],
    tell: "The {3} slides up into the {4}.",
    tellSemis: [3, 4], quality: null,
  },
  {
    id: "whole", label: "Whole tone", hint: "floating",
    family: "whole", semis: [0, 2, 4, 6, 8, 10],
    tell: "Every step is a whole step, so there is no perfect 5th anywhere.",
    tellSemis: [], quality: null,
  },
  {
    id: "aug", label: "Augmented", hint: "shimmer",
    family: "aug", semis: [0, 3, 4, 7, 8, 11],
    tell: "Minor 3rd, half step, over and over: two augmented triads a half step apart.",
    tellSemis: [3, 4], quality: null,
  },
  {
    id: "prometheus", label: "Prometheus", hint: "mystic",
    family: "prometheus", semis: [0, 2, 4, 6, 9, 10],
    tell: "Whole steps up to the {6}, then the {9} and {10} a half step apart. No 5th above the tonic.",
    tellSemis: [6, 9, 10], quality: null,
  },

  /* two five-note world scales, for the hardest family level */
  {
    id: "hirajoshi", label: "Hirajoshi", hint: "koto",
    family: "hirajoshi", semis: [0, 2, 3, 7, 8],
    tell: "Five notes, two half steps: the {2} to the {3}, and the 5 to the {8}, each followed by a leap.",
    tellSemis: [3, 8], quality: null,
  },
  {
    id: "insen", label: "In sen", hint: "sombre",
    family: "insen", semis: [0, 1, 5, 7, 10],
    tell: "Five notes. The {1} sits a half step above the tonic, and there is no 3rd at all.",
    tellSemis: [1], quality: null,
  },
];

export const soundById = (id: string): SoundDef => {
  const s = SOUNDS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown ear sound ${id}`);
  return s;
};

/** Keys the games may pick. The same twelve pitches as the app's key menu. */
export const EAR_KEYS = ["G", "C", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"];
/** Same pitch, other name, for when a spelling would need a double accidental. */
const ENHARMONIC: Record<string, string> = {
  "F#": "Gb", Gb: "F#", Db: "C#", "C#": "Db", Ab: "G#", "G#": "Ab",
  Eb: "D#", "D#": "Eb", Bb: "A#", "A#": "Bb",
};

const rel = (tonic: Note, n: Note) => (((pc(n) - pc(tonic)) % 12) + 12) % 12;
const clean = (notes: Note[]) => notes.length > 0 && notes.every((n) => Math.abs(n.alt) < 2);

/** Plain degree label from the SPELLING: F# over C is ♯4, Gb over C is ♭5. */
export function degreeLabel(tonic: Note, n: Note): string {
  const gen = ((letterIndex(n.letter) - letterIndex(tonic.letter)) % 7 + 7) % 7;
  const major = [0, 2, 4, 5, 7, 9, 11][gen];
  let d = rel(tonic, n) - major;
  if (d > 6) d -= 12;
  if (d < -6) d += 12;
  const acc = d === 0 ? "" : d > 0 ? "♯".repeat(d) : "♭".repeat(-d);
  return `${acc}${gen + 1}`;
}

export interface Spelled {
  /** the tonic name actually used (an enharmonic of the requested key if needed) */
  key: string;
  notes: Note[];
  midis: number[];
}

function spellFamily(key: string, def: SoundDef): Note[] | null {
  if (def.family === "diatonic") {
    for (let i = 0; i < 6; i++) {
      const s = buildScale(key, "diatonic", i);
      if (s.error || !s.notes.length) continue;
      const semis = s.notes.map((n) => rel(s.notes[0], n));
      if (semis.join() === def.semis.join()) return s.notes;
    }
    return null;
  }
  const s = buildScale(key, def.family);
  if (s.error || s.family.id !== def.family) return null;
  return s.notes;
}

/** Which letter (steps above the tonic's letter) each semitone may take:
 *  ♭2 · 2 · ♭3 or ♯2 · 3 · 4 · ♯4 or ♭5 · 5 · ♭6 or ♯5 · 6 · ♭7 or ♯6 · 7. */
const LETTER_STEPS: Record<number, number[]> = {
  0: [0], 1: [1], 2: [1], 3: [2, 1], 4: [2], 5: [3], 6: [3, 4],
  7: [4], 8: [5, 4], 9: [5], 10: [6, 5], 11: [6],
};
/** What the second choice costs. ♯4 and ♭5 are equally good names. ♯2 costs
 *  more than a repeated letter, so the augmented scale is written C E♭ E G A♭ B,
 *  not C D♯ E G A♭ B. ♯5 and ♯6 are for the whole-tone scale. */
const SECOND_CHOICE: Record<number, number> = { 3: 30, 6: 0, 8: 15, 10: 8 };

/** How hard a spelling is to read. Double accidentals are out; E♯ B♯ C♭ F♭ are
 *  a last resort; mixing sharps with flats comes next; a letter used twice
 *  costs more than one accidental (so a scale is never re-lettered just to
 *  save a sharp); then each accidental. Renaming the key costs a little, so
 *  it only happens when the other name genuinely reads better. */
function readingCost(notes: Note[], renamed: boolean): number {
  const t = notes[0];
  let lettering = 0;
  for (const n of notes) {
    const semi = rel(t, n);
    const steps = ((letterIndex(n.letter) - letterIndex(t.letter)) % 7 + 7) % 7;
    const allowed = LETTER_STEPS[semi];
    if (!allowed.includes(steps)) lettering += 40;          // a wrong-letter degree
    else if (steps !== allowed[0]) lettering += SECOND_CHOICE[semi] ?? 8;
  }
  const doubles = notes.filter((n) => Math.abs(n.alt) > 1).length;
  const odd = notes.filter((n) =>
    (n.alt === 1 && (n.letter === "E" || n.letter === "B")) ||
    (n.alt === -1 && (n.letter === "C" || n.letter === "F"))).length;
  const sharps = notes.some((n) => n.alt > 0), flats = notes.some((n) => n.alt < 0);
  const repeats = notes.length - new Set(notes.map((n) => n.letter)).size;
  const acc = notes.filter((n) => n.alt !== 0).length;
  return doubles * 1000 + lettering + odd * 30 + (sharps && flats ? 10 : 0) + repeats * 25 + acc + (renamed ? 2 : 0);
}

/** Every letter assignment the table allows, for one tonic name. */
function letterings(key: string, semis: number[]): Note[][] {
  const t = parseNoteName(key);
  const out: Note[][] = [];
  const walk = (i: number, acc: Note[]) => {
    if (i === semis.length) { out.push(acc); return; }
    for (const stepUp of LETTER_STEPS[semis[i]]) {
      const L = stepLetter(t.letter, stepUp) as Letter;
      const oct = t.octave + Math.floor((letterIndex(t.letter) + stepUp) / 7);
      const n = spell(L, (pc(t) + semis[i]) % 12, oct);
      if (n) walk(i + 1, [...acc, n]);
    }
  };
  walk(0, []);
  return out;
}

/**
 * Spell a sound on a key, ascending from the tonic in octave 4. The app's own
 * spelling (buildScale) is the first candidate; every sensible letter
 * assignment on the key and on its enharmonic name is weighed against it, and
 * the easiest to read wins (the app's own spelling wins any tie). The PITCHES
 * are identical whichever wins, so "same key all session" holds.
 */
export function spellSound(key: string, def: SoundDef): Spelled {
  const tries = [key, ENHARMONIC[key]].filter(Boolean) as string[];
  let best: Spelled | null = null;
  let bestCost = Infinity;
  /* The key's name is read off the spelled tonic, never assumed from the
     request: buildScale may hand back D♭ as C♯, and the game must then say
     "C♯", not "D♭" over C♯ E F♯. */
  const consider = (_k: string, notes: Note[] | null) => {
    if (!notes || notes.length !== def.semis.length) return;
    if (notes.map((n) => rel(notes[0], n)).join() !== def.semis.join()) return;
    const name = tonicName(notes[0]);
    const cost = readingCost(notes, name !== key);
    if (cost < bestCost) { bestCost = cost; best = { key: name, notes, midis: normalise(notes.map(midi)) }; }
  };
  for (const k of tries) {
    const own = spellFamily(k, def);
    if (own && own.map((n) => rel(own[0], n)).join() !== def.semis.join())
      throw new Error(`${def.id} on ${k} is not ${def.semis.join(" ")}: scales.ts changed`);
    consider(k, own);
  }
  for (const k of tries) for (const notes of letterings(k, def.semis)) consider(k, notes);
  if (best) return best;
  throw new Error(`${def.id} cannot be spelled on ${key}`);
}

/** "C#", "Db", "G": the key name of a spelled tonic, in the app's ASCII form. */
const tonicName = (n: Note) => `${n.letter}${n.alt > 0 ? "#".repeat(n.alt) : "b".repeat(-n.alt)}`;

/** Seven-note parent scales for the missing-note game. */
export const PARENTS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
} as const;
export type Parent = keyof typeof PARENTS;

/** One letter per degree, then check. Minor keys prefer their usual names
 *  (C# minor, not Db minor), via the same enharmonic fallback. */
export function spellParent(key: string, parent: Parent): Spelled {
  const tries = [key, ENHARMONIC[key]].filter(Boolean) as string[];
  let fallback: Spelled | null = null;
  for (const k of tries) {
    const t = parseNoteName(k);
    const notes: Note[] = [];
    let ok = true;
    PARENTS[parent].forEach((semi, d) => {
      const L = stepLetter(t.letter, d) as Letter;
      const oct = t.octave + Math.floor((letterIndex(t.letter) + d) / 7);
      const n = spell(L, (pc(t) + semi) % 12, oct);
      if (!n) ok = false; else notes.push(n);
    });
    if (!ok) continue;
    const out = { key: k, notes, midis: normalise(notes.map(midi)) };
    if (clean(notes)) return out;
    fallback ??= out;
  }
  if (fallback) return fallback;
  throw new Error(`${parent} cannot be spelled on ${key}`);
}

/** Keep the tonic between F#3 and F4, so no key sits much higher than another. */
function normalise(midis: number[]): number[] {
  const shift = midis[0] > 65 ? -12 : 0;
  return midis.map((m) => m + shift);
}

export const pretty = notePretty;

/** Fill the {n} slots of a tell with "♭6 (Eb)", from the actual spelling. */
export function fillTell(def: SoundDef, sp: Spelled): string {
  return def.tell.replace(/\{(\d+)\}/g, (_, s) => {
    const semi = Number(s);
    const n = sp.notes.find((x) => rel(sp.notes[0], x) === semi);
    return n ? `${degreeLabel(sp.notes[0], n)} (${notePretty(n)})` : "";
  });
}

export const relSemi = rel;
