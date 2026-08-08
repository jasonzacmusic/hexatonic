/**
 * Pair Atlas — curated exact-cover collections for the lesson/practice engine.
 *
 * "Exact cover" is deliberately stricter than "two chords that fit a scale":
 * the two pitch-class sets may not overlap, and together they must account for
 * every note. That is the property behind Jason's inversion-switching exercise.
 */

import { midi, notePretty, pc } from "./note";
import { buildScale } from "./scales";
import {
  exactCoverMovement,
  InterlockedMovement,
  MovementKind,
} from "./movement";

export type AtlasStatus = "new-lesson" | "taught-2025";
export type AtlasEvidence = "documented" | "specialist" | "theory";

export interface PairAtlasEntry {
  id: string;
  title: string;
  subtitle: string;
  formula: string;
  voices: 3 | 4;
  status: AtlasStatus;
  evidence: AtlasEvidence;
  defaultKey: string;
  lessonAngle: string;
  sourceLabel: string;
  sourceUrl: string;
  familyId?: string;
  mode?: number;
  semis?: number[];
}

const JASON_LESSON = "https://www.youtube.com/watch?v=qakASBgKQ9U";
const CAMPBELL = "https://www.alfred.com/triad-pairs-for-jazz/p/00-0482B/";
const OPEN_STUDIO = "https://www.openstudiojazz.com/wp-content/uploads/2024/03/Triad-Pair-Training-Workbook.pdf";
const SYMMETRIC = "https://pressbooks.uiowa.edu/twentieth-and-twenty-first-century-music/chapter/symmetrical-scale/";
const NON_DIATONIC = "https://intmus.github.io/inttheory21-22/23-intro-to-non-diatonic-materials/a1-ex-nondiatonicscales.html";

