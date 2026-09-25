/**
 * Two-triad pairs — curated exact-cover collections.
 *
 * "Exact cover" is deliberately stricter than "two chords that fit a scale":
 * the two pitch-class sets may not overlap, and together they must account for
 * every note. That is what lets the two shapes alternate through every
 * inversion with each voice moving one scale step.
 */

import {
  Alt, Letter, letterIndex, midi, note, Note, notePretty, noteName, parseNoteName, pc,
  spell, stepLetter, MAJOR_KEYS,
} from "./note";
import { buildDiatonic, buildScale, FAMILIES, MAJOR } from "./scales";
import {
  exactCoverMovement,
  InterlockedMovement,
  MovementKind,
} from "./movement";

export interface PairAtlasEntry {
  id: string;
  title: string;
  /** the two chords, in roman numerals or words */
  subtitle: string;
  /** scale degrees; tests check it against `semis` */
  formula: string;
  voices: 3 | 4;
  defaultKey: string;
  /** one short, true line about the sound */
  description: string;
  /** semitones above the tonic — always given, so nothing depends on a menu */
  semis: number[];
  /** use this scale family's own spelling when the app still has it */
  familyId?: string;
}

export const PAIR_ATLAS: PairAtlasEntry[] = [
  {
    id: "major-no7", title: "Major, no 7th", subtitle: "I + ii",
    formula: "1 2 3 4 5 6", voices: 3, defaultKey: "G", semis: [0, 2, 4, 5, 7, 9],
    description: "The tonic chord and the chord a step above it. The friendliest place to start.",
  },
  {
    id: "minor-no6", title: "Minor, no ♭6", subtitle: "i + ♭VII",
    formula: "1 2 ♭3 4 5 ♭7", voices: 3, defaultKey: "G", semis: [0, 2, 3, 5, 7, 10],
    description: "A minor triad and the major triad a whole step below it.",
  },
  {
    id: "major-no3", title: "Major, no 3rd", subtitle: "IV + V",
    formula: "1 2 4 5 6 7", voices: 3, defaultKey: "G", semis: [0, 2, 5, 7, 9, 11],
    description: "No 3rd, so the tonic never says major or minor. Two major shapes do all the work.",
  },
  {
    id: "dorian-pair", title: "Minor, no 7th", subtitle: "i + ii",
    formula: "1 2 ♭3 4 5 6", voices: 3, defaultKey: "G", semis: [0, 2, 3, 5, 7, 9],
    description: "Two minor triads a whole step apart. The natural 6 gives it the Dorian colour.",
  },
  {
    id: "lydian-pair", title: "Lydian pair", subtitle: "I + II",
    formula: "1 2 3 ♯4 5 6", voices: 3, defaultKey: "G", semis: [0, 2, 4, 6, 7, 9],
    description: "Two major triads a whole step apart. The ♯4 is the bright note.",
  },
  {
    id: "mixolydian-pair", title: "Mixolydian pair", subtitle: "I + ♭VII",
    formula: "1 2 3 4 5 ♭7", voices: 3, defaultKey: "G", semis: [0, 2, 4, 5, 7, 10],
    description: "Two major triads a whole step apart, the second one below the tonic.",
  },
  {
    id: "phrygian-pair", title: "Phrygian pair", subtitle: "i + ♭II",
    formula: "1 ♭2 ♭3 4 5 ♭6", voices: 3, defaultKey: "G", semis: [0, 1, 3, 5, 7, 8],
    description: "A minor triad and the major triad a semitone above it.",
  },
  {
    id: "major-pair-semitone", title: "Semitone pair", subtitle: "I + ♭II",
    formula: "1 ♭2 3 4 5 ♭6", voices: 3, defaultKey: "G", semis: [0, 1, 4, 5, 7, 8],
    description: "One major-triad shape, then the same shape a semitone higher.",
  },
  {
    id: "tritone-pair", title: "Tritone pair", subtitle: "two major triads a tritone apart (e.g. G + D♭)",
    formula: "1 ♭2 3 ♭5 5 ♭7", voices: 3, defaultKey: "G", semis: [0, 1, 4, 6, 7, 10],
    description: "The third and last distance at which two major triads share no note. Also called the Petrushka chord.",
  },
  {
    id: "whole-tone-augmented-pair", title: "Whole-tone pair", subtitle: "two augmented triads a whole step apart",
    formula: "1 2 3 ♯4 ♯5 ♭7", voices: 3, defaultKey: "G", semis: [0, 2, 4, 6, 8, 10], familyId: "whole",
    description: "Together they make the whole-tone scale. The shape never changes, so neither does the fingering.",
  },
  {
    id: "augmented-scale-pair", title: "Augmented pair", subtitle: "two augmented triads a semitone apart",
    formula: "1 ♭3 3 5 ♯5 7", voices: 3, defaultKey: "G", semis: [0, 3, 4, 7, 8, 11], familyId: "aug",
    description: "Together they make the augmented scale.",
  },
  {
    id: "true-octatonic", title: "Two diminished sevenths", subtitle: "eight notes · four inversions each",
    formula: "1 2 ♭3 4 ♭5 ♭6 6 7", voices: 4, defaultKey: "G", semis: [0, 2, 3, 5, 6, 8, 9, 11], familyId: "dim-wh",
    description: "The same idea with eight notes: alternate notes of the whole–half diminished scale give two diminished 7th chords.",
  },
];

