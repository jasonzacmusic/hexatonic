/**
 * Scale families.
 *
 * THE ARCHITECTURAL RULE: the diatonic hexachord is ONE pitch-class set with SIX
 * rotations. We store it once and rotate. There is no separate "major hexatonic"
 * and "minor hexatonic" object — they are the same six notes (Theorem 2), and
 * modelling them separately makes every later feature subtly inconsistent.
 *
 * NAMING: every rotation carries a PLAIN name first ("Major (no 4)") and its
 * modal-intersection name second ("Ionian/Lydian hexatonic"), after Cecil
 * Sharp's folk-song classification. The modal name lists the two modes that
 * share all six notes, which is exactly the ambiguity the missing note leaves.
 * Never "gospel scale" for these (that name means 1 2 b3 3 5 6, the major blues
 * scale), and never a bare "major hexatonic". "Sunday Scale" is Peter
 * Martin/Open Studio's teaching name for the no-7 rotation only: 1 2 3 4 5 6.
 */

import {
  Note, pc, spell, stepLetter, letterIndex, noteName,
  primeForm, intervalVector, forteName, parseNoteName, MAJOR_KEYS, enharmonicTonic,
} from "./note";
import { spellSet } from "./custom";

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
  /** The plain name a player reads first, e.g. "Major (no 4)". */
  name: string;
  /** The modal-intersection name: the two modes that share all six notes. */
  modal: string;
  /** One word for the sound. */
  character: string;
  /** One line: which note gives this rotation its colour. */
  colour: string;
  aka: string[];
  degrees: string;
  /** The degree the plain name says is missing, read from the first mode in
   *  the modal name: Major (no 4) lost the 4 of Ionian, Minor (no 6) the 6 of
   *  Dorian. This is the red note, spelled on its own letter. */
  missing: string;
  teaching: string;
  hasThird: boolean;
  hasFifth: boolean;
}

/** The six rotations of the diatonic hexachord. Every name is checked against
 *  its degrees in tests/scale-names.test.ts: the modal name must list exactly
 *  the two major-scale modes that contain all six degrees. */
export const DIATONIC_MODES: ModeDef[] = [
  {
    index: 0,
    name: "Major (no 4)",
    modal: "Ionian/Lydian hexatonic",
    character: "bright",
    colour: "The major 7th is there and the 4th is not, so nothing rubs against the major 3rd.",
    aka: ["Ionian/Lydian hexatonic", "major pentatonic + 7"],
    degrees: "1 2 3 5 6 7",
    missing: "4",
    teaching:
      "It never commits to 4 or ♯4, which is why it sits on both maj7 and maj7♯11. Stack all six in thirds and you get maj13 (no 11): every note is a chord tone.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 1,
    name: "Suspended (no 3rd)",
    modal: "Dorian/Mixolydian hexatonic",
    character: "open",
    colour: "No 3rd, so it is neither major nor minor; the 4th and ♭7 hold it suspended.",
    aka: ["Dorian/Mixolydian hexatonic", "sus hexatonic"],
    degrees: "1 2 4 5 6 b7",
    missing: "b3",
    teaching: "No third at all: a suspended, quartal colour.",
    hasThird: false, hasFifth: true,
  },
  {
    index: 2,
    name: "Dark minor (no 2)",
    modal: "Aeolian/Phrygian hexatonic",
    character: "dark",
    colour: "The ♭6 darkens it, and with no 2nd there is nothing to soften the ♭3.",
    aka: ["Aeolian/Phrygian hexatonic"],
    degrees: "1 b3 4 5 b6 b7",
    missing: "2",
    teaching: "The dark one. No 2nd, so it never softens; the ♭6 does the work.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 3,
    name: "Folk major (no 7)",
    modal: "Ionian/Mixolydian hexatonic",
    character: "warm",
    colour: "No 7th, so there is no leading note pulling upward; plain, singable major.",
    aka: [
      "Ionian/Mixolydian hexatonic",
      "Sunday Scale (Peter Martin / Open Studio)",
      "Guidonian hexachord",
    ],
    degrees: "1 2 3 4 5 6",
    missing: "7",
    teaching:
      "Guido d'Arezzo's ut–re–mi–fa–sol–la: for centuries Western musicians learned to sight-sing on exactly these six notes.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 4,
    name: "Minor (no 6)",
    modal: "Dorian/Aeolian hexatonic",
    character: "soulful",
    colour: "The ♭3 and ♭7 make it minor; with no 6th it sits between Dorian and Aeolian.",
    aka: ["Dorian/Aeolian hexatonic", "minor pentatonic + 2", "raga Pushpalathika"],
    degrees: "1 2 b3 4 5 b7",
    missing: "6",
    teaching:
      "No 6th of any kind, and the 6th is the note that decides Dorian from Aeolian. So it works over both m7 and m6 harmony. In Carnatic music this is raga Pushpalathika.",
    hasThird: true, hasFifth: true,
  },
  {
    index: 5,
    name: "Phrygian (no 5th)",
    modal: "Phrygian/Locrian hexatonic",
    character: "uneasy",
    colour: "The ♭2 gives it its colour, and with no 5th above the tonic it never settles.",
    aka: ["Phrygian/Locrian hexatonic"],
    degrees: "1 b2 b3 4 b6 b7",
    missing: "5",
    teaching: "No perfect fifth above the tonic. A real colour, but rarely a home key.",
    hasThird: true, hasFifth: false,
  },
];

