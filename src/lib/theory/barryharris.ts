/**
 * The sixth–diminished method, as taught by Barry Harris.
 *
 * ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE. The method is mangled everywhere
 * online and the errors are specific. All of the following is verified in
 * docs/08-JAZZ-GOSPEL.md §1.6 against Kingstone and Howard Rees's workbooks.
 *
 *  · There are FOUR sixth-diminished scales, not three.
 *  · Each is a chord interlocked with the diminished 7th on its MAJOR-7TH degree.
 *  · The dominant one uses A♭, not A. `C D E F G A B♭ B` is the BEBOP DOMINANT
 *    scale and is NOT a sixth-diminished scale — its alternate notes give Bm7♭5,
 *    which is half-diminished and cannot interleave.
 *  · Never call these "octatonic". They are eight-note but provably not the
 *    symmetric diminished scale, which has only 3 transpositions. Three of them
 *    have 12; the 7♭5 member maps to itself at the TRITONE and has only 6.
 *  · "Sixth" refers to the sixth CHORD. There is no six-note collection in the
 *    system. What this app adds is the bridge: a six-note scale that fits
 *    inside one of these eight-note scales can be harmonised the same way.
 *
 * The point of the system is the MOVEMENT: harmonise every degree in four parts
 * and you get two chords alternating, every voice moving by one scale step.
 */