/* ── the seven adjacent triad pairs of a major scale ──────────────────────
   Neighbouring triads of a major scale never share a note, so each pair is an
   exact six-note cover that leaves out one degree. Computed, not listed.   */

const ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

export interface AdjacentPair {
  pair: string;          // "I + ii"
  chords: [string, string];
  omitted: string;       // the note left out, e.g. "F#"
  omittedDegree: number; // 1-7
}

export function adjacentDiatonicPairs(key = "G"): AdjacentPair[] {
  const full = buildDiatonic(key, MAJOR)!;
  const triad = (d: number) => [0, 2, 4].map((k) => full[(d + k) % 7]);
  const quality = (ns: Note[]) => {
    const a = ((pc(ns[1]) - pc(ns[0])) % 12 + 12) % 12;
    const b = ((pc(ns[2]) - pc(ns[0])) % 12 + 12) % 12;
    return a === 4 ? "" : b === 6 ? "°" : "m";
  };
  return full.map((_, d) => {
    const e = (d + 1) % 7;
    const [a, b] = [triad(d), triad(e)];
    const used = new Set([...a, ...b].map(pc));
    const omittedIdx = full.findIndex((n) => !used.has(pc(n)));
    return {
      pair: `${ROMAN[d]} + ${ROMAN[e]}`,
      chords: [noteName(a[0]) + quality(a), noteName(b[0]) + quality(b)] as [string, string],
      omitted: noteName(full[omittedIdx]),
      omittedDegree: omittedIdx + 1,
    };
  });
}

/** The seven adjacent pairs in G, the app's default key. */
export const DIATONIC_EXACT_COVERS = adjacentDiatonicPairs("G");

/* ── spelling an exact-cover pair for its CHORDS ───────────────────────────
   A general scale speller optimises the scale as a line, and for most keys
   that also spells the two shapes correctly. It cannot always do both: the
   semitone pair in Db needs Db D F F# Ab A to read as Db major plus D major,
   which uses only three letters and is a poor scale spelling by any other
   measure. The Atlas exists to show chord symbols, so here the chords win —
   otherwise it prints "D" over the notes D, Gb, A.

   Each shape is spelled from its own root as root / root+2 / root+4 letters,
   which is what makes a triad a triad on paper.                             */

const TRIAD_SHAPES: number[][] = [[0, 4, 7], [0, 3, 7], [0, 3, 6], [0, 4, 8]];

/** Root pitch class and interval shape of a three-note set, if it is tertian. */
function tertianRoot(pcs: number[]): { root: number; shape: number[] } | null {
  for (const root of pcs) {
    const iv = pcs.map((p) => ((p - root) % 12 + 12) % 12).sort((a, b) => a - b);
    const hit = TRIAD_SHAPES.find((s) => s.every((x, i) => x === iv[i]));
    if (hit) return { root, shape: hit };
  }
  return null;
}