export type FamilyKind = "rotation" | "omit" | "omitMulti" | "fixed" | "symmetric8" | "custom";

/**
 * How a family reaches its notes. Practice and Sounds group by this.
 *   remove      — a seven-note scale with one note taken out
 *   pentatonic  — a pentatonic scale with one note added
 *   symmetric   — built from two identical halves (whole tone, augmented)
 *   custom      — whatever the player builds
 *   beyond      — reference only: not a six-note scale, or a one-composer sound
 *   compare     — the five- and seven-note parents, for comparison
 *   reference   — data other screens need (Harmony's triad pairs, octatonics)
 */
export type FamilyGroup =
  | "remove" | "pentatonic" | "symmetric" | "custom" | "beyond" | "compare" | "reference";

export const FAMILY_GROUPS: { id: FamilyGroup; label: string; blurb: string }[] = [
  { id: "remove", label: "Remove one note",
    blurb: "Take a seven-note scale and leave one note out." },
  { id: "pentatonic", label: "Pentatonic plus one",
    blurb: "Take a five-note scale and add one note." },
  { id: "symmetric", label: "Symmetric",
    blurb: "Two identical halves. The pattern repeats inside the octave." },
  { id: "custom", label: "Custom", blurb: "Pick any notes you like." },
  { id: "beyond", label: "Beyond six notes",
    blurb: "Other sounds worth knowing, for reference." },
  { id: "compare", label: "Compare with", blurb: "The five- and seven-note parents." },
  { id: "reference", label: "Reference", blurb: "Used by the Harmony pages." },
];

export interface Family {
  id: string;
  label: string;
  short: string;
  kind: FamilyKind;
  size: number;
  group: FamilyGroup;
  /** One word for the sound. For rotations, each mode carries its own. */
  character: string;
  modes?: ModeDef[];
  parent?: number[];
  omit?: number | number[];
  semis?: number[];
  /** Letter steps above the tonic for each note — the spelling template. */
  letters?: number[];
  /** Other equally correct templates (Petrushka's two triad spellings). */
  letterAlts?: number[][];
  /** True where mixing sharps and flats is the correct spelling in some keys:
   *  the scale is a mode of a parent that mixes them (D Hijaz is from G
   *  harmonic minor: B♭, E♭ and F♯), or it is spelled by degree so every key
   *  reads alike (augmented: 1 ♭3 3 5 ♭6 7). */
  mixOk?: boolean;
  /** Prefer B, E, F and C over Cb, Fb, E# and B#. True for the blues and
   *  whole-tone scales, which players read by sound rather than by key
   *  signature: Ab blues is Ab B Db D Eb Gb. */
  plainWhite?: boolean;
  note?: string;
}

