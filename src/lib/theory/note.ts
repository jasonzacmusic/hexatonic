/**
 * A note is (letter, alteration, octave). NEVER a bare MIDI integer.
 *
 * This is the single decision that makes every key spell correctly. Build the
 * parent 7-note scale first with one letter per degree, THEN remove the omitted
 * degree — removing first and re-spelling afterwards is how scale apps end up
 * printing E# where F belongs.
 */

export const LETTERS = "CDEFGAB" as const;
export type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
export type Alt = -2 | -1 | 0 | 1 | 2;

export const LETTER_PC: Record<Letter, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};
export const ALT_NAME: Record<string, string> = {
  "-2": "bb", "-1": "b", "0": "", "1": "#", "2": "##",
};
/** Unicode accidentals for display (never for VexFlow keys). */
export const ALT_GLYPH: Record<string, string> = {
  "-2": "♭♭", "-1": "♭", "0": "", "1": "♯", "2": "♯♯",
};

export interface Note {
  letter: Letter;
  alt: Alt;
  octave: number;
}

export const note = (letter: Letter, alt: Alt = 0, octave = 4): Note => ({ letter, alt, octave });

export const pc = (n: Note): number => (((LETTER_PC[n.letter] + n.alt) % 12) + 12) % 12;
export const midi = (n: Note): number => 12 * (n.octave + 1) + LETTER_PC[n.letter] + n.alt;
export const noteName = (n: Note): string => n.letter + ALT_NAME[String(n.alt)];
export const notePretty = (n: Note): string => n.letter + ALT_GLYPH[String(n.alt)];
/** VexFlow key format, e.g. "c#/4". Must use ASCII accidentals. */
export const vexKey = (n: Note): string =>
  `${n.letter.toLowerCase()}${ALT_NAME[String(n.alt)]}/${n.octave}`;

export const letterIndex = (l: Letter): number => LETTERS.indexOf(l);
export const stepLetter = (l: Letter, k: number): Letter =>
  LETTERS[(((letterIndex(l) + k) % 7) + 7) % 7] as Letter;

/** Spell `targetPc` using the given letter. Returns null if it needs > double alt. */
export function spell(letter: Letter, targetPc: number, octave = 4): Note | null {
  let alt = (((targetPc - LETTER_PC[letter]) % 12) + 12) % 12;
  if (alt > 6) alt -= 12;
  if (Math.abs(alt) > 2) return null;
  return note(letter, alt as Alt, octave);
}

export function parseNoteName(s: string, octave = 4): Note {
  const letter = s[0].toUpperCase() as Letter;
  const rest = s.slice(1);
  const alt = (
    { "": 0, "#": 1, "##": 2, b: -1, bb: -2, "♯": 1, "♭": -1 } as Record<string, number>
  )[rest];
  if (alt === undefined) throw new Error(`cannot parse note "${s}"`);
  return note(letter, alt as Alt, octave);
}

/* ── intervals ─────────────────────────────────────────────────────────────
   Named from the LETTER distance plus the semitone distance, so an augmented
   4th is never mislabelled a perfect 4th. That distinction is the whole point
   of Theorem 5 and it cannot be derived from pitch classes alone.            */

const INTERVAL_NAMES: Record<string, string> = {
  "0,0": "P1", "0,1": "A1",
  "1,1": "m2", "1,2": "M2", "1,3": "A2", "1,0": "d2",
  "2,3": "m3", "2,4": "M3", "2,2": "d3", "2,5": "A3",
  "3,5": "P4", "3,6": "A4", "3,4": "d4",
  "4,7": "P5", "4,6": "d5", "4,8": "A5",
  "5,8": "m6", "5,9": "M6", "5,10": "A6", "5,7": "d6",
  "6,10": "m7", "6,11": "M7", "6,9": "d7",
};