export const PAIR_ATLAS: PairAtlasEntry[] = [
  {
    id: "major-no3",
    title: "Major without 3",
    subtitle: "IV + V · the missing-third pair",
    formula: "1 2 4 5 6 7",
    voices: 3,
    status: "new-lesson",
    evidence: "documented",
    defaultKey: "C",
    semis: [0, 2, 5, 7, 9, 11],
    lessonAngle:
      "F + G covers C major except E. The tonic quality stays suspended while two familiar major shapes climb through their inversions.",
    sourceLabel: "Gary Campbell · triad-pair practice",
    sourceUrl: CAMPBELL,
  },
  {
    id: "major-pair-semitone",
    title: "Major triads a semitone apart",
    subtitle: "I + ♭II · chromatic hexatonic",
    formula: "1 ♭2 3 4 5 ♭6",
    voices: 3,
    status: "new-lesson",
    evidence: "specialist",
    defaultKey: "C",
    semis: [0, 1, 4, 5, 7, 8],
    lessonAngle:
      "C + D♭ is an exact six-note cover with maximal visual simplicity: keep one major-triad fingering and move every note by a semitone.",
    sourceLabel: "Gary Campbell · triad-pair practice",
    sourceUrl: CAMPBELL,
  },
  {
    id: "whole-tone-augmented-pair",
    title: "Whole-tone pair",
    subtitle: "two augmented triads a whole step apart",
    formula: "1 2 3 ♯4 ♯5 ♭7",
    voices: 3,
    status: "new-lesson",
    evidence: "documented",
    defaultKey: "C",
    familyId: "whole",
    lessonAngle:
      "C+ + D+ exhaust the whole-tone scale. The fingering repeats and the harmony loses any single gravitational root.",
    sourceLabel: "University of Iowa · symmetrical scales",
    sourceUrl: SYMMETRIC,
  },
  {
    id: "augmented-scale-pair",
    title: "Augmented-scale pair",
    subtitle: "two augmented triads a minor third apart",
    formula: "1 ♭3 3 5 ♭6 7",
    voices: 3,
    status: "new-lesson",
    evidence: "documented",
    defaultKey: "C",
    familyId: "aug",
    lessonAngle:
      "C+ + E♭+ interlock into the jazz augmented scale. It sounds tonal enough to phrase, but symmetric enough to surprise.",
    sourceLabel: "University of Iowa · symmetrical scales",
    sourceUrl: SYMMETRIC,
  },
  {
    id: "petrushka-pair",
    title: "Petrushka pair",
    subtitle: "two major triads a tritone apart",
    formula: "1 ♭2 3 ♭5 5 ♭7",
    voices: 3,
    status: "new-lesson",
    evidence: "specialist",
    defaultKey: "C",
    familyId: "petrushka",
    lessonAngle:
      "C + G♭ is the third and final interval at which two major triads share no pitch: semitone, whole step, tritone.",
    sourceLabel: "Integrated Music Theory · non-diatonic scales",
    sourceUrl: NON_DIATONIC,
  },
  {
    id: "true-octatonic",
    title: "True symmetric diminished",
    subtitle: "two diminished sevenths · four inversions each",
    formula: "whole–half alternating",
    voices: 4,
    status: "new-lesson",
    evidence: "documented",
    defaultKey: "C",
    familyId: "dim-wh",
    lessonAngle:
      "C°7 + D°7 exhaust one octatonic collection. This is the genuinely symmetric eight-note counterpart to the two-triad exercise.",
    sourceLabel: "Integrated Music Theory · octatonic division",
    sourceUrl: NON_DIATONIC,
  },
  {
    id: "sunday",
    title: "Sunday Scale",
    subtitle: "I + ii · major without 7",
    formula: "1 2 3 4 5 6",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "Bb",
    familyId: "diatonic",
    mode: 3,
    lessonAngle:
      "B♭ + Cm through all inversions. This remains the ideal onboarding exercise, but it is not the new video's headline.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
  {
    id: "minor-no6",
    title: "Minor pentatonic + 2",
    subtitle: "i + ♭VII · minor without ♭6",
    formula: "1 2 ♭3 4 5 ♭7",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "A",
    familyId: "diatonic",
    mode: 4,
    lessonAngle: "A minor + G major was already demonstrated with inversion voice leading.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
  {
    id: "dorian-pair",
    title: "Dorian pair",
    subtitle: "i + ii · two minor triads",
    formula: "1 2 ♭3 4 5 6",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "G",
    semis: [0, 2, 3, 5, 7, 9],
    lessonAngle: "The public lesson already used Gm + Am to expose Dorian colour.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
  {
    id: "lydian-pair",
    title: "Lydian pair",
    subtitle: "I + II · two major triads",
    formula: "1 2 3 ♯4 5 6",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "G",
    semis: [0, 2, 4, 6, 7, 9],
    lessonAngle: "The public lesson already used G + A and inversions for Lydian.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
  {
    id: "phrygian-pair",
    title: "Phrygian pair",
    subtitle: "i + ♭II · minor plus major",
    formula: "1 ♭2 ♭3 4 5 ♭6",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "G",
    semis: [0, 1, 3, 5, 7, 8],
    lessonAngle: "The public lesson already used one minor plus flat-two major.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
  {
    id: "mixolydian-pair",
    title: "Mixolydian pair",
    subtitle: "I + ♭VII · two major triads",
    formula: "1 2 3 4 5 ♭7",
    voices: 3,
    status: "taught-2025",
    evidence: "documented",
    defaultKey: "G",
    semis: [0, 2, 4, 5, 7, 10],
    lessonAngle: "The public lesson already used one major plus flat-seven major.",
    sourceLabel: "Jason Zac · 2025 public lesson",
    sourceUrl: JASON_LESSON,
  },
];

/** Every adjacent diatonic triad pair omits exactly one major-scale degree. */
export const DIATONIC_EXACT_COVERS = [
  { pair: "I + ii", omitted: "7", lesson: "taught" },
  { pair: "I + vii°", omitted: "6", lesson: "new theory" },
  { pair: "ii + iii", omitted: "1", lesson: "new theory" },
  { pair: "iii + IV", omitted: "2", lesson: "new theory" },
  { pair: "IV + V", omitted: "3", lesson: "new headline" },
  { pair: "V + vi", omitted: "4", lesson: "same pitch set as taught Am + G" },
  { pair: "vi + vii°", omitted: "5", lesson: "new theory" },
] as const;

export function buildAtlasMovement(entry: PairAtlasEntry, tonic: string): InterlockedMovement {
  const scale = entry.familyId
    ? buildScale(tonic, entry.familyId, entry.mode ?? 0)
    : buildScale(tonic, "custom", 0, entry.semis);
  if (scale.error) throw new Error(scale.error);
  const namedScale = { ...scale, label: entry.title, teaching: entry.lessonAngle };
  const kind: MovementKind = entry.voices === 4 ? "octatonic-sevenths" : "hexatonic-triads";
  return exactCoverMovement(kind, namedScale, entry.voices);
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
      label: `${notePretty(pitch)}${pitch.octave + octave}`,
      voicing: [midi(pitch) + octave * 12],
      pair: null,
      accent: false,
    }))
  ).flat();
  const top = movement.scale.notes[0];
  ascending.push({
    id: `scale-top-${octaves}`,
    label: `${notePretty(top)}${top.octave + octaves}`,
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