export const FAMILIES: Family[] = [
  {
    id: "diatonic", short: "Diatonic",
    label: "Diatonic: the major scale with one note out", kind: "rotation", size: 6,
    group: "remove", character: "clear",
    modes: DIATONIC_MODES,
    note: "Zero tritones, and five perfect fourth/fifth dyads — the most of any hexachord, and it is the only one that reaches five. Step three degrees and every interval in the cycle comes out perfect.",
  },
  {
    id: "mixo", short: "Dominant (no 4)",
    label: "Dominant (no 4): Mixolydian without its 4th", kind: "omit", size: 6,
    group: "remove", character: "dominant",
    parent: [0, 2, 4, 5, 7, 9, 10], omit: 4,
    note: "The dominant colour. It keeps its tritone (3 and ♭7), so it pulls where the diatonic hexachord rests.",
  },
  {
    id: "blues", short: "Blues",
    label: "Blues", kind: "fixed", size: 6,
    group: "pentatonic", character: "bite", plainWhite: true,
    semis: [0, 3, 5, 6, 7, 10], letters: [0, 2, 3, 4, 4, 6],
    note: "Minor pentatonic plus the ♭5. The same six notes as the major blues a minor third up: C blues is E♭ major blues.",
  },
  {
    id: "blues-major", short: "Major blues",
    label: "Major blues (often called the gospel scale)", kind: "fixed", size: 6,
    group: "pentatonic", character: "church", plainWhite: true,
    semis: [0, 2, 3, 4, 7, 9], letters: [0, 1, 2, 2, 4, 5],
    note: "1 2 ♭3 3 5 6: major pentatonic plus the ♭3. The same six notes as the minor blues a minor third below: C major blues and A blues are identical.",
  },
  {
    id: "whole", short: "Whole tone",
    label: "Whole tone", kind: "fixed", size: 6,
    group: "symmetric", character: "floating", plainWhite: true,
    semis: [0, 2, 4, 6, 8, 10], letters: [0, 1, 2, 3, 4, 6],
    note: "No perfect fifth anywhere. Only two distinct transpositions exist.",
  },
  {
    id: "aug", short: "Augmented",
    label: "Augmented (in jazz, often just 'the hexatonic scale')", kind: "fixed", size: 6,
    group: "symmetric", character: "shimmer", mixOk: true,
    /* Spelled by degree, 1 ♭3 3 5 ♭6 7, so every key reads the same way:
       C E♭ E G A♭ B, G B♭ B D E♭ F♯. */
    semis: [0, 3, 4, 7, 8, 11], letters: [0, 2, 2, 4, 5, 6],
    note: "Two augmented triads a semitone apart. It holds three major and three minor triads, and no dominant 7th at all, which is why it behaves as a tonic-major colour.",
  },
  {
    id: "prometheus", short: "Prometheus",
    label: "Prometheus (Scriabin)", kind: "fixed", size: 6,
    group: "beyond", character: "mystic", mixOk: true,
    semis: [0, 2, 4, 6, 9, 10], letters: [0, 1, 2, 3, 5, 6],
    note: "Scriabin's synthetic harmony. 'Mystic chord' was coined by Arthur Eaglefield Hull in 1916; Scriabin never used the term.",
  },
  {
    id: "petrushka", short: "Tritone pair",
    label: "Tritone pair (Petrushka): two major triads a tritone apart", kind: "fixed", size: 6,
    group: "reference", character: "clash", mixOk: true,
    semis: [0, 1, 4, 6, 7, 10],
    /* Spelled so the second triad reads as a triad: on C that is C + F♯
       (C C♯ E F♯ G A♯) or C + G♭ (C D♭ E G♭ G B♭). Never C D♭ E F♯ G B♭,
       where D♭ and B♭ do not belong to an F♯ chord. */
    letters: [0, 0, 2, 3, 4, 5], letterAlts: [[0, 1, 2, 4, 4, 6]],
    note: "Two major triads a tritone apart, stacked: the Petrushka chord. Two major triads share no note only a semitone, a whole step or a tritone apart. The semitone pair gives 1 ♭2 3 4 5 ♭6, the whole-step pair gives 1 2 3 ♯4 5 6, and the tritone pair gives this one.",
  },
  {
    id: "dim-wh", short: "Octatonic (whole–half)",
    label: "Octatonic — whole–half diminished", kind: "symmetric8", size: 8,
    group: "reference", character: "tense",
    semis: [0, 2, 3, 5, 6, 8, 9, 11],
    note: "Repeats every minor third, so only three distinct transpositions exist. Not one of Barry Harris's scales: those have eight notes but are not symmetric.",
  },
  {
    id: "dim-hw", short: "Octatonic (half–whole)",
    label: "Octatonic — half–whole diminished", kind: "symmetric8", size: 8,
    group: "reference", character: "tense",
    semis: [0, 1, 3, 4, 6, 7, 9, 10],
    note: "The dominant-side rotation. Same three transpositions.",
  },
  {
    id: "custom", short: "Custom",
    label: "Custom: build your own", kind: "custom", size: 6,
    group: "custom", character: "yours",
    note: "Any set of notes you like. The harmony, the interval cycles and the bar counts are all computed from whatever you build.",
  },
  {
    id: "penta", short: "Major pentatonic (5)",
    label: "Major pentatonic (5 notes) · audava", kind: "omitMulti", size: 5,
    group: "compare", character: "open",
    parent: MAJOR, omit: [4, 7],
    note: "Remove two notes instead of one: the 4th and the 7th.",
  },
  {
    id: "hepta", short: "Major scale (7)",
    label: "Major scale (7 notes) · sampurna", kind: "omitMulti", size: 7,
    group: "compare", character: "complete",
    parent: MAJOR, omit: [],
    note: "The parent. One tritone (4 and 7), and removing either of those two notes is what kills it.",
  },

  /* ── Beyond six notes: reference scales from other traditions ────────────
     Everything below is exactly representable in twelve-tone equal
     temperament. Maqamat that need quarter tones, and the gamelan tunings,
     are not here, because rounding them to a piano would teach something
     false. */
  {
    id: "hirajoshi", short: "Hirajoshi",
    label: "Hirajoshi (Japanese pentatonic)", kind: "fixed", size: 5,
    group: "beyond", character: "koto",
    semis: [0, 2, 3, 7, 8], letters: [0, 1, 2, 4, 5],
    note: "A koto tuning, and the sound many Western ears file under 'Japanese'. Its naming is contested: several definitions circulate, differing by rotation. This is the form built on the tuning's own first degree.",
  },
  {
    id: "insen", short: "In sen",
    label: "In sen (Japanese pentatonic)", kind: "fixed", size: 5,
    group: "beyond", character: "sombre",
    semis: [0, 1, 5, 7, 10], letters: [0, 1, 3, 4, 6],
    note: "The semitone above the tonic gives it its weight. Darker than hirajoshi because it has no third at all.",
  },
  {
    id: "iwato", short: "Iwato",
    label: "Iwato (Japanese pentatonic)", kind: "fixed", size: 5,
    group: "beyond", character: "stark",
    semis: [0, 1, 5, 6, 10], letters: [0, 1, 3, 4, 6],
    note: "A rotation of hirajoshi, started on its second note: two semitones and a tritone in five notes.",
  },
  {
    id: "kumoi", short: "Kumoi",
    label: "Kumoi (Japanese pentatonic)", kind: "fixed", size: 5,
    group: "beyond", character: "wistful",
    semis: [0, 2, 3, 7, 9], letters: [0, 1, 2, 4, 5],
    note: "Hirajoshi with a natural 6th instead of a ♭6. One note apart, and much brighter for it.",
  },
  {
    id: "yo", short: "Yo",
    label: "Yo (Japanese pentatonic, no semitones)", kind: "fixed", size: 5,
    group: "beyond", character: "folk",
    semis: [0, 2, 5, 7, 9], letters: [0, 1, 3, 4, 5],
    note: "No semitones at all. It is the same set as the minor pentatonic, rotated, which is why it sounds familiar before you can place it.",
  },
  {
    id: "hijaz", short: "Hijaz",
    label: "Hijaz / Phrygian dominant (7 notes)", kind: "fixed", size: 7,
    group: "beyond", character: "fiery", mixOk: true,
    semis: [0, 1, 4, 5, 7, 8, 10], letters: [0, 1, 2, 3, 4, 5, 6],
    note: "The augmented second between ♭2 and 3 is the whole sound. On a piano it is close to the Phrygian dominant of flamenco and the Freygish of klezmer; maqam practice tunes Hijaz differently, and its upper half varies.",
  },
];

