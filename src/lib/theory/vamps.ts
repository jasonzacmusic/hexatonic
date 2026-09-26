/**
 * Improvise: the backing loops.
 *
 * THE RULE THAT MAKES THIS TEACH RATHER THAN DECORATE:
 * every chord in every loop (except the 12-bar blues, see blues.ts) is built
 * ONLY from notes the scale actually contains. If a progression would need a
 * note the scale does not have, that chord does not exist here, and a loop
 * that cannot be built is not offered: the page says why instead.
 *
 * Each scale has its own progressions, chosen the way a musician would choose
 * them for that sound (a Sunday Scale has no leading note, so its loops never
 * lean on V; a Phrygian with no 5th has no chord on its home note, so its
 * chords sit over a G pedal). They are written as intervals above the tonic,
 * never per key, so one definition works in all twelve keys. The tests build
 * every loop in every key and check every note against the scale.
 *
 * Voicings: the bass sits low (C2–B2), the chords mid-range and voice-led so
 * each chord moves as little as possible from the one before; the pads keep
 * their open shape.
 */

import { Note, note, pc, midi, noteName, parseNoteName } from "./note";
import { ScaleInstance } from "./scales";
import { findChords } from "./chords";
import {
  FUNCTION_LABEL, HarmonicFunction, harmonicFunction, romanNumeral, TriadQuality,
} from "./functions";

/** Kept for callers that still pass a style; every loop now has one voicing. */
export type VoicingStyle = "shell" | "rootless" | "quartal" | "spread";

export interface VoicedChord {
  label: string;
  altLabel?: string;
  bass: number;          // midi
  voicing: number[];     // midi, ascending
  chordTones: number[];  // pitch classes sounding — used to light the keys
  degreeRoot: number;    // which scale degree the chord is built on
  /** the chord's root, spelled */
  root: Note;
  /** the quality template the chord was built from */
  quality: Quality;
  /** true for an open pad (stacked fifths, sus or quartal, no 3rd) */
  pad: boolean;
}

export interface VampStep {
  chord: VoicedChord;
  bars: number;
  /** roman numeral of the triad against the tonic, e.g. "I", "vi", "♭VII", "Isus" */
  roman: string;
  /** the full numeral with its extension, e.g. "Imaj7", "vi7", "V7sus4", "♭II/I" */
  numeral: string;
  fn: HarmonicFunction;
  fnLabel: string;
}

export type BedId = "drone" | "two" | "four" | "sus" | "swing" | "blues";

export interface VampDef {
  id: BedId;
  name: string;
  description: string;
  /** the bed's own groove; the 6/8 toggle can override "straight" */
  feel: "straight" | "swing";
}

/** Six loops, each with a different job. */
export const VAMPS: VampDef[] = [
  { id: "drone", name: "Drone", feel: "straight",
    description: "The home note and its fifth, nothing else. Hear every note of the scale against home." },
  { id: "two", name: "Two-chord", feel: "straight",
    description: "Home and one partner chord, two bars each." },
  { id: "four", name: "Four-chord loop", feel: "straight",
    description: "Four of the scale's own chords, one bar each." },
  { id: "sus", name: "Open pad", feel: "straight",
    description: "Open chords with no 3rd, so nothing pulls. Long notes sound settled." },
  { id: "swing", name: "Swing", feel: "swing",
    description: "Swung chords and a walking bass." },
  { id: "blues", name: "12-bar blues", feel: "swing",
    description: "Twelve bars of I7, IV7 and V7, which step outside the scale on purpose." },
];

export const vampById = (id: string) => VAMPS.find((v) => v.id === id) ?? VAMPS[0];

const mod = (a: number, n: number) => ((a % n) + n) % n;

/* ── chord qualities ──────────────────────────────────────────────────── */

export type Quality =
  | "maj" | "min" | "dim" | "aug" | "maj7" | "m7" | "7" | "m7b5" | "dim7" | "6" | "m6"
  | "sus2" | "sus4" | "7sus4" | "7#5" | "9#11" | "quartal" | "fifths" | "open";

/** Semitones above the root. "fifths" and "open" are built from the scale. */
const SHAPE: Record<Exclude<Quality, "fifths" | "open">, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], "7": [0, 4, 7, 10], m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9], "6": [0, 4, 7, 9], m6: [0, 3, 7, 9],
  sus2: [0, 2, 7], sus4: [0, 5, 7], "7sus4": [0, 5, 7, 10],
  "7#5": [0, 4, 8, 10], "9#11": [0, 4, 10, 14, 18], quartal: [0, 5, 10],
};
const SUFFIX: Record<Quality, string> = {
  maj: "", min: "m", dim: "dim", aug: "aug", maj7: "maj7", m7: "m7", "7": "7", m7b5: "m7b5",
  dim7: "dim7", "6": "6", m6: "m6", sus2: "sus2", sus4: "sus4", "7sus4": "7sus4",
  "7#5": "7#5", "9#11": "9#11", quartal: " quartal", fifths: "sus2", open: " pad",
};
/** Pads keep an open shape rather than being voice-led into close position. */
const OPEN: Partial<Record<Quality, number[]>> = {
  sus2: [0, 7, 14], sus4: [0, 7, 17], "7sus4": [0, 7, 10, 17], quartal: [0, 5, 10],
};
const PAD = new Set<Quality>(["fifths", "open", "quartal", "sus2", "sus4", "7sus4"]);