/** Spell one triad with letters a third apart, given the root's letter. */
function spellFromRootLetter(
  rootLetter: Letter, root: number, shape: number[],
): Note[] | null {
  const out: Note[] = [];
  for (let i = 0; i < shape.length; i++) {
    const s = spell(stepLetter(rootLetter, i * 2), (root + shape[i]) % 12, 4);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

const altCost = (ns: Note[], flatLean: boolean) =>
  ns.reduce((a, n) => a + (Math.abs(n.alt) === 2 ? 10000 : Math.abs(n.alt) === 1 ? 100 : 0), 0) +
  ns.filter((n) => n.alt !== 0 && n.alt > 0 === flatLean).length * 10 +
  (ns.some((n) => n.alt > 0) && ns.some((n) => n.alt < 0) ? 1 : 0);

/**
 * Spell the whole collection so that BOTH shapes read as real chords.
 * Returns null when the set is not two tertian triads, so the caller can fall
 * back to the ordinary scale speller.
 */
function spellPairForChords(tonicName: string, semis: number[]): Note[] | null {
  if (semis.length !== 6) return null;
  const t = parseNoteName(tonicName);
  const pcs = semis.map((s) => (pc(t) + s) % 12);
  const shapes = [[0, 2, 4], [1, 3, 5]].map((ix) => ix.map((i) => pcs[i]));
  const flatLean = (MAJOR_KEYS[tonicName] ?? 0) < 0 || tonicName.endsWith("b");

  const byPc = new Map<number, Note>();
  for (const shapePcs of shapes) {
    const found = tertianRoot(shapePcs);
    if (!found) return null;
    const { root, shape } = found;
    /* An augmented triad divides the octave evenly, so it has three equally
       good roots and no single correct spelling — C E G#, E G# B# and Ab C E
       are the same chord. Leave those to the family that defined them. */
    if (shape[1] === 4 && shape[2] === 8) return null;
    /* The shape holding the tonic must keep the tonic's own letter, whichever
       chord member the tonic happens to be. */
    const tonicMember = shapePcs.includes(pc(t))
      ? shape.findIndex((iv) => (root + iv) % 12 === pc(t))
      : -1;
    let best: Note[] | null = null;
    let bestCost = Infinity;
    const candidates: Letter[] = tonicMember >= 0
      ? [stepLetter(t.letter, (7 - tonicMember * 2) % 7)]
      : (["C", "D", "E", "F", "G", "A", "B"] as Letter[]);
    for (const rootLetter of candidates) {
      const cand = spellFromRootLetter(rootLetter, root, shape);
      if (!cand) continue;
      const cost = altCost(cand, flatLean);
      if (cost < bestCost) { bestCost = cost; best = cand; }
    }
    if (!best) return null;
    for (const n of best) byPc.set(pc(n), n);
  }

  /* Lay the six notes out ascending from the tonic. */
  const out: Note[] = [];
  let previous = -Infinity;
  for (const p of pcs) {
    const src = byPc.get(p);
    if (!src) return null;
    let n = note(src.letter, src.alt as Alt, t.octave);
    while (midi(n) <= previous) n = note(n.letter, n.alt, n.octave + 1);
    out.push(n);
    previous = midi(n);
  }
  if (midi(out[out.length - 1]) - midi(out[0]) >= 12) return null;
  return out;
}

/** Do both alternate-degree shapes already read as triads on paper? */
function alreadyInThirds(notes: Note[]): boolean {
  if (notes.length !== 6) return false;
  return [[0, 2, 4], [1, 3, 5]].every((ix) => {
    const shape = ix.map((i) => notes[i]);
    /* The letters must stack in thirds FROM THE CHORD'S OWN ROOT: F A♭ C♯
       stacks by letter from F, but its root is D♭, so it is not D♭ major on
       paper. Augmented triads have no single root; letters alone decide. */
    const found = tertianRoot(shape.map(pc));
    const roots = found && !(found.shape[1] === 4 && found.shape[2] === 8)
      ? shape.filter((n) => pc(n) === found.root)
      : shape;
    return roots.some((r) => {
      const want = new Set([r.letter, stepLetter(r.letter, 2), stepLetter(r.letter, 4)]);
      return new Set(shape.map((n) => n.letter)).size === 3 && shape.every((n) => want.has(n.letter));
    });
  });
}

export function buildAtlasMovement(entry: PairAtlasEntry, tonic: string): InterlockedMovement {
  return pairMovement(tonic, entry.semis, entry.voices, entry.title, entry.description, entry.familyId);
}

/**
 * Any exact-cover pair as an inversion ladder: the scale spelled so both
 * shapes read as chords, then split into alternate degrees. Throws when the
 * alternate degrees do not form two chords (the caller shows the notes only).
 */
export function pairMovement(
  tonic: string, semis: number[], voices: 3 | 4, title = "", description = "", familyId?: string,
): InterlockedMovement {
  const useFamily = !!familyId && FAMILIES.some((f) => f.id === familyId);
  const scale = useFamily
    ? buildScale(tonic, familyId!, 0)
    : buildScale(tonic, "custom", 0, semis);
  if (scale.error) throw new Error(scale.error);
  /* Re-spell for the chords only where the default spelling does not already
     read as two triads. The tritone pair in Ab can come out as Ab A C D Eb Gb,
     which prints the upper shape as D-Gb-A; every key that already reads
     correctly is left untouched. */
  const chordSpelled = voices === 3 && !alreadyInThirds(scale.notes)
    ? spellPairForChords(tonic, semis)
    : null;
  const namedScale = {
    ...scale,
    notes: chordSpelled ?? scale.notes,
    label: title || scale.label,
    teaching: description,
  };
  const kind: MovementKind = voices === 4 ? "octatonic-sevenths" : "hexatonic-triads";
  return exactCoverMovement(kind, namedScale, voices);
}

export interface ExactCoverProof {
  disjoint: boolean;
  complete: boolean;
  pairPcs: [number[], number[]];
}

export function proveExactCover(movement: InterlockedMovement): ExactCoverProof {
  const pairPcs = ([0, 1] as const).map((pair) =>
    [...new Set(movement.steps.find((step) => step.pair === pair)!.notes.map(pc))]
      .sort((a, b) => a - b)
  ) as [number[], number[]];
  const a = new Set(pairPcs[0]);
  const b = new Set(pairPcs[1]);
  const union = new Set([...pairPcs[0], ...pairPcs[1]]);
  return {
    disjoint: pairPcs[0].every((pitch) => !b.has(pitch)),
    complete:
      union.size === movement.scale.notes.length &&
      movement.scale.notes.every((pitch) => union.has(pc(pitch))) &&
      a.size + b.size === union.size,
    pairPcs,
  };
}

export type PairExerciseId =
  | "scale-up-down"
  | "shape-a"
  | "shape-b"
  | "alternating"
  | "scale-chord";

export interface PairExerciseEvent {
  id: string;
  label: string;
  voicing: number[];
  pair: 0 | 1 | null;
  accent: boolean;
}

function scaleEvents(movement: InterlockedMovement, octaves: 1 | 2): PairExerciseEvent[] {
  const ascending = Array.from({ length: octaves }, (_, octave) =>
    movement.scale.notes.map((pitch, degree) => ({
      id: `scale-${octave}-${degree}`,
      label: notePretty(pitch),
      voicing: [midi(pitch) + octave * 12],
      pair: null,
      accent: false,
    }))
  ).flat();
  const top = movement.scale.notes[0];
  ascending.push({
    id: `scale-top-${octaves}`,
    label: notePretty(top),
    voicing: [midi(top) + octaves * 12],
    pair: null,
    accent: false,
  });
  return [...ascending, ...ascending.slice(0, -1).reverse().map((event, index) => ({
    ...event,
    id: `scale-down-${index}`,
  }))];
}

export function buildPairExercise(
  movement: InterlockedMovement,
  exercise: PairExerciseId,
  octaves: 1 | 2 = 1,
  accentEvery = 3,
): PairExerciseEvent[] {
  let events: PairExerciseEvent[];
  if (exercise === "scale-up-down") {
    events = scaleEvents(movement, octaves);
  } else if (exercise === "shape-a" || exercise === "shape-b") {
    const pair = exercise === "shape-a" ? 0 : 1;
    const steps = movement.steps.filter((step) => step.pair === pair);
    events = [...steps, ...steps.slice(0, -1).reverse()].map((step, index) => ({
      id: `${exercise}-${index}`,
      label: `${step.label} · ${step.inversion}`,
      voicing: step.voicing,
      pair,
      accent: false,
    }));
  } else if (exercise === "alternating") {
    const steps = [...movement.steps, ...movement.steps.slice(0, -1).reverse()];
    events = steps.map((step, index) => ({
      id: `alternating-${index}`,
      label: `${step.label} · ${step.inversion}`,
      voicing: step.voicing,
      pair: step.pair,
      accent: false,
    }));
  } else {
    events = movement.steps.flatMap((step, index) => [
      {
        id: `answer-note-${index}`,
        label: `degree ${index + 1} · ${notePretty(step.notes[0])}`,
        voicing: [step.voicing[0]],
        pair: null,
        accent: false,
      },
      {
        id: `answer-chord-${index}`,
        label: `${step.label} answers`,
        voicing: step.voicing,
        pair: step.pair,
        accent: false,
      },
    ]);
  }
  return events.map((event, index) => ({
    ...event,
    accent: index % Math.max(1, accentEvery) === 0,
  }));
}
