/**
 * Barry Harris — the sixth-diminished system.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE. His method is mangled everywhere
 * online and the errors are specific. All of the following is verified in
 * docs/08-JAZZ-GOSPEL.md §1.6 against Kingstone and Howard Rees's workbooks.
 *
 *  · There are FOUR sixth-diminished scales, not three.
 *  · Each is a chord interlocked with the diminished 7th on its MAJOR-7TH degree.
 *  · The dominant one uses A♭, not A. `C D E F G A B♭ B` is the BEBOP DOMINANT
 *    scale and is NOT a sixth-diminished scale — its alternate notes give Bm7♭5,
 *    which is half-diminished and cannot interleave.
 *  · Never call these "octatonic". They are eight-note but provably not the
 *    symmetric diminished scale, which has only 3 transpositions.
 *    ⚠️ Careful with the counting though — the usual line is "these have 12", and
 *    that is true for three of them. The 7♭5 member maps to itself at the TRITONE
 *    and therefore has only 6. That is not a defect: it means C7♭5 and F♯7♭5 share
 *    one scale, so tritone substitution is built into the collection.
 *  · There is no "major 7th diminished scale". That phrase names a CHORD.
 *  · "Sixth" refers to the sixth CHORD. There is NO six-note collection anywhere
 *    in Barry's system — which is exactly why it keeps getting mis-filed under
 *    hexatonics. This module exists partly to kill that confusion.
 *
 * The point of the system is not the scale. It is the MOVEMENT: harmonise every
 * degree in four parts and you get two chords alternating through their
 * inversions, with every voice moving by one scale step in the same direction.
 * Barry taught it as "6th – 6th – 6th" instead of "II – V – I".
 */

import { Note, note, pc, midi, noteName, spell, stepLetter, letterIndex, parseNoteName } from "./note";

export type SixthFamily = "major6" | "minor6" | "dominant7" | "dominant7b5";

export interface SixthDimDef {
  id: SixthFamily;
  name: string;
  chordName: string;
  /** semitones of the parent 6th/7th chord above the root */
  chord: number[];
  /** semitones of the full eight-note scale above the root */
  scale: number[];
  /** letter offsets from the root letter, declared — never guessed */
  letters: number[];
  teaching: string;
}