const TRIAD_OF: Record<Quality, TriadQuality | "sus"> = {
  maj: "maj", maj7: "maj", "7": "maj", "6": "maj", "9#11": "maj",
  min: "min", m7: "min", m6: "min",
  dim: "dim", m7b5: "dim", dim7: "dim",
  aug: "aug", "7#5": "aug",
  sus2: "sus", sus4: "sus", "7sus4": "sus", quartal: "sus", fifths: "sus", open: "sus",
};
const EXT: Partial<Record<Quality, string>> = {
  maj7: "maj7", m7: "7", "7": "7", "6": "6", m6: "6", "9#11": "9♯11", dim7: "7",
  "7#5": "7", sus2: "sus2", sus4: "sus4", "7sus4": "7sus4", fifths: "sus2",
};

/* ── the progressions, per scale ──────────────────────────────────────── */

/** A chord in a progression: its root in semitones above the tonic, its
 *  quality, and (for a pedal) the bass note in semitones above the tonic. */
type Spec = [root: number, q: Quality, pedal?: number];
type LoopId = "two" | "four" | "sus" | "swing";
type Plan = Partial<Record<LoopId, Spec[]>> & { why?: Partial<Record<LoopId, string>> };

/* Why a loop is missing, in plain words. */
const ONE_CHORD = "Its notes hold only one chord that sounds like home, so there is nothing to move to.";
const NO_HOME = "Its home note has no chord of its own, so a loop of chords would lose it.";
const NO_GROOVE = "Its home note has no chord of its own, so it never settles into a jazz groove.";
const TWO_ONLY = "It holds only two chords that belong together, and the two-chord loop plays both.";

