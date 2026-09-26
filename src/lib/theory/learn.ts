/**
 * The facts on /learn ("Why six notes"), computed rather than typed.
 *
 * The page follows Jason Zac's own lesson ("Piano Workout: 2 Chords, All
 * Inversions & Modal Hexatonic Scales", his handwritten notes for it, and his
 * Music Gym class): take one note out, find the two chords, play them through
 * every inversion, then the minor and modal versions, the rhythm, and how to
 * practise. Every sentence on that page that names a note, a chord or a count
 * reads it from here, and tests/learn.test.ts locks each one. The examples are
 * in G, the app's home key; every function takes the key so the tests can
 * prove the same facts hold in all twelve.
 */

import { buildDiatonic, buildScale, MAJOR, omissionSurvey, ScaleInstance } from "./scales";
import { exactCoverMovement, hexatonicTriadMovement, InterlockedMovement } from "./movement";
import { encodeCustom } from "./custom";
import { sixVsSeven, SixSevenRow } from "./resolution";
import {
  Alt, enharmonicTonic, MAJOR_KEYS, note, Note, noteName, parseNoteName, pc,
} from "./note";

export const LEARN_KEY = "G";

/** "F#" → "F♯", "Bb" → "B♭". Only a flat that follows a letter is a flat. */
export const pretty = (s: string): string =>
  s.replace(/#/g, "♯").replace(/([A-G])b/g, "$1♭");

/** "F#dim" → "F♯°", "Bm" → "Bm", "G" → "G". */
export const chordLabel = (symbol: string): string =>
  pretty(symbol.replace(/dim$/, "°"));

/** "Bm" → "B minor", "F#dim" → "F♯°", "D" → "D". For sentences. */
export const chordWords = (symbol: string): string =>
  symbol.endsWith("dim") ? chordLabel(symbol)
    : symbol.endsWith("m") ? `${pretty(symbol.slice(0, -1))} minor`
    : pretty(symbol);

/** Join as English: "A", "A and B", "A, B and C". */
export const listWords = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const hasDouble = (ns: Note[]) => ns.some((n) => Math.abs(n.alt) === 2);

/** A triad's symbol from its spelled notes (root first): "G", "Am", "F#dim". */
export function triadSymbol(ns: Note[]): string {
  const third = mod12(pc(ns[1]) - pc(ns[0]));
  const fifth = mod12(pc(ns[2]) - pc(ns[0]));
  const q = third === 4 && fifth === 7 ? "" : third === 3 && fifth === 7 ? "m"
    : third === 3 && fifth === 6 ? "dim" : "aug";
  return noteName(ns[0]) + q;
}

/* ── 1. six notes: the pentatonic plus one, the major minus one ─────────── */

export interface SweetSpotFact {
  /** the major pentatonic, 1 2 3 5 6 */
  penta: Note[];
  /** the Sunday Scale: the major scale without its 7th, 1 2 3 4 5 6 */
  sunday: Note[];
  /** the full major scale */
  major: Note[];
  /** the one note the Sunday Scale adds to the pentatonic (its 4th) */
  added: Note;
  /** the one note it leaves out of the major scale (the 7th) */
  dropped: Note;
  /** the major scale's only tritone, lower note first */
  tritone: [Note, Note];
  /** tritones left in the Sunday Scale */
  sundayTritones: number;
}

export function sweetSpotFact(key = LEARN_KEY): SweetSpotFact {
  const major = buildDiatonic(key, MAJOR)!;
  const sunday = buildScale(key, "diatonic", 3).notes;
  const penta = buildScale(key, "penta").notes;
  const has = (set: Note[]) => (n: Note) => set.some((m) => pc(m) === pc(n));
  const added = sunday.find((n) => !has(penta)(n))!;
  const dropped = major.find((n) => !has(sunday)(n))!;
  const survey = omissionSurvey(key);
  const tritonePairs: [Note, Note][] = [];
  for (let i = 0; i < major.length; i++)
    for (let j = i + 1; j < major.length; j++)
      if (mod12(pc(major[j]) - pc(major[i])) === 6) tritonePairs.push([major[i], major[j]]);
  const row = survey.find((r) => pc(parseNoteName(r.removedNote)) === pc(dropped));
  return {
    penta, sunday, major, added, dropped,
    tritone: tritonePairs[0],
    sundayTritones: row?.tritones ?? -1,
  };
}

/* ── 2. the scale holds two chords ─────────────────────────────────────── */

export interface TwoChordsFact {
  scale: Note[];
  /** the chord built on each note by skipping every other note */
  stacks: { notes: Note[]; symbol: string }[];
  /** the two different chords that appear, tonic first */
  chords: [string, string];
  /** the two chords' notes, root position */
  chordNotes: [Note[], Note[]];
  shareNone: boolean;
  coverAll: boolean;
  /** the triads of the full major key that share no note with the tonic triad */
  strangers: { symbol: string; degree: number }[];
}

export function twoChordsFact(key = LEARN_KEY): TwoChordsFact {
  const scale = buildScale(key, "diatonic", 3).notes;
  const stack = (d: number) => [0, 2, 4].map((k) => scale[(d + k) % 6]);
  const stacks = scale.map((_, d) => {
    const ns = stack(d);
    // name the chord from its real root: the stack from degree 1 or 2 is root position
    const root = d % 2 === 0 ? stack(0) : stack(1);
    return { notes: ns, symbol: triadSymbol(root) };
  });
  const chordNotes: [Note[], Note[]] = [stack(0), stack(1)];
  const a = new Set(chordNotes[0].map(pc));
  const shareNone = chordNotes[1].every((n) => !a.has(pc(n)));
  const union = new Set([...chordNotes[0], ...chordNotes[1]].map(pc));
  const coverAll = union.size === 6 && scale.every((n) => union.has(pc(n)));

  const major = buildDiatonic(key, MAJOR)!;
  const triad = (d: number) => [0, 2, 4].map((k) => major[(d + k) % 7]);
  const tonic = new Set(triad(0).map(pc));
  const strangers = major.map((_, d) => d).filter((d) => d > 0)
    .filter((d) => triad(d).every((n) => !tonic.has(pc(n))))
    .map((d) => ({ symbol: triadSymbol(triad(d)), degree: d + 1 }));

  return {
    scale, stacks,
    chords: [stacks[0].symbol, stacks[1].symbol],
    chordNotes, shareNone, coverAll, strangers,
  };
}

/* ── 3. the two chords through every inversion ─────────────────────────── */

export interface DrillStep {
  label: string;
  inversion: string;
  /** exact keys, low to high */
  voicing: number[];
  pair: 0 | 1;
}

/** The movement's six chords, then the tonic chord again an octave up, which is
 *  how Jason ends the climb ("we conclude with the final tonic chord"). */
export function withHome(m: InterlockedMovement): DrillStep[] {
  const steps: DrillStep[] = m.steps.map((s) => ({
    label: s.label, inversion: s.inversion, voicing: s.voicing, pair: s.pair,
  }));
  const first = m.steps[0];
  steps.push({
    label: first.label, inversion: first.inversion,
    voicing: first.voicing.map((v) => v + 12), pair: first.pair,
  });
  return steps;
}

export interface InversionDrillFact {
  movement: InterlockedMovement;
  steps: DrillStep[];
  /** from one chord to the next, every voice climbs exactly one note of the scale */
  stepwise: boolean;
}

/** True when every voice of each chord moves up to the next scale note. */
function climbsByStep(scale: Note[], steps: DrillStep[]): boolean {
  const pcs = scale.map(pc);
  const next = (m: number) => {
    const i = pcs.indexOf(mod12(m));
    const up = mod12(pcs[(i + 1) % pcs.length] - pcs[i]);
    return m + up;
  };
  for (let i = 1; i < steps.length; i++) {
    const want = steps[i - 1].voicing.map(next);
    if (want.join() !== steps[i].voicing.join()) return false;
  }
  return true;
}

export function inversionDrillFact(key = LEARN_KEY): InversionDrillFact {
  const movement = hexatonicTriadMovement(key, 3);
  const steps = withHome(movement);
  return { movement, steps, stepwise: climbsByStep(movement.scale.notes, steps) };
}

/* ── 4. the minor hexatonic: the same two chords, a new home ───────────── */

export interface MinorFact {
  /** the minor home: the Sunday Scale's 2nd note */
  tonic: Note;
  movement: InterlockedMovement;
  steps: DrillStep[];
  scale: Note[];
  /** same six notes as the key's Sunday Scale */
  sameAsSunday: boolean;
  /** the minor pentatonic on the same tonic, 1 ♭3 4 5 ♭7 */
  pentatonic: Note[];
  /** the note the six add to that pentatonic (the 2nd) */
  added: Note;
  /** neither the ♭6 (Aeolian) nor the 6 (Dorian) is in the six */
  noSixth: boolean;
}

export function minorFact(key = LEARN_KEY): MinorFact {
  const sunday = buildScale(key, "diatonic", 3).notes;
  const tonic = sunday[1];
  const movement = hexatonicTriadMovement(noteName(tonic), 4);
  const scale = movement.scale.notes;
  const sundaySet = new Set(sunday.map(pc));
  const sameAsSunday = scale.length === 6 && scale.every((n) => sundaySet.has(pc(n)));
  const t = pc(scale[0]);
  const pentatonic = scale.filter((n) => [0, 3, 5, 7, 10].includes(mod12(pc(n) - t)));
  const added = scale.find((n) => mod12(pc(n) - t) === 2)!;
  const noSixth = scale.every((n) => ![8, 9].includes(mod12(pc(n) - t)));
  return { tonic, movement, steps: withHome(movement), scale, sameAsSunday, pentatonic, added, noSixth };
}

/* ── 5. two chords make a mode ─────────────────────────────────────────── */

export type ModeId = "dorian" | "lydian" | "phrygian" | "mixolydian";

interface ModeDef {
  id: ModeId;
  name: string;
  /** the mode's seven notes, semitones above the tonic */
  semis: number[];
  /** the degree left out (1-7), so the two triads fit exactly */
  drop: number;
  /** the chord pair in numerals */
  numerals: string;
  /** the notes Jason names as the mode's colour, as semitones above the tonic */
  colour: number[];
  /** those degrees as words */
  colourWords: string;
}

/** In Jason's order: Dorian, Lydian, Phrygian, Mixolydian. */
export const MODES: ModeDef[] = [
  { id: "dorian", name: "Dorian", semis: [0, 2, 3, 5, 7, 9, 10], drop: 7,
    numerals: "i + ii", colour: [3, 9], colourWords: "the minor 3rd and the major 6th" },
  { id: "lydian", name: "Lydian", semis: [0, 2, 4, 6, 7, 9, 11], drop: 7,
    numerals: "I + II", colour: [6], colourWords: "the ♯4" },
  { id: "phrygian", name: "Phrygian", semis: [0, 1, 3, 5, 7, 8, 10], drop: 7,
    numerals: "i + ♭II", colour: [1], colourWords: "the ♭2" },
  { id: "mixolydian", name: "Mixolydian", semis: [0, 2, 4, 5, 7, 9, 10], drop: 6,
    numerals: "I + ♭VII", colour: [4, 10], colourWords: "the major 3rd and the ♭7" },
];

export interface ModalFact {
  mode: ModeDef;
  /** the tonic as spelled (C♯ where D♭ would need double flats) */
  tonic: string;
  /** the full seven-note mode */
  seven: Note[];
  /** the six notes: the mode without its dropped degree */
  six: Note[];
  /** the note left out */
  dropped: Note;
  /** the two triads, tonic first */
  chords: [string, string];
  shareNone: boolean;
  colourNotes: Note[];
  /** every colour note survives in the six */
  keepsColour: boolean;
  steps: DrillStep[];
  /** a Practice link for these six notes */
  practiceHref: string;
}

export function modalFact(id: ModeId, key = LEARN_KEY): ModalFact {
  const mode = MODES.find((m) => m.id === id)!;
  let tonic = key;
  let seven = buildDiatonic(tonic, mode.semis);
  if (!seven || hasDouble(seven)) {
    const alt = enharmonicTonic(key);
    const other = alt ? buildDiatonic(alt, mode.semis) : null;
    if (other && !hasDouble(other)) { seven = other; tonic = alt!; }
  }
  if (!seven) throw new Error(`${key} ${mode.name} cannot be spelled`);
  const dropped = seven[mode.drop - 1];
  const six = seven.filter((_, i) => i !== mode.drop - 1);
  const semis = six.map((n) => mod12(pc(n) - pc(six[0])));
  const base: ScaleInstance = buildScale(tonic, "custom", 0, semis);
  const movement = exactCoverMovement("hexatonic-triads", { ...base, notes: six, label: mode.name }, 3);
  const a = [0, 2, 4].map((i) => six[i]);
  const b = [1, 3, 5].map((i) => six[i]);
  // the second triad's root is the note a 3rd below its top when it is not in
  // root position (Mixolydian: A C F is F/A), so name it from its own root
  const rootOf = (ns: Note[]): Note[] => {
    for (let r = 0; r < 3; r++) {
      const v = [ns[r], ns[(r + 1) % 3], ns[(r + 2) % 3]];
      const s = triadSymbol(v);
      if (!s.endsWith("aug") && !s.endsWith("dim")) return v;
    }
    return ns;
  };
  const aSet = new Set(a.map(pc));
  const colourNotes = mode.colour.map((c) => seven!.find((n) => mod12(pc(n) - pc(seven![0])) === c)!);
  const sixSet = new Set(six.map(pc));
  const code = encodeCustom(semis);
  return {
    mode, tonic, seven, six, dropped,
    chords: [triadSymbol(rootOf(a)), triadSymbol(rootOf(b))],
    shareNone: b.every((n) => !aSet.has(pc(n))),
    colourNotes,
    keepsColour: colourNotes.every((n) => sixSet.has(pc(n))),
    steps: withHome(movement),
    practiceHref: `/practice?k=${encodeURIComponent(tonic)}&f=custom&cs=${code}&v=2`,
  };
}

/* ── 6. rhythm: accents in 3s, 4s and 5s ───────────────────────────────── */

/** The groupings Jason has his students accent: threes, fours and fives. */
export const GROUPINGS = [3, 4, 5] as const;

/** Bars of 4/4 16ths until the scale's first note, the accent and beat 1 meet. */
export function rhythmFact(): SixSevenRow[] {
  return sixVsSeven([...GROUPINGS]);
}

/* ── 7. practise every key, in key-signature pairs ─────────────────────── */

export interface KeyPair {
  count: number;
  sharp: string;
  flat: string;
}

/** A sharp key and the flat key with the same number of accidentals, for the
 *  keys the app offers. Jason: two flats (B♭) with two sharps (D). */
export function keyPairs(keys: readonly string[]): KeyPair[] {
  const out: KeyPair[] = [];
  for (let n = 1; n <= 7; n++) {
    const sharp = keys.find((k) => MAJOR_KEYS[k] === n);
    const flat = keys.find((k) => MAJOR_KEYS[k] === -n);
    if (sharp && flat) out.push({ count: n, sharp, flat });
  }
  return out;
}

/** The Sunday Scale up to the octave, in any key, from octave 4. */
export function sundayRun(key: string): Note[] {
  const s = buildScale(key, "diatonic", 3).notes;
  const top = note(s[0].letter, s[0].alt as Alt, s[0].octave + 1);
  return [...s, top];
}

