/**
 * Raga mode — the feature nobody else can copy.
 *
 * THE DATA-MODEL PROBLEM THIS SOLVES: every scale in the app so far has ONE note
 * list, because a Western scale ascends and descends through the same notes.
 * A raga does not. Its arohana and avarohana can contain different notes, and
 * vakra ragas do not move in a straight line at all — they double back.
 *
 * So a raga is stored as two explicit DEGREE SEQUENCES, not as a set. The set is
 * derived from them, never the other way round.
 *
 * ⚠️ EVERY RAGA HERE IS FROM THE VERIFIED LIST IN docs/07-CARNATIC.md §3.
 * Do not add one from memory. The research pass that produced this list also
 * found errors in Wikipedia's own jati labels, and one thing I had wrong:
 * Sriranjani is panchama-varjya (no Pa), NOT the minor hexatonic.
 */

import { Note, note, pc, spell, stepLetter, letterIndex, parseNoteName, noteName } from "./note";

/** Carnatic swara positions as semitones above Sa. */
export const SWARA: Record<string, { semis: number; letter: number }> = {
  S:  { semis: 0,  letter: 0 },
  R1: { semis: 1,  letter: 1 }, R2: { semis: 2, letter: 1 }, R3: { semis: 3, letter: 1 },
  G1: { semis: 2,  letter: 2 }, G2: { semis: 3, letter: 2 }, G3: { semis: 4, letter: 2 },
  M1: { semis: 5,  letter: 3 }, M2: { semis: 6, letter: 3 },
  P:  { semis: 7,  letter: 4 },
  D1: { semis: 8,  letter: 5 }, D2: { semis: 9, letter: 5 }, D3: { semis: 10, letter: 5 },
  N1: { semis: 9,  letter: 6 }, N2: { semis: 10, letter: 6 }, N3: { semis: 11, letter: 6 },
};

export type Jati = "audava" | "shadava" | "sampurna";

export interface Raga {
  id: string;
  name: string;
  tradition: "carnatic" | "hindustani";
  /** swaras of the ascent, in order. May repeat (vakra). */
  arohana: string[];
  /** swaras of the descent, in order, HIGH to LOW. */
  avarohana: string[];
  parent?: string;
  varjya?: string;
  jati: `${Jati}-${Jati}`;
  vakra?: boolean;
  note: string;
  /** flagged where the research could not fully confirm something */
  caveat?: string;
}

/** Verified in docs/07-CARNATIC.md §3. Shadava (six-note) ragas first. */
export const RAGAS: Raga[] = [
  {
    id: "pushpalathika", name: "Pushpalathika", tradition: "carnatic",
    arohana: ["S", "R2", "G2", "M1", "P", "N2"],
    avarohana: ["N2", "P", "M1", "G2", "R2", "S"],
    parent: "22 Kharaharapriya", varjya: "dhaivata", jati: "shadava-shadava",
    note: "This is the minor hexatonic. Dr M. Radhakrishnan's Rare Raga Series derives it exactly as Jason did — by adding a note to Madhyamavathi, or by making Manirangu's descent into its ascent. First composed in by Swathi Thirunal.",
  },
  {
    id: "sriranjani", name: "Sriranjani", tradition: "carnatic",
    arohana: ["S", "R2", "G2", "M1", "D2", "N2"],
    avarohana: ["N2", "D2", "M1", "G2", "R2", "S"],
    parent: "22 Kharaharapriya", varjya: "panchama", jati: "shadava-shadava",
    note: "Panchama-varjya — it has the Dha and is missing the Pa. Commonly and wrongly assumed to be the minor hexatonic; it is the opposite.",
  },
  {
    id: "malayamarutham", name: "Malayamarutham", tradition: "carnatic",
    arohana: ["S", "R1", "G3", "P", "D2", "N2"],
    avarohana: ["N2", "D2", "P", "G3", "R1", "S"],
    parent: "16 Chakravakam", varjya: "madhyama", jati: "shadava-shadava",
    note: "A bright, unusual colour — the flat second against a major third.",
  },
  {
    id: "nalinakanthi", name: "Nalinakanthi", tradition: "carnatic",
    arohana: ["S", "G3", "R2", "M1", "P", "N3"],
    avarohana: ["N3", "P", "M1", "G3", "R2", "S"],
    parent: "27 Sarasangi", varjya: "dhaivata", jati: "shadava-shadava", vakra: true,
    note: "Vakra in the ascent — it doubles back through G3 before R2. That crookedness is the raga.",
  },
  {
    id: "devamanohari", name: "Devamanohari", tradition: "carnatic",
    arohana: ["S", "R2", "M1", "P", "D2", "N2"],
    avarohana: ["N2", "D2", "N2", "P", "M1", "R2", "S"],
    parent: "22 Kharaharapriya", varjya: "gandhara", jati: "shadava-shadava", vakra: true,
    note: "Vakra in the descent — N2 D2 N2 P. The repeated nishada is the signature.",
  },
  {
    id: "bahudari", name: "Bahudari", tradition: "carnatic",
    arohana: ["S", "G3", "M1", "P", "D2", "N2"],
    avarohana: ["N2", "P", "M1", "G3", "S"],
    parent: "28 Harikambhoji", jati: "shadava-audava",
    note: "Six up, five down — the rishabha is absent throughout and the dhaivata drops out of the descent.",
  },
  {
    id: "kambhoji", name: "Kambhoji", tradition: "carnatic",
    arohana: ["S", "R2", "G3", "M1", "P", "D2"],
    avarohana: ["N2", "D2", "P", "M1", "G3", "R2", "S"],
    parent: "28 Harikambhoji", jati: "shadava-sampurna",
    note: "Six up, seven down. A major raga of the tradition.",
    caveat: "Bhashanga — N3 enters as an anya swara in phrases like S N3 P D2 S. A strict scale display cannot show that.",
  },
  {
    id: "marwa", name: "Marwa", tradition: "hindustani",
    arohana: ["S", "R1", "G3", "M2", "D2", "N3"],
    avarohana: ["N3", "D2", "M2", "G3", "R1", "S"],
    varjya: "pancham", jati: "shadava-shadava",
    note: "Pancham varjit. One of the great Hindustani ragas — vadi komal Re, samvadi Dha.",
    caveat: "Sa is not varjit but is deliberately withheld, used at the end of a phrase and even then infrequently.",
  },
  {
    id: "gaudgiri", name: "Gaudgiri Malhar", tradition: "hindustani",
    arohana: ["S", "R2", "G2", "M1", "P", "N2"],
    avarohana: ["N2", "P", "M1", "G2", "R2", "S"],
    varjya: "dhaivat", jati: "shadava-shadava",
    note: "The Hindustani twin of Pushpalathika — the identical pitch set.",
  },
  {
    id: "jaunpuri", name: "Jaunpuri", tradition: "hindustani",
    arohana: ["S", "R2", "M1", "P", "D1", "N2"],
    avarohana: ["N2", "D1", "P", "M1", "G2", "R2", "S"],
    jati: "shadava-sampurna",
    note: "Komal gandhar is omitted in the ascent only, which is what makes it Jaunpuri rather than Asavari.",
    caveat: "Wikipedia labels this audava-shadava, contradicting the scale it prints alongside. Shadava-sampurna is correct.",
  },
  {
    id: "hamsadhwani", name: "Hamsadhwani", tradition: "carnatic",
    arohana: ["S", "R2", "G3", "P", "N3"],
    avarohana: ["N3", "P", "G3", "R2", "S"],
    parent: "29 Dhirasankarabharanam", jati: "audava-audava",
    note: "Five notes — audava. Included so the pentatonic case is visible next to the hexatonic ones.",
  },
];