export const PROGRESSIONS: Record<string, Plan> = {
  /* Major (no 4): no ii and no IV, so the loops turn on I, iii, V and vi. */
  "diatonic:0": {
    two: [[0, "maj7"], [9, "m7"]],
    four: [[0, "maj7"], [7, "maj"], [9, "m7"], [4, "m7"]],
    sus: [[0, "fifths"], [2, "fifths"]],
    swing: [[0, "maj7"], [4, "m7"], [9, "m7"], [7, "6"]],
  },
  /* Suspended (no 3rd): the tonic is a 7sus4, the classic modal-jazz chord. */
  "diatonic:1": {
    two: [[0, "7sus4"], [10, "maj7"]],
    four: [[0, "7sus4"], [10, "maj7"], [5, "maj"], [7, "m7"]],
    sus: [[0, "fifths"], [10, "fifths"]],
    swing: [[0, "7sus4"], [5, "maj"]],
  },
  /* Dark minor (no 2): i, ♭III, iv and ♭VI; no v and no ♭VII. */
  "diatonic:2": {
    two: [[0, "m7"], [8, "maj7"]],
    four: [[0, "m7"], [8, "maj7"], [3, "maj"], [5, "m7"]],
    sus: [[0, "7sus4"], [5, "7sus4"]],
    swing: [[0, "m7"], [5, "m7"]],
  },
  /* Sunday Scale (no 7): no leading note, so no V. The swing turnaround uses V7sus4. */
  "diatonic:3": {
    two: [[0, "maj"], [5, "maj7"]],
    four: [[0, "maj"], [9, "m7"], [5, "maj7"], [2, "m7"]],
    sus: [[0, "fifths"], [5, "fifths"]],
    swing: [[0, "6"], [9, "m7"], [2, "m7"], [7, "7sus4"]],
  },
  /* Minor (no 6): the Dorian/Aeolian vamp i–♭VII. */
  "diatonic:4": {
    two: [[0, "m7"], [10, "maj"]],
    four: [[0, "m7"], [3, "maj7"], [10, "maj"], [7, "m7"]],
    sus: [[0, "fifths"], [10, "fifths"]],
    swing: [[0, "m7"], [5, "7sus4"]],
  },
  /* Phrygian (no 5th): no chord on the tonic, so the chords sit over a tonic pedal. */
  "diatonic:5": {
    two: [[1, "maj", 0], [10, "m7", 0]],
    four: [[1, "maj", 0], [10, "m7", 0], [8, "maj", 0], [10, "m7", 0]],
    sus: [[0, "quartal"], [10, "quartal"]],
    why: { swing: NO_GROOVE },
  },
  /* Dominant (no 4): a dominant 7th that never resolves. */
  mixo: {
    two: [[0, "7"], [7, "min"]],
    four: [[0, "7"], [9, "m7"], [7, "min"], [4, "m7b5"]],
    sus: [[0, "fifths"], [7, "fifths"]],
    swing: [[0, "7"], [7, "min"]],
  },
  /* Blues, played as a scale of its own (the 12-bar is its own loop). */
  blues: {
    two: [[0, "m7"], [5, "7sus4"]],
    sus: [[0, "7sus4"], [5, "7sus4"]],
    swing: [[0, "m7"], [5, "7sus4"]],
    why: { four: "Its notes hold only one home chord and one partner; for a longer form use the 12-bar blues." },
  },
  "blues-major": {
    sus: [[0, "fifths"], [7, "fifths"]],
    why: {
      two: "Its only chords, the home chord and the vi, share the same notes, so a two-chord loop would not move. Use the pad or the 12-bar blues.",
      four: ONE_CHORD, swing: "Use the 12-bar blues: that is what this scale is for.",
    },
  },
  /* Whole tone: only augmented chords exist, and only two of them. */
  whole: {
    two: [[0, "7#5"], [2, "7#5"]],
    why: { four: TWO_ONLY, swing: "With no perfect 5th anywhere it floats rather than swings." },
  },
  /* Augmented: major 7th chords a major third apart (the Coltrane cycle). */
  aug: {
    two: [[0, "maj7"], [8, "maj7"]],
    four: [[0, "maj7"], [8, "maj7"], [4, "maj7"], [8, "maj7"]],
    swing: [[0, "maj7"], [8, "maj7"]],
  },
  /* Prometheus: the Lydian dominant sound, I9♯11 to II7. */
  prometheus: {
    two: [[0, "9#11"], [2, "7"]],
    swing: [[0, "9#11"], [2, "7"]],
    why: { four: TWO_ONLY },
  },
  /* Petrushka: two dominant 7ths a tritone apart. */
  petrushka: {
    two: [[0, "7"], [6, "7"]],
    swing: [[0, "7"], [6, "7"]],
    why: { four: TWO_ONLY },
  },
  /* Messiaen mode 5: no triad at all; two sus chords a tritone apart. */
  messiaen5: {
    sus: [[0, "sus4"], [6, "sus4"]],
    why: {
      two: "It holds no major or minor chord at all, only suspended ones: use the open pad.",
      four: "It holds no major or minor chord at all, only suspended ones: use the open pad.",
      swing: "It holds no major or minor chord at all, only suspended ones: use the open pad.",
    },
  },
  /* Octatonic whole–half: the home chord is diminished. */
  "dim-wh": {
    two: [[0, "dim7"], [2, "dim7"]],
    why: { four: "Its home chord is diminished; the two diminished chords are the whole scale.", swing: NO_GROOVE },
  },
  /* Octatonic half–whole: four dominant 7ths a minor third apart. */
  "dim-hw": {
    two: [[0, "7"], [3, "7"]],
    four: [[0, "7"], [3, "7"], [6, "7"], [9, "7"]],
    swing: [[0, "7"], [9, "7"]],
  },
  penta: {
    two: [[0, "maj"], [9, "min"]],
    four: [[0, "maj"], [9, "min"], [2, "7sus4"], [7, "sus4"]],
    sus: [[0, "fifths"], [7, "fifths"]],
    swing: [[0, "6"], [2, "7sus4"]],
  },
  hepta: {
    two: [[0, "maj7"], [5, "maj7"]],
    four: [[0, "maj"], [7, "maj"], [9, "min"], [5, "maj"]],
    sus: [[0, "fifths"], [5, "fifths"]],
    swing: [[0, "maj7"], [9, "m7"], [2, "m7"], [7, "7"]],
  },
  hirajoshi: {
    two: [[0, "min"], [8, "maj7"]],
    sus: [[0, "fifths"]],
    why: { four: TWO_ONLY, swing: "A koto scale: it wants long notes, not a swing groove." },
  },
  insen: {
    two: [[0, "7sus4"], [10, "min"]],
    sus: [[0, "7sus4"], [5, "sus4"]],
    why: { four: TWO_ONLY, swing: "It wants long, still notes, not a swing groove." },
  },
  iwato: {
    sus: [[0, "quartal"]],
    why: { two: NO_HOME, four: NO_HOME, swing: NO_GROOVE },
  },
  kumoi: {
    two: [[0, "m6"], [2, "7sus4"]],
    sus: [[0, "fifths"], [7, "fifths"]],
    swing: [[0, "m6"], [2, "7sus4"]],
    why: { four: TWO_ONLY },
  },
  yo: {
    two: [[0, "sus2"], [5, "maj"]],
    four: [[0, "sus2"], [2, "m7"], [5, "maj"], [7, "7sus4"]],
    sus: [[0, "fifths"], [5, "fifths"]],
    why: { swing: "A folk scale with no 3rd on its home note: it sings, it does not swing." },
  },
  /* Hijaz: the flamenco and klezmer move, I to ♭II. */
  hijaz: {
    two: [[0, "maj"], [1, "maj"]],
    four: [[0, "maj"], [5, "min"], [10, "min"], [1, "maj"]],
    sus: [[0, "sus4"], [10, "sus2"]],
    why: { swing: "Its sound is the I–♭II move, not a swing groove." },
  },
};

/** The progression table's key for a scale: diatonic modes by rotation. */
export const scaleKey = (scale: ScaleInstance) =>
  scale.family.kind === "rotation" ? `${scale.family.id}:${scale.modeIndex}` : scale.family.id;

