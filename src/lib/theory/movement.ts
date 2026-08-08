/**
 * Interlocked chord movement.
 *
 * A six-note collection split into alternate degrees gives two three-note
 * shapes. An eight-note collection split the same way gives two four-note
 * shapes. The useful part is not merely finding the two pitch-class sets: it is
 * voicing them from every successive scale degree so each voice moves by one
 * scale step and every inversion becomes playable.
 *
 * Keep this module pure. It is shared by the Harmony UI, tests and future
 * assignment/lesson builders.
 */

import { ChordSet, findChords, tertianOnly } from "./chords";
import { midi, Note, note, noteName, pc } from "./note";
import { buildScale, ScaleInstance } from "./scales";

export type MovementKind = "hexatonic-triads" | "octatonic-sevenths";
export type InversionName = "root position" | "first inversion" | "second inversion" | "third inversion";

export interface MovementStep {
  degree: number;
  pair: 0 | 1;
  notes: Note[];
  voicing: number[];
  /** Stable chord identity, with a slash bass on inversions. */
  label: string;
  /** Every equally valid chord name carried by this pitch-class set. */
  aliases: string[];
  inversion: InversionName;
}

export interface InterlockedMovement {
  kind: MovementKind;
  scale: ScaleInstance;
  steps: MovementStep[];
  pairLabels: [string, string];
}

const INVERSION_NAMES: InversionName[] = [
  "root position", "first inversion", "second inversion", "third inversion",
];

const pcKey = (notes: Note[]) => [...new Set(notes.map(pc))].sort((a, b) => a - b).join(",");
const setKey = (set: ChordSet) => [...set.pcs].sort((a, b) => a - b).join(",");

/** Musician-facing glyphs while keeping theory-engine symbols ASCII-safe. */
export function prettyChordSymbol(symbol: string): string {
  const match = symbol.match(/^([A-G])(bb|##|b|#)?(.*)$/);
  if (!match) return symbol;
  const accidental = ({ bb: "♭♭", b: "♭", "#": "♯", "##": "♯♯" } as Record<string, string>)[match[2] ?? ""] ?? "";
  const suffix = match[3].replace("dim7", "°7").replace("b5", "♭5");
  return `${match[1]}${accidental}${suffix}`;
}

function alternateStack(scale: Note[], degree: number, voices: 3 | 4): Note[] {
  const size = scale.length;
  return Array.from({ length: voices }, (_, voice) => {
    const index = degree + voice * 2;
    const source = scale[index % size];
    return note(source.letter, source.alt, source.octave + Math.floor(index / size));
  });
}

function buildMovement(
  kind: MovementKind,
  scale: ScaleInstance,
  voices: 3 | 4,
): InterlockedMovement {
  if (scale.error || scale.notes.length !== voices * 2)
    throw new Error(`${kind} needs exactly ${voices * 2} valid scale notes`);

  const chordSets = tertianOnly(findChords(scale.notes, [voices]));
  const bySet = new Map(chordSets.map((set) => [setKey(set), set]));
  const baseNames: [string, string] = ["", ""];
  const steps: MovementStep[] = [];

  for (let degree = 0; degree < scale.notes.length; degree++) {
    const notes = alternateStack(scale.notes, degree, voices);
    const chord = bySet.get(pcKey(notes));
    if (!chord)
      throw new Error(`${scale.label} degree ${degree + 1} does not form a tertian ${voices}-note chord`);

    const pair = (degree % 2) as 0 | 1;
    const baseBassPc = pc(scale.notes[pair]);
    /* Triads have one tertian root, and a rotation may begin on one of its
       inversions (for example C-Eb-Ab is Ab/C). Symmetrical diminished sevenths
       legitimately have four roots, so for those choose the pair's first scale
       degree as the stable identity. */
    const baseReading = chord.names.length > 1
      ? chord.names.find((name) => {
          const rootNote = scale.notes.find((n) => noteName(n) === name.root);
          return rootNote ? pc(rootNote) === baseBassPc : false;
        }) ?? chord.names[0]
      : chord.names[0];
    const bassPc = pc(notes[0]);
    const inversionIndex = baseReading.voicing.map(pc).findIndex((pitch) => pitch === bassPc);
    if (inversionIndex < 0)
      throw new Error(`${baseReading.symbol} does not contain bass ${noteName(notes[0])}`);
    const baseLabel = prettyChordSymbol(baseReading.symbol);
    baseNames[pair] = baseLabel;

    const bass = prettyChordSymbol(noteName(notes[0]));
    const label = inversionIndex === 0 ? baseLabel : `${baseLabel}/${bass}`;
    steps.push({
      degree,
      pair,
      notes,
      voicing: notes.map(midi),
      label,
      aliases: chord.names.map((name) => prettyChordSymbol(name.symbol)),
      inversion: INVERSION_NAMES[inversionIndex],
    });
  }

  return { kind, scale, steps, pairLabels: baseNames };
}

/**
 * The classroom drill: six scale degrees become two triads, each appearing in
 * root position, first inversion and second inversion. The no-7 form on B-flat
 * gives Bb, Cm, Bb/D, Cm/Eb, Bb/F, Cm/G.
 */
export function hexatonicTriadMovement(tonic = "Bb", mode = 3): InterlockedMovement {
  return buildMovement("hexatonic-triads", buildScale(tonic, "diatonic", mode), 3);
}

/**
 * The genuinely symmetric octatonic drill. Whole-half or half-whole splits
 * into two diminished-seventh pitch-class sets, each heard through all four
 * inversions. This is deliberately separate from Barry Harris's eight-note
 * sixth-diminished collections, which are not symmetric octatonic scales.
 */
export function octatonicSeventhMovement(
  tonic = "C", kind: "whole-half" | "half-whole" = "whole-half",
): InterlockedMovement {
  const family = kind === "whole-half" ? "dim-wh" : "dim-hw";
  return buildMovement("octatonic-sevenths", buildScale(tonic, family, 0), 4);
}