export const familyById = (id: string): Family =>
  FAMILIES.find((f) => f.id === id) ?? FAMILIES[0];

/** Families in a group, in list order. */
export const familiesIn = (g: FamilyGroup): Family[] => FAMILIES.filter((f) => f.group === g);

export interface ScaleInstance {
  notes: Note[];
  removed: Note | null;
  /** Relative-major key signature used by the staff, or null for synthetic sets. */
  keySignature: string | null;
  label: string;
  aka: string[];
  teaching: string;
  degrees: string[];
  family: Family;
  modeIndex: number;
  /** The tonic as spelled. Usually the key asked for; for the two rotations
   *  whose flat spelling needs double flats (Db and Ab), the enharmonic sharp. */
  tonic: string;
  /** Set when the tonic was respelled, e.g. "Db" when the scale reads from C#. */
  respelledFrom?: string;
  pcs: number[];
  primeForm: number[];
  intervalVector: number[];
  forte: string;
  tritones: number;
  error?: string;
}

/* ── spelling helpers ─────────────────────────────────────────────────── */

const hasDouble = (ns: Note[]) => ns.some((n) => Math.abs(n.alt) === 2);
const mixes = (ns: Note[]) => ns.some((n) => n.alt > 0) && ns.some((n) => n.alt < 0);
/** Cb, Fb, E# and B#: correct inside a key signature that needs them, but a
 *  player reading a blues or whole-tone scale expects B, E, F and C. */