/* ── building a chord ─────────────────────────────────────────────────── */

const semisOf = (scale: ScaleInstance) =>
  scale.notes.map((n) => mod(pc(n) - pc(scale.notes[0]), 12));

/** The scale's own note on a semitone above the tonic, or undefined. */
function scaleNoteAt(scale: ScaleInstance, semis: number): Note | undefined {
  const target = mod(pc(scale.notes[0]) + semis, 12);
  return scale.notes.find((n) => pc(n) === target);
}

/** Stacked fifths from a root, as far as the scale allows (max four notes). */
function fifthsFrom(scale: ScaleInstance, rootPc: number): number[] {
  const have = new Set(scale.pcs);
  const out = [0];
  while (out.length < 4 && have.has(mod(rootPc + out[out.length - 1] + 7, 12)))
    out.push(out[out.length - 1] + 7);
  return out;
}

/** A pad for scales with no hand-written one: the root plus two notes of the
 *  scale that are not a 3rd, preferring the 5th, 9th and 13th. */
function openFrom(scale: ScaleInstance, rootPc: number): number[] {
  const have = new Set(scale.pcs);
  const out = [0];
  for (const s of [7, 2, 9, 11, 5, 10, 6, 1, 8]) {
    if (out.length === 3) break;
    if (have.has(mod(rootPc + s, 12))) out.push(s);
  }
  // spread it: every added note above the first octave except the 5th
  return out.map((s) => (s === 7 || s === 0 ? s : s + 12)).sort((a, b) => a - b);
}

/** Intervals of a spec on this scale, or null if the scale lacks a note. */
function intervalsOf(scale: ScaleInstance, rootPc: number, q: Quality): number[] | null {
  const iv = q === "fifths" ? fifthsFrom(scale, rootPc)
    : q === "open" ? openFrom(scale, rootPc) : SHAPE[q];
  if (q === "fifths" && iv.length < 3) return null;
  const have = new Set(scale.pcs);
  return iv.every((s) => have.has(mod(rootPc + s, 12))) ? iv : null;
}

/** Name the chord: the chord table's own spelling when it knows a name on
 *  this root, otherwise the root plus the quality's suffix. */
function nameChord(scale: ScaleInstance, root: Note, pcs: number[], q: Quality) {
  const key = [...new Set(pcs)].sort((a, b) => a - b).join(",");
  const size = key.split(",").length;
  if ((size === 3 || size === 4) && q !== "open" && q !== "fifths") {
    const set = findChords(scale.notes, [size as 3 | 4]).find((c) => c.pcs.join(",") === key);
    if (set) {
      const onRoot = set.names.filter((x) => pc(parseNoteName(x.root)) === pc(root));
      const main = onRoot.find((x) => x.symbol.endsWith(SUFFIX[q]) ) ?? onRoot[0];
      if (main) {
        const other = set.names.find((x) => x !== main && x.family === "tertian" && pc(parseNoteName(x.root)) !== pc(root));
        return { label: main.symbol, alt: other?.symbol, root: parseNoteName(main.root) };
      }
    }
  }
  if (q === "fifths") {
    const n = pcs.length;
    return { label: noteName(root) + (n === 4 ? "6sus2" : "sus2"), root };
  }
  return { label: noteName(root) + SUFFIX[q], root };
}

/** Roman numeral of a spec against the tonic: the triad form and the full form. */
function numerals(scale: ScaleInstance, root: Note, q: Quality, pedal: boolean) {
  const tonic = scale.notes[0];
  const t = TRIAD_OF[q];
  let base = romanNumeral(tonic, root, t === "sus" ? "maj" : t);
  const roman = t === "sus" ? base + "sus" : base;
  let full = base;
  if (q === "m7b5") full = base.replace("°", "ø7");
  else if (q === "open") full = base;
  else full = base + (EXT[q] ?? "");
  if (pedal) full += "/I";
  return { roman, numeral: full };
}

const clampTo = (m: number, lo: number, hi: number) => {
  let v = m;
  while (v < lo) v += 12;
  while (v > hi) v -= 12;
  return v;
};

/** Bass register: C2 to B2, so every root sits low and in the same octave band. */
const bassOf = (p: number) => 36 + mod(p, 12);

/**
 * Voice-lead a set of pitch classes into the comping range, as close as
 * possible to the previous chord. With no previous chord, sit near D4.
 */
export function voiceLead(pcs: number[], prev: number[] | null, lo = 53, hi = 76): number[] {
  const options = pcs.map((p) => {
    const out: number[] = [];
    for (let m = lo; m <= hi; m++) if (mod(m, 12) === mod(p, 12)) out.push(m);
    return out;
  });
  let best: number[] = [];
  let bestCost = Infinity;
  const pick = (i: number, cur: number[]) => {
    if (i === options.length) {
      const s = [...cur].sort((a, b) => a - b);
      const span = s[s.length - 1] - s[0];
      if (span > 16) return;
      let cost: number;
      if (prev && prev.length) {
        cost = 0;
        for (const m of s) cost += Math.min(...prev.map((q) => Math.abs(q - m)));
        for (const q of prev) cost += Math.min(...s.map((m) => Math.abs(q - m))) * 0.5;
      } else {
        cost = Math.abs(s.reduce((a, b) => a + b, 0) / s.length - 63);
      }
      cost += span * 0.05;
      if (cost < bestCost) { bestCost = cost; best = s; }
      return;
    }
    for (const m of options[i]) pick(i + 1, [...cur, m]);
  };
  pick(0, []);
  return best;
}