export const ragaById = (id: string) => RAGAS.find((r) => r.id === id) ?? RAGAS[0];

/** Spell a swara sequence from a chosen Sa. */
export function spellSwaras(sa: string, swaras: string[], startOctave = 4): Note[] {
  const root = parseNoteName(sa, startOctave);
  const out: Note[] = [];
  let lastSemis = -1;
  let oct = startOctave;
  for (const sw of swaras) {
    const def = SWARA[sw];
    if (!def) throw new Error(`unknown swara "${sw}"`);
    // a descending step inside an ascending line means we crossed the octave
    if (lastSemis >= 0 && def.semis < lastSemis && swaras !== null) {
      // only bump when the line is genuinely ascending overall; vakra handled below
    }
    lastSemis = def.semis;
    const L = stepLetter(root.letter, def.letter);
    const o = oct + Math.floor((letterIndex(root.letter) + def.letter) / 7);
    const n = spell(L, (pc(root) + def.semis) % 12, o);
    if (!n) throw new Error(`${sa} ${sw} needs a triple accidental`);
    out.push(n);
  }
  return out;
}

export interface RagaInstance {
  raga: Raga;
  sa: string;
  arohana: Note[];
  avarohana: Note[];
  /** the union, for the ring and the keyboard */
  notes: Note[];
  /** notes in the ascent that are absent from the descent, and vice versa */
  ascentOnly: Note[];
  descentOnly: Note[];
  error?: string;
}

export function buildRaga(sa: string, id: string): RagaInstance {
  const raga = ragaById(id);
  try {
    const arohana = spellSwaras(sa, raga.arohana);
    const avarohana = spellSwaras(sa, raga.avarohana);
    const aPcs = new Set(arohana.map(pc));
    const dPcs = new Set(avarohana.map(pc));
    const union = new Map<number, Note>();
    for (const n of [...arohana, ...avarohana]) if (!union.has(pc(n))) union.set(pc(n), n);
    const notes = [...union.values()].sort(
      (a, b) => ((pc(a) - pc(arohana[0])) + 12) % 12 - ((pc(b) - pc(arohana[0])) + 12) % 12
    );
    return {
      raga, sa, arohana, avarohana, notes,
      ascentOnly: arohana.filter((n) => !dPcs.has(pc(n))),
      descentOnly: avarohana.filter((n) => !aPcs.has(pc(n))),
    };
  } catch (e: any) {
    return {
      raga, sa, arohana: [], avarohana: [], notes: [],
      ascentOnly: [], descentOnly: [], error: e?.message ?? "cannot spell this raga here",
    };
  }
}

/** Aroha then avaroha, as one playable line — the way it is actually practised. */
export function ragaLine(inst: RagaInstance, octaves = 1): Note[] {
  if (inst.error) return [];
  const up: Note[] = [];
  for (let o = 0; o < octaves; o++)
    for (const n of inst.arohana) up.push(note(n.letter, n.alt, n.octave + o));
  const top = inst.arohana[0];
  up.push(note(top.letter, top.alt, top.octave + octaves));      // land on the upper Sa
  const down: Note[] = [];
  for (let o = octaves - 1; o >= 0; o--)
    for (const n of inst.avarohana) down.push(note(n.letter, n.alt, n.octave + o));
  return [...up, ...down];
}