export function intervalName(a: Note, b: Note): string {
  const gen = (((letterIndex(b.letter) - letterIndex(a.letter)) % 7) + 7) % 7;
  const semis = (((pc(b) - pc(a)) % 12) + 12) % 12;
  return INTERVAL_NAMES[`${gen},${semis}`] ?? `?${gen}/${semis}`;
}

export const isPerfect = (iv: string) => iv === "P4" || iv === "P5";

/* ── key signatures — 30 keys, no shortcuts ─────────────────────────────── */
export const SHARP_ORDER = "FCGDAEB";
export const FLAT_ORDER = "BEADGCF";

export const MAJOR_KEYS: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, "F#": 6, "C#": 7,
  F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
};

export function keySignatureAlterations(keyName: string): Record<Letter, number> {
  const n = MAJOR_KEYS[keyName];
  if (n === undefined) throw new Error(`${keyName} is not a standard major key`);
  const alts = {} as Record<Letter, number>;
  for (const L of LETTERS) alts[L as Letter] = 0;
  if (n > 0) for (const L of SHARP_ORDER.slice(0, n)) alts[L as Letter] = 1;
  else for (const L of FLAT_ORDER.slice(0, -n)) alts[L as Letter] = -1;
  return alts;
}

/* ── set-class analysis ─────────────────────────────────────────────────── */

/** Standard normal order: minimise the OUTER SPAN first, then pack left.
 *  A naive lexicographic minimum is wrong and silently mislabels set classes. */
export function normalOrder(pcs: number[]): number[] {
  const s = [...new Set(pcs)].sort((a, b) => a - b);
  const n = s.length;
  const rots: number[][] = [];
  for (let i = 0; i < n; i++) {
    rots.push(s.map((_, j) => ((s[(i + j) % n] - s[i]) % 12 + 12) % 12));
  }
  rots.sort((a, b) => {
    if (a[a.length - 1] !== b[b.length - 1]) return a[a.length - 1] - b[b.length - 1];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return rots[0];
}

export function primeForm(pcs: number[]): number[] {
  const a = normalOrder(pcs);
  const b = normalOrder(pcs.map((p) => ((-p % 12) + 12) % 12));
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? a : b;
  }
  return a;
}

export function intervalVector(pcs: number[]): number[] {
  const v = [0, 0, 0, 0, 0, 0];
  const s = [...new Set(pcs)].sort((a, b) => a - b);
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      let ic = (s[j] - s[i]) % 12;
      ic = Math.min(ic, 12 - ic);
      v[ic - 1]++;
    }
  }
  return v;
}

/** Keyed by PRIME FORM. (An earlier version keyed this by raw pitch classes,
 *  so half the lookups silently never matched.) */
export const FORTE: Record<string, string> = {
  "0,2,4,5,7,9": "6-32 · Guidonian / major / diatonic hexachord",
  "0,1,4,5,8,9": "6-20 · augmented (Cohn's hexatonic collection)",
  "0,2,4,6,8,10": "6-35 · whole-tone",
  "0,2,3,5,7,9": "6-33 · Dorian hexachord",
  "0,1,2,4,7,9": "6-Z47 · blues (minor AND major blues — same class, T3 apart)",
  "0,1,3,6,7,9": "6-30 · Petrushka / tritone",
  "0,1,3,5,7,9": "6-34 · Prometheus / mystic",
  "0,2,4,5,7,9,11": "7-35 · diatonic",
  "0,2,4,7,9": "5-35 · major pentatonic",
};

export const forteName = (pcs: number[]): string =>
  FORTE[primeForm(pcs).join(",")] ?? "—";

/** The five tritone-free hexachord set classes, of 50 — verified by enumerating
 *  all 924 six-note subsets of the aggregate. 6-32 and 6-20 are both in here. */
export const TRITONE_FREE_HEXACHORDS = [
  "0,1,2,3,4,5", "0,1,3,4,5,8", "0,1,4,5,8,9", "0,2,3,4,5,7", "0,2,4,5,7,9",
];