/** Place an open pad shape so its bottom note is near the previous pad's. */
function placePad(rootPc: number, shape: number[], prev: number[] | null): number[] {
  const target = prev && prev.length ? prev[0] : 52;
  let base = clampTo(48 + mod(rootPc - 48, 12), 48, 59);
  if (Math.abs(base + 12 - target) < Math.abs(base - target) && base + 12 <= 59) base += 12;
  if (Math.abs(base - 12 - target) < Math.abs(base - target) && base - 12 >= 48) base -= 12;
  /* fold anything above C6 down an octave so the pad stays mid-range */
  return shape.map((s) => base + s).map((m) => (m > 81 ? m - 12 : m)).sort((a, b) => a - b);
}

function buildChord(scale: ScaleInstance, spec: Spec, prev: number[] | null, asPad: boolean): VoicedChord | null {
  const [semi, q, pedal] = spec;
  const rootSpelled = scaleNoteAt(scale, semi);
  if (!rootSpelled) return null;
  const rootPc = pc(rootSpelled);
  const iv = intervalsOf(scale, rootPc, q);
  if (!iv) return null;
  if (pedal !== undefined && !scaleNoteAt(scale, pedal)) return null;
  const pcs = [...new Set(iv.map((s) => mod(rootPc + s, 12)))];
  const named = nameChord(scale, rootSpelled, pcs, q);
  const bassPc = pedal !== undefined ? mod(pc(scale.notes[0]) + pedal, 12) : rootPc;
  /* Pads keep an open shape only on the pad loop; a sus chord inside a
     progression is voice-led like any other chord. */
  const pad = asPad && PAD.has(q);
  const shape = q === "fifths" || q === "open" ? iv : OPEN[q];
  let voicing: number[];
  if (pad && shape) voicing = placePad(rootPc, shape, prev);
  else {
    /* A five-note chord leaves its root to the bass. */
    const upper = pcs.length > 4 ? pcs.filter((p) => p !== rootPc) : pcs;
    voicing = voiceLead(upper, prev);
  }
  const label = pedal !== undefined ? `${named.label}/${noteName(scaleNoteAt(scale, pedal)!)}` : named.label;
  const chordTones = pedal !== undefined ? [...new Set([...pcs, bassPc])] : pcs;
  return {
    label, altLabel: pedal !== undefined ? undefined : named.alt,
    bass: bassOf(bassPc), voicing, chordTones,
    degreeRoot: scale.notes.findIndex((n) => pc(n) === rootPc),
    root: named.root, quality: q, pad,
  };
}

function stepOf(scale: ScaleInstance, chord: VoicedChord, bars: number, pedal: boolean): VampStep {
  const { roman, numeral } = numerals(scale, chord.root, chord.quality, pedal);
  const fn = harmonicFunction(scale.notes[0], chord.root);
  return { chord, bars, roman, numeral, fn, fnLabel: FUNCTION_LABEL[fn] };
}

/** Root and fifth (or root and octave, when the scale has no perfect fifth). */
function droneChord(scale: ScaleInstance): VoicedChord {
  const t = scale.notes[0];
  const r = clampTo(midi(note(t.letter, t.alt, 3)), 55, 66);
  const hasFifth = semisOf(scale).includes(7);
  return {
    label: noteName(t),
    bass: bassOf(pc(t)),
    voicing: hasFifth ? [r, r + 7, r + 12] : [r, r + 12],
    chordTones: hasFifth ? [pc(t), (pc(t) + 7) % 12] : [pc(t)],
    degreeRoot: 0,
    root: t, quality: hasFifth ? "fifths" : "open", pad: true,
  };
}

const BARS: Record<LoopId, (n: number) => number> = {
  two: () => 2, four: () => 1, sus: (n) => (n === 1 ? 4 : 2), swing: (n) => (n >= 4 ? 1 : 2),
};

/** The progression for a loop on this scale; empty when it cannot be built. */
export function buildVamp(scale: ScaleInstance, vamp: VampDef, _style?: VoicingStyle): VampStep[] {
  if (scale.error || !scale.notes.length || vamp.id === "blues") return [];
  if (vamp.id === "drone") {
    const chord = droneChord(scale);
    return [{ chord, bars: 4, roman: "I", numeral: "I", fn: "tonic", fnLabel: FUNCTION_LABEL.tonic }];
  }
  const id = vamp.id as LoopId;
  let specs = PROGRESSIONS[scaleKey(scale)]?.[id];
  /* A scale with no hand-written pad still gets one, from its own notes. */
  if (!specs && id === "sus" && !PROGRESSIONS[scaleKey(scale)]?.why?.sus) specs = [[0, "open"]];
  if (!specs) return [];
  const out: VampStep[] = [];
  let prev: number[] | null = null;
  for (const spec of specs) {
    const chord = buildChord(scale, spec, prev, id === "sus");
    if (!chord) return [];                      // never play a chord the scale lacks
    prev = chord.voicing;
    out.push(stepOf(scale, chord, BARS[id](specs.length), spec[2] !== undefined));
  }
  return out;
}