import {
  Letter, Note, note, pc, midi, noteName, notePretty, spell, stepLetter,
  parseNoteName, LETTERS, LETTER_PC,
} from "./note";

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
    id: "major6", name: "Major sixth diminished", chordName: "6",
    chord: [0, 4, 7, 9],
    scale: [0, 2, 4, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    teaching: "A major 6th chord interlocked with the diminished 7th a semitone below its root.",
  },
  {
    id: "minor6", name: "Minor sixth diminished", chordName: "m6",
    chord: [0, 3, 7, 9],
    scale: [0, 2, 3, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    teaching: "The same idea on a minor 6th chord.",
  },
  {
    id: "dominant7", name: "Seventh diminished", chordName: "7",
    chord: [0, 4, 7, 10],
    scale: [0, 2, 4, 5, 7, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    teaching: "A dominant 7th interlocked with its diminished. Note the ♭6: this is not the bebop dominant scale.",
  },
  {
    id: "dominant7b5", name: "Seventh flat five diminished", chordName: "7♭5",
    chord: [0, 4, 6, 10],
    scale: [0, 2, 4, 5, 6, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    teaching: "The altered-dominant member. It maps onto itself at the tritone, so C7♭5 and F♯7♭5 share one scale.",
  },
];

export const sixthDimById = (id: SixthFamily) =>
  SIXTH_DIMINISHED.find((s) => s.id === id) ?? SIXTH_DIMINISHED[0];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Cb, Fb, E# and B#: correct in a key signature that has them, but a player
 *  reading a chromatic added note expects B, E, F and C. */
const isWhiteAccidental = (n: Note) =>
  (n.alt === -1 && (n.letter === "C" || n.letter === "F")) ||
  (n.alt === 1 && (n.letter === "E" || n.letter === "B"));

/** The note at an exact MIDI pitch, on a given letter (null past a double). */
function onLetter(L: Letter, target: number): Note | null {
  let alt = ((target - LETTER_PC[L]) % 12 + 12) % 12;
  if (alt > 6) alt -= 12;
  if (Math.abs(alt) > 2) return null;
  const octave = (target - LETTER_PC[L] - alt) / 12 - 1;
  return note(L, alt as Note["alt"], octave);
}

/** Build the eight-note scale, correctly spelled.
 *  Eight notes into seven letters means exactly one letter repeats. The
 *  declared template is the convention (C6: A♭ and A share a letter). Three
 *  rules then respell, one note at a time:
 *   · a double accidental always moves to its neighbouring letter
 *     (D♭6 would print B𝄫: it reads A instead);
 *   · the added chromatic note, when it would be C♭, F♭, E♯ or B♯, moves to
 *     the natural beside it (A♭6 reads A♭ B♭ C D♭ E♭ E F G, not F♭);
 *   · chord tones and the leading note keep their letters, so the chord still
 *     reads as a chord and the diminished still leads up to the root. */
export function buildSixthDim(tonic: string, family: SixthFamily, octave = 4): Note[] {
  const def = sixthDimById(family);
  const t = parseNoteName(tonic, octave);
  const base = midi(t);
  const out: Note[] = [];
  for (let i = 0; i < def.scale.length; i++) {
    const target = base + def.scale[i];
    const own = onLetter(stepLetter(t.letter, def.letters[i]), target);
    const keep = i === 0 || i === 7 || def.chord.includes(def.scale[i]);
    const fine = own && Math.abs(own.alt) < 2 && (keep || !isWhiteAccidental(own));
    if (own && fine) { out.push(own); continue; }
    const others = [-1, 1]
      .map((d) => onLetter(stepLetter(t.letter, def.letters[i] + d), target))
      .filter((n): n is Note => !!n && Math.abs(n.alt) < 2 && !isWhiteAccidental(n))
      .sort((a, b) => Math.abs(a.alt) - Math.abs(b.alt));
    const pick = others[0] ?? own;
    if (!pick) throw new Error(`${tonic} ${family} cannot be spelled`);
    out.push(pick);
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
    /* One stable diminished identity, with its bass named honestly, so the
       inversion the exercise teaches stays visible. */
    const dimRoot = scale[7];
    const bassName = noteName(notes[0]);
    out.push({
      voicing: notes.map(midi),
      notes,
      isDiminished: isDim,
      degree: d,
      label: isDim
        ? `${noteName(dimRoot)}°7${pc(notes[0]) === pc(dimRoot) ? "" : `/${bassName}`}`
        : `${noteName(root)}${def.chordName}${d === 0 ? "" : `/${noteName(notes[0])}`}`,
    });
  }
  return out;
}

/**
 * Borrowing: lift one voice of every chord to the next scale note. The
 * alternation keeps working because each note simply moves to its neighbour.
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
 * The related dominants: one diminished 7th is shared by four dominant 7ths.
 * Lower any one of its notes by a semitone and that note becomes a dominant
 * root. They sit a minor third apart.
 */
export function theFamily(tonic: string, family: SixthFamily = "major6"): {
  diminished: string[];
  dominants: { root: string; notes: string[] }[];
} {
  const scale = buildSixthDim(tonic, family);
  const dimNotes = [scale[1], scale[3], scale[5], scale[7]];

  const spellBest = (targetPc: number, nearLetter: Letter): Note => {
    const cands: Note[] = [];
    for (let off = -1; off <= 1; off++) {
      const c = spell(stepLetter(nearLetter, off), targetPc, 4);
      if (c) cands.push(c);
    }
    cands.sort((a, b) => Math.abs(a.alt) - Math.abs(b.alt) || a.alt - b.alt);
    return cands[0];
  };

  const dominants = dimNotes.map((n) => {
    const rootNote = spellBest((pc(n) + 11) % 12, n.letter);
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
  const steps = s.map((v, i) => (i === 7 ? 12 - v : s[i + 1] - v));
  const distinct = (pcs: number[]) => {
    const seen = new Set<string>();
    for (let t = 0; t < 12; t++)
      seen.add([...pcs.map((p) => (p + t) % 12)].sort((a, b) => a - b).join(","));
    return seen.size;
  };
  return {
    steps,
    transpositions: distinct(s),
    symmetricSteps: [2, 1, 2, 1, 2, 1, 2, 1],
    symmetricTranspositions: distinct([0, 2, 3, 5, 6, 8, 9, 11]),
  };
}

/* ══ Harmonise a SIX-NOTE scale the sixth–diminished way ═══════════════════

   The method: find the eight-note sixth–diminished scale that holds your six
   notes. Under every melody note that belongs to the sixth chord, play the
   sixth chord; under every other note, play the diminished seventh. Voice it
   close (all four notes inside an octave, melody on top) or drop 2 (the
   second note from the top dropped an octave).                              */

export interface SixthDimFit {
  family: SixthFamily;
  familyName: string;
  /** root of the parent 6th/7th chord, spelled to match your scale */
  root: Note;
  /** the eight notes, spelled with your scale's own letters where it has them */
  scale: Note[];
  /** the two notes the eight-note scale adds to yours */
  added: Note[];
  /** the parent chord's four notes, root first */
  chord: Note[];
  /** the diminished seventh's four notes, stacked in thirds from its root */
  dim: Note[];
  /** e.g. "G6", "Ebm6", "C7" (ASCII accidentals, like every symbol here) */
  chordSymbol: string;
  /** e.g. "F#dim7" */
  dimSymbol: string;
  /** when the parent chord is rooted elsewhere, the same four notes read from
   *  your tonic: Cm7 for E♭6. null when the tonic is the parent's root, or when
   *  no standard seventh-chord reading from the tonic exists. */
  tonicReading: string | null;
  /** melody notes of your scale that the parent chord harmonises */
  chordTones: Note[];
  /** melody notes of your scale that the diminished harmonises */
  dimTones: Note[];
}

const FAMILY_ORDER: SixthFamily[] = ["major6", "minor6", "dominant7", "dominant7b5"];

/** Tetrad names read from a chosen root, for the "Cm7 = E♭6" line. */
const TETRAD_READING: Record<string, string> = {
  "0,4,7,11": "maj7", "0,4,7,10": "7", "0,3,7,10": "m7", "0,3,6,10": "m7b5",
  "0,4,7,9": "6", "0,3,7,9": "m6", "0,3,6,9": "dim7",
};

/** Spell a pitch class that your scale does not contain: fewest accidentals,
 *  avoid a letter your scale already uses, and lean flat on a tie (the ♭6
 *  and the diminished tones are written flat in this system). */
function spellAdded(p: number, usedLetters: Set<Letter>, octave: number): Note {
  let best: Note | null = null;
  let bestCost = Infinity;
  for (const L of LETTERS as unknown as Letter[]) {
    const s = spell(L, p, octave);
    if (!s || Math.abs(s.alt) > 1) continue;
    const cost = Math.abs(s.alt) * 10 + (usedLetters.has(L) ? 5 : 0) + (s.alt > 0 ? 1 : 0);
    if (cost < bestCost) { bestCost = cost; best = s; }
  }
  return best!;
}

/** Four diminished notes, reordered so the letters stack in thirds from a root. */
function dimInThirds(ns: Note[]): Note[] {
  for (const r of ns) {
    const want = [0, 2, 4, 6].map((k) => stepLetter(r.letter, k));
    const ordered = want.map((L) => ns.find((n) => n.letter === L));
    if (ordered.every(Boolean)) return ordered as Note[];
  }
  return [...ns].sort((a, b) => pc(a) - pc(b));
}

/**
 * Every sixth–diminished scale that holds all six notes, best first: the ones
 * rooted on your tonic, then the others, in family order. Empty when none
 * fits (the augmented scale, the whole-tone scale).
 */
export function fitSixthDim(hex: Note[]): SixthDimFit[] {
  if (!hex.length) return [];
  const byPc = new Map<number, Note>();
  for (const n of hex) if (!byPc.has(pc(n))) byPc.set(pc(n), n);
  const used = new Set(hex.map((n) => n.letter));
  const tonic = hex[0];
  const out: SixthDimFit[] = [];

  for (const fam of FAMILY_ORDER) {
    const def = sixthDimById(fam);
    for (let r = 0; r < 12; r++) {
      const pcs = def.scale.map((s) => (r + s) % 12);
      if (![...byPc.keys()].every((p) => pcs.includes(p))) continue;
      const spelled = pcs.map((p) => byPc.get(p) ?? spellAdded(p, used, 4));
      const root = spelled[0];
      const chord = def.chord.map((s) => spelled[def.scale.indexOf(s)]);
      const chordSet = new Set(chord.map(pc));
      const dim = dimInThirds(spelled.filter((n) => !chordSet.has(pc(n))));
      let tonicReading: string | null = null;
      if (pc(root) !== pc(tonic)) {
        const iv = chord.map((n) => mod12(pc(n) - pc(tonic))).sort((a, b) => a - b).join(",");
        const suffix = TETRAD_READING[iv];
        if (suffix && chordSet.has(pc(tonic))) tonicReading = noteName(tonic) + suffix;
      }
      out.push({
        family: fam,
        familyName: def.name,
        root,
        scale: spelled,
        added: spelled.filter((n) => !byPc.has(pc(n))),
        chord,
        dim,
        chordSymbol: noteName(root) + (fam === "dominant7b5" ? "7b5" : def.chordName),
        dimSymbol: `${noteName(dim[0])}dim7`,
        tonicReading,
        chordTones: hex.filter((n) => chordSet.has(pc(n))),
        dimTones: hex.filter((n) => !chordSet.has(pc(n))),
      });
    }
  }
  const rank = (f: SixthDimFit) =>
    (pc(f.root) === pc(tonic) ? 0 : f.tonicReading ? 50 : 100) + FAMILY_ORDER.indexOf(f.family) * 10;
  return out.sort((a, b) => rank(a) - rank(b));
}

/* ── voicings ───────────────────────────────────────────────────────────── */

/** Close position: the melody on top and the other three chord tones packed
 *  directly below it, all inside one octave. Returned ascending. */
export function closeVoicing(melody: Note, chordTones: Note[]): Note[] {
  const top = midi(melody);
  const below = chordTones
    .filter((n) => pc(n) !== pc(melody))
    .map((n) => {
      let v = note(n.letter, n.alt, melody.octave);
      while (midi(v) >= top) v = note(v.letter, v.alt, v.octave - 1);
      while (midi(v) < top - 12) v = note(v.letter, v.alt, v.octave + 1);
      return v;
    });
  return [...below, melody].sort((a, b) => midi(a) - midi(b));
}

/** Drop 2: take a close-position four-note chord and drop the SECOND NOTE
 *  FROM THE TOP an octave. Returned ascending. */
export function drop2(close: Note[]): Note[] {
  if (close.length !== 4) throw new Error("drop 2 needs a four-note close-position chord");
  const sorted = [...close].sort((a, b) => midi(a) - midi(b));
  const second = sorted[2];
  const dropped = note(second.letter, second.alt, second.octave - 1);
  return [dropped, sorted[0], sorted[1], sorted[3]];
}

/* ── borrowing ─────────────────────────────────────────────────────────── */

export type Borrowing = "none" | "maj7" | "add9";

/** Which borrowings a family allows: the 6 → maj7 swap needs a sixth to swap. */
export function borrowingsFor(family: SixthFamily): Borrowing[] {
  return family === "major6" || family === "minor6" ? ["none", "maj7", "add9"] : ["none", "add9"];
}

/** The chord a borrowing produces, named for what it IS, not what it was. */
const BORROWED_NAME: Record<SixthFamily, Partial<Record<Exclude<Borrowing, "none">, string>>> = {
  major6: { maj7: "maj7", add9: "6/9 (no root)" },
  minor6: { maj7: "m(maj7)", add9: "m6/9 (no root)" },
  dominant7: { add9: "9 (no root)" },
  dominant7b5: { add9: "9b5 (no root)" },
};

export interface MelodyChord {
  /** the melody note, with its octave */
  melody: Note;
  /** true when the diminished harmonises it */
  isDiminished: boolean;
  /** close position, ascending, melody on top */
  close: Note[];
  /** drop 2, ascending, melody on top */
  drop2: Note[];
  /** the chord's name as it sounds, ASCII accidentals ("Gmaj7", "F#dim7") */
  symbol: string;
  /** what borrowing changed, e.g. "E→F#", or "" */
  change: string;
}

/**
 * Harmonise a six-note scale, one chord per melody note, up one octave:
 * tonic to tonic, seven chords.
 */
export function harmoniseMelody(
  hex: Note[], fit: SixthDimFit, borrowing: Borrowing = "none", octave = 4,
): MelodyChord[] {
  const t = hex[0];
  const line: Note[] = hex.map((n) => note(n.letter, n.alt, n.octave - t.octave + octave));
  line.push(note(t.letter, t.alt, octave + 1));
  const chordSet = new Set(fit.chord.map(pc));
  const def = sixthDimById(fit.family);
  const rootPc = pc(fit.root);
  const at = (semis: number) => fit.scale.find((n) => pc(n) === (rootPc + semis) % 12)!;

  return line.map((m) => {
    const isDim = !chordSet.has(pc(m));
    let tones = isDim ? fit.dim : fit.chord;
    let symbol = isDim ? fit.dimSymbol : fit.chordSymbol;
    let change = "";
    if (!isDim && borrowing !== "none" && borrowingsFor(fit.family).includes(borrowing)) {
      /* 6 → maj7 swaps the sixth for the major seventh; add 9 swaps the root
         for the ninth. The melody note is never the one that moves. */
      const [from, to] = borrowing === "maj7" ? [9, 11] : [0, 2];
      const fromNote = at(from);
      if (fromNote && def.chord.includes(from) && pc(fromNote) !== pc(m)) {
        const toNote = at(to);
        tones = tones.map((n) => (pc(n) === pc(fromNote) ? toNote : n));
        symbol = noteName(fit.root) + BORROWED_NAME[fit.family][borrowing];
        change = `${noteName(fromNote)}→${noteName(toNote)}`;
      }
    }
    const close = closeVoicing(m, tones);
    return { melody: m, isDiminished: isDim, close, drop2: drop2(close), symbol, change };
  });
}

/** Display form of any symbol this module produces: ♭ ♯ ° glyphs. */
export function prettySymbol(symbol: string): string {
  const m = symbol.match(/^([A-G])(bb|##|b|#)?(.*)$/);
  if (!m) return symbol;
  const acc = ({ b: "♭", "#": "♯", bb: "♭♭", "##": "♯♯" } as Record<string, string>)[m[2] ?? ""] ?? "";
  const rest = m[3].replace("dim7", "°7").replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯")
    .replace(/\/([A-G])b/, "/$1♭").replace(/\/([A-G])#/, "/$1♯");
  return `${m[1]}${acc}${rest}`;
}

export const prettyNotes = (ns: Note[]) => ns.map(notePretty).join(" ");
