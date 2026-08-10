/**
 * Pair Atlas — curated exact-cover collections for the lesson/practice engine.
 *
 * "Exact cover" is deliberately stricter than "two chords that fit a scale":
 * the two pitch-class sets may not overlap, and together they must account for
 * every note. That is the property behind Jason's inversion-switching exercise.
 */

import {
  Alt, Letter, letterIndex, midi, note, Note, notePretty, parseNoteName, pc,
  spell, stepLetter, MAJOR_KEYS,
} from "./note";
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
    const ls = ix.map((i) => notes[i].letter);
    if (new Set(ls).size !== 3) return false;
    return ls.some((l) => {
      const want = new Set([l, stepLetter(l, 2), stepLetter(l, 4)]);
      return ls.every((x) => want.has(x));
    });
  });
}

export function buildAtlasMovement(entry: PairAtlasEntry, tonic: string): InterlockedMovement {
  const scale = entry.familyId
    ? buildScale(tonic, entry.familyId, entry.mode ?? 0)
    : buildScale(tonic, "custom", 0, entry.semis);
  if (scale.error) throw new Error(scale.error);
  /* Re-spell for the chords only where the default spelling does not already
     read as two triads. Petrushka in Ab comes out of its family as Ab A C D Eb
     Gb, which prints the upper shape as D-Gb-A; every key where the family
     already gets it right is left untouched. */
  const semis = entry.semis
    ?? scale.notes.map((n) => ((pc(n) - pc(scale.notes[0])) % 12 + 12) % 12);
  const chordSpelled = entry.voices === 3 && !alreadyInThirds(scale.notes)
    ? spellPairForChords(tonic, semis)
    : null;
  const namedScale = {
    ...scale,
    notes: chordSpelled ?? scale.notes,
    label: entry.title,
    teaching: entry.lessonAngle,
  };
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