/** The plain reason a loop is not offered for this scale, or null if it is. */
export function whyNot(scale: ScaleInstance, id: BedId): string | null {
  if (id === "drone" || id === "blues") return null;
  if (buildVamp(scale, vampById(id)).length) return null;
  return PROGRESSIONS[scaleKey(scale)]?.why?.[id as LoopId]
    ?? "This scale does not have the chords for this loop.";
}

/** The loops this scale can carry. The drone always; the blues brings its own chords. */
export function vampsFor(scale: ScaleInstance): VampDef[] {
  return VAMPS.filter((v) => v.id === "blues" || v.id === "drone" || buildVamp(scale, v).length > 0);
}

/** Guide tones: which of the scale's notes are chord tones right now, and which
 *  are the colour notes that make the line move. Both are correct to play — the
 *  distinction is what to LAND on. */
export function guideTones(scale: ScaleInstance, chord: { chordTones: number[] }) {
  const chordPcs = new Set(chord.chordTones);
  return {
    chordTones: scale.notes.filter((x) => chordPcs.has(pc(x))),
    colourTones: scale.notes.filter((x) => !chordPcs.has(pc(x))),
  };
}

/* ── the bass line ────────────────────────────────────────────────────── */

export type Feel = "straight" | "swing" | "68";
const HITS: Record<Feel, number> = { straight: 2, swing: 4, "68": 2 };

/** Every note of the scale from E1 to C4, low to high: the bass's ladder. */
const ladderOf = (pcs: number[]) => {
  const have = new Set(pcs.map((p) => mod(p, 12)));
  const out: number[] = [];
  for (let m = 28; m <= 60; m++) if (have.has(mod(m, 12))) out.push(m);
  return out;
};
const nearestIdx = (ladder: number[], m: number) => {
  let best = 0;
  for (let i = 0; i < ladder.length; i++) if (Math.abs(ladder[i] - m) < Math.abs(ladder[best] - m)) best = i;
  return best;
};

const sgn = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const dirChanges = (ms: number[]) => {
  let n = 0, last = 0;
  for (let i = 1; i < ms.length; i++) {
    const d = sgn(ms[i] - ms[i - 1]);
    if (d && last && d !== last) n++;
    if (d) last = d;
  }
  return n;
};

/**
 * One bar of walking bass on the scale's own notes: the root on beat 1, a
 * step away from the next root on beat 4, and the smoothest line between,
 * preferring chord tones on beats 2 and 3. Four different notes, no leap
 * bigger than a 5th.
 */
function walkBar(ladder: number[], root: number, target: number, chordPcs: number[]): number[] {
  const a = nearestIdx(ladder, root);
  const t = nearestIdx(ladder, target);
  const ok = (i: number) => i >= 0 && i < ladder.length;
  const isChord = (i: number) => chordPcs.includes(mod(ladder[i], 12));
  let best: number[] = [ladder[a], ladder[a], ladder[a], ladder[a]];
  let bestCost = Infinity;
  for (const ap of [t - 1, t + 1]) {
    if (!ok(ap) || ap === a) continue;
    for (let x = a - 4; x <= a + 4; x++)
      for (let y = a - 4; y <= a + 4; y++) {
        if (!ok(x) || !ok(y)) continue;
        const line = [ladder[a], ladder[x], ladder[y], ladder[ap]];
        if (new Set(line).size < 4) continue;
        const moves = [line[1] - line[0], line[2] - line[1], line[3] - line[2], ladder[t] - line[3]];
        if (moves.some((m) => Math.abs(m) > 7)) continue;
        const cost = moves.slice(0, 3).reduce((n, m) => n + Math.abs(m), 0)
          + dirChanges([...line, ladder[t]]) * 2.5
          - (isChord(y) ? 2 : 0) - (isChord(x) ? 1 : 0);
        if (cost < bestCost) { bestCost = cost; best = line; }
      }
  }
  return best;
}

/**
 * The bass for each bar of each chord, one note per hit of the feel's pattern.
 * Straight and 6/8: root, then the 5th (or the octave where the chord has no
 * 5th). Swing: a walking line on the scale's own notes that steps toward the
 * next chord's root and arrives on it on beat 1. Every note is a scale note.
 */
