/**
 * Custom scales — build your own.
 *
 * The engine has always been size-agnostic; what was missing was a way to hand it
 * an arbitrary set of notes. The only genuinely hard part is SPELLING: given six
 * pitch classes and a tonic, which letters should they take?
 *
 * The rule the whole app runs on is one letter per degree wherever possible, so
 * this searches letter assignments rather than guessing. It generalises the
 * octatonic solver: assign letters in non-decreasing order, score by accidental
 * cost, punish doubles hard, prefer not to mix sharps with flats, and lean the
 * way the key already leans. Same algorithm, any number of notes.
 */

import {
  Alt, Letter, Note, note, pc, spell, stepLetter, letterIndex,
  parseNoteName, noteName, MAJOR_KEYS,
} from "./note";

export interface SpelledSet {
  notes: Note[];
  /** true when a letter had to be used twice — unavoidable above seven notes */
  repeatedLetter: boolean;
  error?: string;
}

/**
 * Spell an arbitrary set of pitch classes from a tonic.
 * `semis` are semitone offsets above the tonic, ascending, starting at 0.
 */
export function spellSet(tonicName: string, semis: number[]): SpelledSet {
  const t = parseNoteName(tonicName);
  /* Lean flat when the set is minor-flavoured. A blues scale written
     C D# F F# G A# is legal and looks wrong; C Eb F Gb G Bb is the same cost and
     is what a musician would write. A minor third above the tonic is the signal. */
  const minorish = semis.includes(3) || semis.includes(6) || semis.includes(8) || semis.includes(10);
  const flatKey =
    (MAJOR_KEYS[tonicName] ?? 0) < 0 || tonicName.endsWith("b") || minorish;
  const n = semis.length;
  if (!n) return { notes: [], repeatedLetter: false, error: "pick at least one note" };

  let best: Note[] | null = null;
  let bestCost = Infinity;

  /** offsets[i] = letter steps above the tonic letter for note i */
  const walk = (i: number, offsets: number[]) => {
    if (i === n) {
      const cand: Note[] = [];
      for (let k = 0; k < n; k++) {
        const L = stepLetter(t.letter, offsets[k]);
        const oct = t.octave + Math.floor((letterIndex(t.letter) + offsets[k]) / 7);
        const s = spell(L, (pc(t) + semis[k]) % 12, oct);
        if (!s) return;
        cand.push(s);
      }
      const sharps = cand.filter((x) => x.alt > 0).length;
      const flats = cand.filter((x) => x.alt < 0).length;
      const mixed = sharps > 0 && flats > 0 ? 1 : 0;
      const wrongDir = cand.filter((x) => x.alt !== 0 && (x.alt > 0) === flatKey).length;
      const repeats = new Set(cand.map((x) => x.letter)).size < n ? 1 : 0;
      const cost =
        cand.reduce((a, x) => a + x.alt * x.alt, 0) * 10000 +
        repeats * 2000 + mixed * 100 + wrongDir;
      if (cost < bestCost) { bestCost = cost; best = cand; }
      return;
    }
    // a letter may stay (repeat) or advance by one or two, never skip further —
    // skipping three would leave a letter unused with notes still to place
    const prev = i === 0 ? 0 : offsets[i - 1];
    const from = i === 0 ? 0 : prev;
    const to = i === 0 ? 0 : Math.min(prev + 2, 6 + Math.floor(n / 8));
    for (let off = from; off <= to; off++) walk(i + 1, [...offsets, off]);
  };
  walk(0, []);

  if (!best) return { notes: [], repeatedLetter: false,
    error: `${tonicName} cannot spell that set without a triple accidental` };
  const b = best as Note[];
  return { notes: b, repeatedLetter: new Set(b.map((x) => x.letter)).size < n };
}

/** A saved custom scale, small enough to live in a URL. */
export interface CustomScale {
  /** semitone offsets above the tonic, ascending, always starting with 0 */
  semis: number[];
  name?: string;
}

/** Encode as a 12-bit mask in base 36 — three characters at most. */
export function encodeCustom(semis: number[]): string {
  let mask = 0;
  for (const s of semis) mask |= 1 << (((s % 12) + 12) % 12);
  return mask.toString(36);
}

export function decodeCustom(code: string): number[] {
  const mask = parseInt(code, 36);
  if (!Number.isFinite(mask) || mask <= 0) return [0, 2, 4, 7, 9, 11];
  const out: number[] = [];
  for (let i = 0; i < 12; i++) if (mask & (1 << i)) out.push(i);
  return out.includes(0) ? out : [0, ...out];
}

/** A handful of starting points, so the builder is never an empty grid. */
export const CUSTOM_PRESETS: { name: string; semis: number[]; note: string }[] = [
  { name: "Ionian/Lydian hexatonic", semis: [0, 2, 4, 7, 9, 11],
    note: "the major scale without its 4th" },
  { name: "Dorian/Aeolian hexatonic", semis: [0, 2, 3, 5, 7, 10],
    note: "the minor scale without its ♭6" },
  { name: "Blues hexatonic", semis: [0, 3, 5, 6, 7, 10], note: "minor pentatonic + ♭5" },
  { name: "Augmented", semis: [0, 3, 4, 7, 8, 11], note: "two augmented triads a semitone apart" },
  { name: "Whole tone", semis: [0, 2, 4, 6, 8, 10], note: "no perfect fifth anywhere" },
  { name: "Major pentatonic", semis: [0, 2, 4, 7, 9], note: "five notes" },
  { name: "Major scale", semis: [0, 2, 4, 5, 7, 9, 11], note: "the parent" },
  { name: "Empty", semis: [0], note: "start from the tonic and add your own" },
];

/** Describe what the user just built, in plain language. */
export function describeSet(semis: number[]): string {
  const n = semis.length;
  const size =
    n === 5 ? "Audava — five notes" :
    n === 6 ? "Shadava — six notes" :
    n === 7 ? "Sampurna — seven notes" :
    n === 8 ? "eight notes" : `${n} notes`;
  const steps = semis.map((s, i) => ((semis[(i + 1) % n] ?? 12) - s + 12) % 12 || 12);
  const symmetric = new Set(
    Array.from({ length: 12 }, (_, t) =>
      semis.map((s) => (s + t) % 12).sort((a, b) => a - b).join(","))
  ).size < 12;
  return `${size}${symmetric ? " · symmetric" : ""} · steps ${steps.join("-")}`;
}