export const SIXTH_DIMINISHED: SixthDimDef[] = [
  {
    id: "major6", name: "Major Sixth Diminished", chordName: "6",
    chord: [0, 4, 7, 9],
    scale: [0, 2, 4, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    teaching:
      "A major 6th chord interlocked with the diminished 7th on its major-7th degree. Alternate notes give C6 and B°7 forever, so harmonising the scale in four parts produces those two chords through all their inversions.",
  },
  {
    id: "minor6", name: "Minor Sixth Diminished", chordName: "m6",
    chord: [0, 3, 7, 9],
    scale: [0, 2, 3, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    teaching:
      "The same idea on a minor 6th chord. Barry folded m7 chords into this: a Cm7 is thought of as an E♭6 with the 6th in the bass, and an m7♭5 as a minor 6th the same way — an insight he credited to Monk.",
  },
  {
    id: "dominant7", name: "Seventh Diminished", chordName: "7",
    chord: [0, 4, 7, 10],
    scale: [0, 2, 4, 5, 7, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    teaching:
      "C7 interlocked with B°7. Note the A♭ — this is NOT the bebop dominant scale, which has a natural A and cannot alternate, because its other four notes make a half-diminished chord rather than a diminished one.",
  },
  {
    id: "dominant7b5", name: "Seventh Flat Five Diminished", chordName: "7♭5",
    chord: [0, 4, 6, 10],
    scale: [0, 2, 4, 5, 6, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    teaching:
      "The altered-dominant member. Unlike the other three it maps onto itself at the tritone, so it has six transpositions rather than twelve — C7♭5 and F♯7♭5 are the same scale. Tritone substitution is not a trick applied to this collection; it is a property of it.",
  },
];

export const sixthDimById = (id: SixthFamily) =>
  SIXTH_DIMINISHED.find((s) => s.id === id) ?? SIXTH_DIMINISHED[0];

/** Build the eight-note scale, correctly spelled.
 *  Eight notes into seven letters means exactly one letter repeats; which one is
 *  a convention, so it is declared per family rather than guessed. */
export function buildSixthDim(tonic: string, family: SixthFamily, octave = 4): Note[] {
  const def = sixthDimById(family);
  const t = parseNoteName(tonic, octave);
  const out: Note[] = [];
  for (let i = 0; i < def.scale.length; i++) {
    const L = stepLetter(t.letter, def.letters[i]);
    const oct = octave + Math.floor((letterIndex(t.letter) + def.letters[i]) / 7);
    const s = spell(L, (pc(t) + def.scale[i]) % 12, oct);
    if (!s) throw new Error(`${tonic} ${family} needs a triple accidental`);
    out.push(s);
  }
  return out;
}

export interface HarmonisedStep {
  /** four-part chord, ascending midi */
  voicing: number[];
  notes: Note[];
  label: string;
  /** true when this step is the diminished rather than the parent chord */
  isDiminished: boolean;
  degree: number;
}

/**
 * Harmonise every degree in four parts by taking alternate scale notes.
 * Because the collection has eight notes, alternate notes land on the parent
 * chord and the diminished in strict alternation — that is the whole mechanism.
 */
export function harmonise(
  tonic: string, family: SixthFamily, octave = 4
): HarmonisedStep[] {
  const scale = buildSixthDim(tonic, family, octave);
  const def = sixthDimById(family);
  const root = parseNoteName(tonic, octave);
  const chordPcs = new Set(def.chord.map((s) => (pc(root) + s) % 12));
  const out: HarmonisedStep[] = [];

  for (let d = 0; d < 8; d++) {
    const notes: Note[] = [];
    for (let k = 0; k < 4; k++) {
      const idx = d + k * 2;
      const b = scale[idx % 8];
      notes.push(note(b.letter, b.alt, b.octave + Math.floor(idx / 8)));
    }
    const isDim = !chordPcs.has(pc(notes[0]));
    const dimRoot = scale[1]; // the 2nd degree is a member of the diminished
    out.push({
      voicing: notes.map(midi),
      notes,
      isDiminished: isDim,
      degree: d,
      label: isDim
        ? `${noteName(scale[7])}°7`
        : `${noteName(root)}${def.chordName}${d === 0 ? "" : `/${noteName(notes[0])}`}`,
    });
  }
  return out;
}

/**
 * "Borrowing". Barry described a major 7th chord as three notes of a sixth chord
 * plus one note of its related diminished — swap the 6th for the 7th and you have
 * a maj7. Run the borrowed shape up the scale and each note keeps alternating.
 * "Borrowed notes" is his own term; Rees's workbook prints it in scare quotes.
 */
export function borrow(
  tonic: string, family: SixthFamily, voiceIndex: number, octave = 4
): HarmonisedStep[] {
  const base = harmonise(tonic, family, octave);
  const scale = buildSixthDim(tonic, family, octave);
  return base.map((step) => {
    const notes = [...step.notes];
    const target = notes[voiceIndex];
    if (!target) return step;
    const pos = scale.findIndex((s) => pc(s) === pc(target));
    const next = scale[(pos + 1) % 8];
    const lifted = note(next.letter, next.alt,
      target.octave + (pc(next) < pc(target) ? 1 : 0));
    notes[voiceIndex] = lifted;
    return {
      ...step,
      notes,
      voicing: notes.map(midi).sort((a, b) => a - b),
      label: `${step.label} (borrowed)`,
    };
  });
}

/**
 * "The family" — one diminished 7th is the shared related diminished of FOUR
 * dominant 7ths. Lower any one note of the diminished by a semitone and that note
 * becomes the root of a dominant. They sit a minor third apart and are mutually
 * substitutable. Barry's own term; Rees's contents list "The Four 'Related
 * Dominant 7th Chords'".
 */
export function theFamily(tonic: string, family: SixthFamily = "major6"): {
  diminished: string[];
  dominants: { root: string; notes: string[] }[];
} {
  const scale = buildSixthDim(tonic, family);
  const dimNotes = [scale[1], scale[3], scale[5], scale[7]];

  /* Lower each diminished note a semitone; that note becomes a dominant root.
     Spelling matters: F lowered is E, not Fb. Try every letter and keep the one
     needing the fewest accidentals, tie-breaking toward flats — which is how a
     jazz musician would write it. */
  const spellBest = (targetPc: number, nearLetter: string): Note => {
    const cands: Note[] = [];
    for (let off = -1; off <= 1; off++) {
      const L = stepLetter(nearLetter as any, off);
      const c = spell(L, targetPc, 4);
      if (c) cands.push(c);
    }
    cands.sort((a, b) => Math.abs(a.alt) - Math.abs(b.alt) || a.alt - b.alt);
    return cands[0];
  };

  const dominants = dimNotes.map((n) => {
    const rootPc = (pc(n) + 11) % 12;
    const rootNote = spellBest(rootPc, n.letter);
    const rest = dimNotes.filter((x) => pc(x) !== pc(n));
    return { root: noteName(rootNote), notes: [noteName(rootNote), ...rest.map(noteName)] };
  });

  return { diminished: dimNotes.map(noteName), dominants };
}

/** Proof, computed rather than asserted, that these are NOT the octatonic. */
export function notOctatonic(family: SixthFamily): {
  steps: number[]; transpositions: number; symmetricSteps: number[]; symmetricTranspositions: number;
} {
  const def = sixthDimById(family);
  const s = def.scale;
  const steps = s.map((v, i) => ((s[(i + 1) % 8] ?? s[0] + 12) - v + 12) % 12 || 12)
    .map((v, i) => (i === 7 ? 12 - s[7] : v));
  const distinct = (pcs: number[]) => {
    const seen = new Set<string>();
    for (let t = 0; t < 12; t++)
      seen.add([...pcs.map((p) => (p + t) % 12)].sort((a, b) => a - b).join(","));
    return seen.size;
  };
  const symmetric = [0, 2, 3, 5, 6, 8, 9, 11];
  return {
    steps,
    transpositions: distinct(s),
    symmetricSteps: [2, 1, 2, 1, 2, 1, 2, 1],
    symmetricTranspositions: distinct(symmetric),
  };
}