export function bassWalk(
  scalePcs: number[],
  chords: { bass: number; chordTones: number[]; bars: number; pedal?: boolean }[],
  feel: Feel,
): number[][][] {
  const ladder = ladderOf(scalePcs);
  const have = new Set(scalePcs.map((p) => mod(p, 12)));
  return chords.map((c, ci) => {
    const next = chords[(ci + 1) % chords.length];
    return Array.from({ length: Math.max(1, c.bars) }, (_, b) => {
      const root = c.bass;
      const fifth = mod(root + 7, 12);
      const upper = c.chordTones.includes(fifth) && have.has(fifth) && !c.pedal ? root + 7 : root + 12;
      if (feel !== "swing") return HITS[feel] === 2 ? [root, upper] : [root];
      const target = b === c.bars - 1 ? next.bass : root;
      return walkBar(ladder, root, target, c.chordTones);
    });
  });
}

/* ── the example phrase ───────────────────────────────────────────────── */

export interface PhraseNote { at: number; midi: number; dur: number; vel: number }

/** Rhythms for one bar, as [onset, length] in beats. The last is the
 *  phrase ending: one long note. */
const RHYTHMS: Record<Feel, [number, number][][]> = {
  straight: [
    [[0, 1], [1, 1], [2, 2]],
    [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
    [[0, 2], [2, 1], [3, 1]],
    [[0, 3]],
  ],
  swing: [
    [[0, 1], [1, 0.5], [1.5, 0.5], [2, 2]],
    [[0, 0.5], [0.5, 0.5], [1, 1], [2, 1], [3, 1]],
    [[0, 1.5], [1.5, 0.5], [2, 1], [3, 1]],
    [[0, 2.5]],
  ],
  "68": [
    [[0, 2], [2, 1], [3, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 2], [5, 1]],
    [[0, 3], [3, 2], [5, 1]],
    [[0, 5]],
  ],
};
const CONTOUR = [0, 3, 2, -4];
const LEAD_LO = 64, LEAD_HI = 81;

/**
 * The notes of one bar, as positions on the lead's ladder of scale notes:
 * start on the landing note, move by step (never repeating a note), put a
 * chord tone on any strong beat, and finish a step away from the next bar's
 * landing note so the line arrives on it.
 */
function fillBar(
  size: number, from: number, to: number, k: number, strong: boolean[], isChord: (i: number) => boolean,
): number[] {
  if (k === 1) return [from];
  let best: number[] = Array.from({ length: k }, () => from);
  let bestCost = Infinity;
  const approaches = [to - 1, to + 1].filter((x) => x >= 0 && x < size);
  const walk = (line: number[]) => {
    if (line.length === k - 1) {
      for (const ap of approaches) {
        const full = [...line, ap];
        const last = Math.abs(ap - line[line.length - 1]);
        if (last === 0 || last > 4) continue;
        let cost = 0;
        for (let j = 1; j < k; j++) {
          const step = Math.abs(full[j] - full[j - 1]);
          cost += step + (step > 2 ? 3 : 0);          // steps first, small skips if need be
        }
        cost += dirChanges([...full, to]) * 1.5;
        for (let j = 1; j < k - 1; j++) if (strong[j] && !isChord(full[j])) cost += 4;
        if (cost < bestCost) { bestCost = cost; best = full; }
      }
      return;
    }
    const prev = line[line.length - 1];
    for (const d of [-3, -2, -1, 1, 2, 3]) {
      const x = prev + d;
      if (x < 0 || x >= size) continue;
      walk([...line, x]);
    }
  };
  walk([from]);
  return best;
}

/**
 * A short improvised line over the loop, for a beginner to copy: made only of
 * the scale's notes, landing on a chord tone on every downbeat (and on beat 3
 * where a note starts there), moving by step in between, and ending each
 * four-bar phrase on a long note.
 *
 * `bars` lists, for each bar of the loop, the pitch classes of the chord
 * sounding in that bar.
 */
export function examplePhrase(
  scalePcs: number[], bars: number[][], feel: Feel, beatsPerBar: number,
): PhraseNote[] {
  const have = new Set(scalePcs.map((p) => mod(p, 12)));
  const ladder: number[] = [];
  for (let m = LEAD_LO; m <= LEAD_HI; m++) if (have.has(mod(m, 12))) ladder.push(m);
  const landing = (pcs: number[]) => {
    const inScale = pcs.filter((p) => have.has(mod(p, 12)));
    return ladder.filter((m) => (inScale.length ? inScale : scalePcs).includes(mod(m, 12)));
  };

  // 1. The note each bar lands on: a chord tone, following a gentle arch.
  const targets: number[] = [];
  let prev = 71;
  bars.forEach((pcs, i) => {
    const opts = landing(pcs);
    const aim = i === 0 ? 69 : prev + CONTOUR[i % 4];
    let pick = opts.reduce((b, m) => (Math.abs(m - aim) < Math.abs(b - aim) ? m : b), opts[0]);
    /* move on to a different chord tone when there is one close by */
    const alt = opts.filter((m) => m !== prev && Math.abs(m - prev) <= 7);
    if (pick === prev && alt.length && i % 4 !== 3)
      pick = alt.reduce((b, m) => (Math.abs(m - aim) < Math.abs(b - aim) ? m : b), alt[0]);
    targets.push(pick);
    prev = pick;
  });

  // 2. Fill each bar by step toward the next bar's landing note.
  const out: PhraseNote[] = [];
  const scaleBar = beatsPerBar / (feel === "68" ? 6 : 4);
  bars.forEach((pcs, i) => {
    const ending = i % 4 === 3 || i === bars.length - 1;
    const rhythm = RHYTHMS[feel][ending ? 3 : i % 3];
    const from = ladder.indexOf(targets[i]);
    const to = ladder.indexOf(targets[(i + 1) % bars.length]);
    const chordSet = new Set(landing(pcs).map((m) => mod(m, 12)));
    const strong = rhythm.map(([on]) => (feel === "68" ? on === 3 : on === 2));
    const line = fillBar(ladder.length, from, to, rhythm.length, strong, (x) => chordSet.has(mod(ladder[x], 12)));
    rhythm.forEach(([on, len], j) => {
      out.push({ at: i * beatsPerBar + on * scaleBar, midi: ladder[line[j]], dur: len * scaleBar, vel: j === 0 ? 0.56 : 0.46 });
    });
  });
  return out;
}

/* ── what to try ──────────────────────────────────────────────────────── */

const pretty = (s: string) => s.replace(/([A-G])b/g, "$1♭").replace(/#/g, "♯");

/** The note of `b` that `a` does not have: the one to aim for when the chord changes. */
function changingNote(scale: ScaleInstance, a: VoicedChord, b: VoicedChord): string | null {
  const n = scale.notes.find((x) => b.chordTones.includes(pc(x)) && !a.chordTones.includes(pc(x)));
  return n ? pretty(noteName(n)) : null;
}

/** One line of advice for this loop on this scale, computed from its chords. */
export function tryThis(scale: ScaleInstance, id: BedId, steps: VampStep[]): string {
  const home = pretty(noteName(scale.notes[0]));
  if (!steps.length) return "";
  if (id === "drone") {
    const colour = scale.notes.filter((n) => !steps[0].chord.chordTones.includes(pc(n))).map((n) => pretty(noteName(n)));
    return `Hold each note for a bar and hear its colour against ${home}. ${colour.slice(0, 3).join(", ")} lean; ${home} is home.`;
  }
  if (id === "sus") {
    return "Nothing here pulls, so every note of the scale sounds settled. Play long notes and let them ring into the next chord.";
  }
  const labels = steps.map((s) => pretty(s.chord.label));
  const aims = steps.map((s, i) => changingNote(scale, steps[(i - 1 + steps.length) % steps.length].chord, s.chord));
  if (id === "two") {
    const parts = [
      aims[1] && `${aims[1]} as ${labels[1]} arrives`,
      aims[0] && `${aims[0]} as ${labels[0]} comes back`,
    ].filter(Boolean);
    return parts.length
      ? `Aim for the note that changes: ${parts.join(", and ")}.`
      : `Land on a lit note at the start of each chord.`;
  }
  if (id === "swing") {
    return `Play pairs of eighths long–short, and land on a lit note on beat 1 of each bar. ${aims[1] ? `${aims[1]} is the note that says ${labels[1]}.` : ""}`.trim();
  }
  // four: a guide-tone line, one note per bar, moving as little as possible
  const line: string[] = [];
  let last = -1;
  for (const s of steps) {
    /* the guide tones first: the 3rd and the 7th, which say what the chord is */
    const r = pc(s.chord.root);
    const guide = scale.notes.filter((n) => s.chord.chordTones.includes(pc(n)) && [3, 4, 10, 11].includes(mod(pc(n) - r, 12)));
    const other = scale.notes.filter((n) => s.chord.chordTones.includes(pc(n)) && pc(n) !== r && pc(n) !== mod(s.chord.bass, 12));
    const pool = guide.length ? guide : other.length ? other : scale.notes.filter((n) => s.chord.chordTones.includes(pc(n)));
    const dist = (n: Note) => (last < 0 ? 0 : Math.min(mod(pc(n) - last, 12), mod(last - pc(n), 12)));
    const pick = pool.reduce((b, n) => (dist(n) < dist(b) ? n : b), pool[0]);
    last = pc(pick);
    line.push(pretty(noteName(pick)));
  }
  return `Play one long note per bar, the chord's 3rd or 7th, moving as little as possible: ${line.join(" – ")}.`;
}

/**
 * Where the loop is heading: from the bar and beat now sounding, how many
 * beats until the next chord, and which chord that is. null for a one-chord bed.
 */
export function nextChange(
  bars: number[], bar: number, beat: number, beatsPerBar: number, labels?: string[],
): { beats: number; index: number } | null {
  if (bars.length < 2) return null;
  if (labels && new Set(labels).size < 2) return null;
  let end = 0;
  for (let i = 0; i < bars.length; i++) {
    end += bars[i];
    if (bar > end) continue;
    let beats = (end - bar) * beatsPerBar + (beatsPerBar - beat) + 1;
    let next = (i + 1) % bars.length;
    /* A repeated chord (C7 C7 C7 C7) is not a change: count on to the next new one. */
    while (labels && labels[next] === labels[i]) {
      beats += bars[next] * beatsPerBar;
      next = (next + 1) % bars.length;
    }
    return { beats, index: next };
  }
  return null;
}