const isWhiteAccidental = (n: Note) =>
  (n.alt === -1 && (n.letter === "C" || n.letter === "F")) ||
  (n.alt === 1 && (n.letter === "E" || n.letter === "B"));
/** The fewest letters a scale may be spelled on: a six-note scale on four
 *  letters (D F F# A A# C#) is legal and unreadable. Five-note scales get more
 *  room, because Ab iwato is Ab A Db D Gb. */
export const minLetters = (n: number) => (n >= 6 ? Math.min(n - 1, 5) : n - 2);
const leansFlat = (tonic: string) => (MAJOR_KEYS[tonic] ?? 0) < 0 || tonic.endsWith("b");

function rotationNotes(tonicName: string, degs: string[]): Note[] | null {
  const t = parseNoteName(tonicName);
  const out: Note[] = [];
  for (const d of degs) {
    const L = stepLetter(t.letter, DEG_LETTER[d]);
    const oct = t.octave + Math.floor((letterIndex(t.letter) + DEG_LETTER[d]) / 7);
    const s = spell(L, (pc(t) + DEG_SEMI[d]) % 12, oct);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

/**
 * Spell a fixed family. The template (letters) says how the scale is usually
 * written; the search finds the cheapest spelling, where the cost is, in
 * order of weight:
 *   a double accidental      — never, if there is any way round it
 *   mixed sharps and flats   — unless the family is flagged mixOk
 *   Cb, Fb, E#, B#           — a player reads B, E, F, C in these scales
 *   each accidental, each note off the template
 * So C blues stays C Eb F Gb G Bb, Eb blues becomes Eb Gb Ab A Bb Db (not
 * Eb Gb Ab Bbb Bb Db), and Ab blues becomes Ab B Db D Eb Gb.
 */
function spellFixed(tonicName: string, fam: Family): Note[] | null {
  const t = parseNoteName(tonicName);
  const semis = fam.semis!;
  const templates = [fam.letters!, ...(fam.letterAlts ?? [])];
  const n = semis.length;
  const flat = leansFlat(tonicName);
  let best: Note[] | null = null;
  let bestCost = Infinity;
  const walk = (i: number, offs: number[]) => {
    if (i === n) {
      const cand: Note[] = [];
      for (let k = 0; k < n; k++) {
        const L = stepLetter(t.letter, offs[k]);
        const oct = t.octave + Math.floor((letterIndex(t.letter) + offs[k]) / 7);
        const s = spell(L, (pc(t) + semis[k]) % 12, oct);
        if (!s) return;
        cand.push(s);
      }
      if (new Set(offs).size < minLetters(n)) return;
      const dev = Math.min(...templates.map((tp) => tp.filter((o, k) => o !== offs[k]).length));
      const doubles = cand.filter((x) => Math.abs(x.alt) === 2).length;
      const singles = cand.filter((x) => Math.abs(x.alt) === 1).length;
      const white = cand.filter(isWhiteAccidental).length;
      const wrongDir = cand.filter((x) => x.alt !== 0 && (x.alt > 0) === flat).length;
      const cost = doubles * 1e6 + (fam.mixOk ? 0 : (mixes(cand) ? 5000 : 0)) +
        (fam.plainWhite ? white * 3000 : 0) + singles * 1000 + dev * 1500 + wrongDir * 10;
      if (cost < bestCost) { bestCost = cost; best = cand; }
      return;
    }
    if (i === 0) { walk(1, [0]); return; }
    const prev = offs[i - 1];
    /* A step of three letters is needed for five-note scales (Db in sen is
       Db D Gb Ab B). Seven notes must take all seven letters. */
    if (n === 7) { walk(i + 1, [...offs, prev + 1]); return; }
    for (let o = prev; o <= Math.min(prev + 3, 6); o++) walk(i + 1, [...offs, o]);
  };
  walk(0, []);
  return best;
}

export function buildScale(
  tonicName: string, familyId: string, modeIndex = 0, customSemis?: number[]
): ScaleInstance {
  const family = familyById(familyId);
  const fail = (msg: string): ScaleInstance => ({
    notes: [], removed: null, keySignature: null, label: family.label, aka: [], teaching: "",
    degrees: [], family, modeIndex, tonic: tonicName, pcs: [], primeForm: [],
    intervalVector: [], forte: "—", tritones: 0, error: msg,
  });

  let notes: Note[] = [];
  let removed: Note | null = null;
  let keySignature: string | null = null;
  let label = family.label;
  let aka: string[] = [];
  let teaching = family.note ?? "";
  let degrees: string[] = [];
  let tonic = tonicName;
  let respelledFrom: string | undefined;

  if (family.kind === "rotation") {
    const md = family.modes![modeIndex] ?? family.modes![0];
    const degs = md.degrees.split(" ");
    let built = rotationNotes(tonicName, degs);
    /* Db "Phrygian (no 5th)" is Db Ebb Fb Gb Bbb Cb: its relative major is the
       theoretical key of Bbb. Nobody reads that. The same six sounds from C#
       are C# D E F# A B, straight out of D major, so spell it from there. */
    if (!built || hasDouble(built)) {
      const alt = enharmonicTonic(tonicName);
      const other = alt ? rotationNotes(alt, degs) : null;
      if (other && !hasDouble(other)) { built = other; tonic = alt!; respelledFrom = tonicName; }
    }
    if (!built) return fail(`${tonicName} needs a triple accidental in this mode. Try another key.`);
    notes = built;
    degrees = degs;
    label = md.name;
    aka = md.aka;
    teaching = md.teaching;
    const parent = findParentScale(notes);
    /* The key signature may come from either parent (Db major no 4 prints
       Ab major's four flats, all of which it uses), but the red note is the
       one the name promises: the 4 of Db is Gb, never the G of Ab major. */
    removed = rotationNotes(tonic, [md.missing])?.[0] ?? parent?.removed ?? null;
    if (removed && Math.abs(removed.alt) === 2) removed = parent?.removed ?? null;
    keySignature = parent?.key ?? null;
  } else if (family.kind === "omit") {
    const full = buildDiatonic(tonicName, family.parent!);
    if (!full) return fail(`${tonicName} cannot be spelled here.`);
    const k = family.omit as number;
    notes = full.filter((_, i) => i !== k - 1);
    removed = full[k - 1];
    keySignature = inferMajorKey(full);
  } else if (family.kind === "omitMulti") {
    const full = buildDiatonic(tonicName, family.parent!);
    if (!full) return fail(`${tonicName} cannot be spelled here.`);
    const om = family.omit as number[];
    notes = full.filter((_, i) => !om.includes(i + 1));
    keySignature = inferMajorKey(full);
  } else if (family.kind === "custom") {
    /* Whatever the user built. Everything downstream — harmony, interval cycles,
       the resolution maths — is computed from the set, so nothing else needs to
       know this scale was not one of ours.
       Try both leans and keep one that does not mix sharps with flats, then the
       one with fewer accidentals: B with a minor third was coming out as
       B C# D E Gb A, when B C# D E F# A is the same cost and reads cleanly. */
    const semis = customSemis && customSemis.length ? customSemis : [0, 2, 3, 5, 7, 10];
    const r = spellSet(tonicName, semis);
    if (r.error) return fail(r.error);
    const cost = (ns: Note[]) =>
      (mixes(ns) ? 1000 : 0) + ns.reduce((a, x) => a + x.alt * x.alt, 0);
    let picked = r.notes;
    for (const lean of [true, false]) {
      const o = spellSet(tonicName, semis, { flatLean: lean });
      if (!o.error && o.notes.length === picked.length && cost(o.notes) < cost(picked)) picked = o.notes;
    }
    notes = picked;
  } else if (family.kind === "symmetric8") {
    /* Eight notes will not fit in seven letters, so exactly one letter must
       repeat — and WHICH one cannot be fixed globally. A template that spells C
       cleanly gives Eb a double flat. So: try every position for the doubled
       letter, score by sum(alt squared) to punish double accidentals hard, and
       tie-break toward the key's own accidental direction. Ported from the
       Python reference, where 0 of 24 root/kind pairs needed a double. */
    const t = parseNoteName(tonicName);
    const flatKey = leansFlat(tonicName);
    let best: Note[] | null = null;
    let bestCost = Infinity;
    /* dbl 0..6 doubles a letter early; dbl === 7 means no early doubling and the
       eighth note simply takes the root letter an octave up — which is how
       A B C D Eb F Gb Ab is conventionally written. */
    for (let dbl = 0; dbl <= 7; dbl++) {
      const letters: number[] = [];
      let li = 0;
      for (let i = 0; i < 8; i++) { letters.push(li); if (i !== dbl) li++; }
      if (letters[7] > 7) continue;
      const cand: Note[] = [];
      let ok = true;
      for (let i = 0; i < 8; i++) {
        const L = stepLetter(t.letter, letters[i]);
        const oct = t.octave + Math.floor((letterIndex(t.letter) + letters[i]) / 7);
        const n = spell(L, (pc(t) + family.semis![i]) % 12, oct);
        if (!n) { ok = false; break; }
        cand.push(n);
      }
      if (!ok) continue;
      const wrongDir = cand.filter((n) => n.alt !== 0 && (n.alt > 0) === flatKey).length;
      const cost =
        cand.reduce((a, n) => a + n.alt * n.alt, 0) * 1000 + (mixes(cand) ? 100 : 0) + wrongDir;
      if (cost < bestCost) { bestCost = cost; best = cand; }
    }
    if (!best) return fail(`${tonicName} cannot be spelled in this scale.`);
    notes = best;
  } else {
    let spelled = spellFixed(tonicName, family);
    /* A seven-note scale cannot dodge a double flat by sharing a letter, so it
       changes tonic spelling instead: Db Hijaz is C# D E# F# G# A B. */
    if (!spelled || hasDouble(spelled)) {
      const alt = enharmonicTonic(tonicName);
      const other = alt ? spellFixed(alt, family) : null;
      if (other && !hasDouble(other)) { spelled = other; tonic = alt!; respelledFrom = tonicName; }
    }
    if (!spelled) return fail(`${tonicName} needs a triple accidental in this scale. Try another key.`);
    notes = spelled;
  }

  const pcs = notes.map(pc);
  const iv = intervalVector(pcs);
  if (!degrees.length) degrees = degreesFromSemis(notes);

  return {
    notes, removed, keySignature, label, aka, teaching, degrees, family, modeIndex,
    tonic, respelledFrom, pcs, primeForm: primeForm(pcs), intervalVector: iv,
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

/** Degree labels for display: "b3" → "♭3", "#4" → "♯4". */
export const prettyDegree = (d: string) => d.replace(/b/g, "♭").replace(/#/g, "♯");

/**
 * Which parent key and note produced this rotation?
 *
 * A hexachord sits inside TWO major scales — that ambiguity is the entire point
 * of the modal-intersection names, so there is a real choice to make here and
 * the array order is not it. Prefer the parent whose signature has no
 * accidental the scale never uses, and keep KEYS order as the tiebreak.
 */
function findParentScale(notes: Note[]): { key: string; removed: Note } | null {
  const have = new Set(notes.map(pc));
  const letters = new Set(notes.map((n) => n.letter));
  let best: { key: string; removed: Note } | null = null;
  let bestUnused = Infinity;
  for (const root of KEYS) {
    const full = buildDiatonic(root, MAJOR);
    if (!full) continue;
    const fpc = full.map(pc);
    if (![...have].every((p) => fpc.includes(p))) continue;
    const miss = full.filter((n) => !have.has(pc(n)));
    if (miss.length !== 1) continue;
    const unused = full.filter((n) => n.alt !== 0 && !letters.has(n.letter)).length;
    if (unused < bestUnused) { bestUnused = unused; best = { key: root, removed: miss[0] }; }
    if (bestUnused === 0) break;
  }
  return best;
}

/** Infer the relative-major signature for a complete parent scale. */
function inferMajorKey(notes: Note[]): string | null {
  const target = new Set(notes.map(pc));
  for (const root of KEYS) {
    const major = buildDiatonic(root, MAJOR);
    if (!major || major.length !== target.size) continue;
    if (major.every((n) => target.has(pc(n)))) return root;
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
