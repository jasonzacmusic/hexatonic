/**
 * THE RESOLUTION SOLVER — the app's actual moat.
 *
 * Jason's ask: "we go in accents of threes, fours, fives, sixes or sevens … such
 * that a time signature is respected, until the scale resolves at the one of the
 * next bar."
 *
 * That is two or three clocks phasing against each other:
 *   the bar    = subdivision × beats            (4/4 in 16ths = 16)
 *   the scale  = scaleSize × octaves            (hexatonic, 1 octave = 6)
 *   the accent = grouping                       (groups of 5 = 5)
 * Resolution = LCM of the clocks you care about.
 *
 * Verified against engine/VERIFIED-OUTPUT.txt. No generator of melodic groupings
 * against a tala exists in any market — this function is why.
 */

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

/** 'accent' — only the accent must return to beat 1 (shorter, groovier).
 *  'full'   — accent AND tonic land on the downbeat together. This is what
 *             "resolves at the one" means to a musician. */
export type ResolveMode = "accent" | "full";

export interface Resolution {
  totalNotes: number;
  bars: number;
  notesPerBar: number;
  patternLength: number;
  reps: number;
  groups: number | null;
  seconds: (bpm: number, subdivision: number) => number;
}

export function solveResolution(
  patternLength: number,
  subdivision: number,
  beatsPerBar: number,
  grouping: number | null,
  mode: ResolveMode
): Resolution {
  const notesPerBar = subdivision * beatsPerBar;
  const cycles = [notesPerBar];
  if (mode === "full") cycles.push(patternLength);
  if (grouping) cycles.push(grouping);
  const totalNotes = cycles.reduce((a, b) => lcm(a, b), 1);
  return {
    totalNotes,
    bars: totalNotes / notesPerBar,
    notesPerBar,
    patternLength,
    reps: totalNotes / patternLength,
    groups: grouping ? totalNotes / grouping : null,
    seconds: (bpm, sub) => (totalNotes * (60 / bpm)) / sub,
  };
}

/** "Locked" = the accent already returns on beat 1 of the very next bar.
 *  Only 5 and 7 genuinely fight a 4/4 bar; 3, 4 and 6 lock in triplets. */
export function isLocked(subdivision: number, beatsPerBar: number, grouping: number): boolean {
  return solveResolution(1, subdivision, beatsPerBar, grouping, "accent").bars === 1;
}

export interface GridRow {
  scaleSize: number;
  subdivision: number;
  grouping: number;
  bars: number;
  totalNotes: number;
  locked: boolean;
}

export function resolutionGrid(
  scaleSizes = [5, 6, 7],
  subdivisions = [2, 3, 4, 6],
  groupings = [3, 4, 5, 6, 7, 9],
  octaves = 1,
  beatsPerBar = 4,
  mode: ResolveMode = "full"
): GridRow[] {
  const rows: GridRow[] = [];
  for (const s of scaleSizes)
    for (const sub of subdivisions)
      for (const g of groupings) {
        const r = solveResolution(s * octaves, sub, beatsPerBar, g, mode);
        rows.push({
          scaleSize: s, subdivision: sub, grouping: g,
          bars: r.bars, totalNotes: r.totalNotes,
          locked: isLocked(sub, beatsPerBar, g),
        });
      }
  return rows;
}

/* ── the Carnatic layer ────────────────────────────────────────────────────
   Verified in docs/07-CARNATIC.md. Three of these syllable sets were wrong in
   an earlier draft — do not "improve" them. Romanisation varies legitimately
   (Tha/Ta, Dhi/Di); we hold one convention throughout.                       */

export interface Gati {
  count: number;
  name: string | null;
  devanagari: string | null;
  konnakol: string;
  etymology?: string;
}

export const GATIS: Record<number, Gati> = {
  3: { count: 3, name: "Tisra", devanagari: "तिश्र", konnakol: "Ta Ki Ta", etymology: "from tri, three" },
  4: { count: 4, name: "Chatusra", devanagari: "चतुरश्र", konnakol: "Ta Ka Di Mi", etymology: "caturaśra, four-sided" },
  5: { count: 5, name: "Khanda", devanagari: "खण्ड", konnakol: "Ta Din Gi Na Tom", etymology: "piece, section" },
  6: { count: 6, name: null, devanagari: null, konnakol: "Ta Ka Di Mi Ta Ka" },
  7: { count: 7, name: "Misra", devanagari: "मिश्र", konnakol: "Ta Ka Di Mi Ta Ki Ta", etymology: "mixed — because 7 = 3 + 4" },
  9: { count: 9, name: "Sankeerna", devanagari: "सङ्कीर्ण", konnakol: "Ta Ka Di Mi Ta Din Gi Na Tom", etymology: "complex — because 9 = 4 + 5" },
};

export const gatiFor = (n: number): Gati | null => GATIS[n] ?? null;

/** The six yatis. There are SIX, not five — vishama is the one people forget.
 *  Srotovaha (a river widening from its source) is the increasing ladder;
 *  gopuccha (a cow's tail, tapering) is the decreasing mirror. These two get
 *  swapped in some writing — the image settles it. */
export const YATIS = [
  { id: "sama",      name: "Sama",      image: "even",                       shape: [5, 5, 5, 5, 5] },
  { id: "srotovaha", name: "Srotovaha", image: "a river widening from its source", shape: [3, 4, 5, 6, 7] },
  { id: "gopuccha",  name: "Gopuccha",  image: "a cow's tail, tapering",     shape: [7, 6, 5, 4, 3] },
  { id: "mridanga",  name: "Mridanga",  image: "the drum — narrow ends, fat middle", shape: [3, 4, 5, 4, 3] },
  { id: "damaru",    name: "Damaru",    image: "hourglass drum — pinched waist", shape: [5, 4, 3, 4, 5] },
  { id: "vishama",   name: "Vishama",   image: "uneven, free-form",          shape: [4, 7, 3, 9, 5] },
] as const;

export type YatiId = (typeof YATIS)[number]["id"];
export const yatiById = (id: string) => YATIS.find((y) => y.id === id) ?? YATIS[1];

/** Kala pramanam — every traditional exercise is practised at three speeds.
 *  Tempo doubling is a first-class axis in this tradition, not a slider. */
export const KALA = [
  { id: 1, label: "1st speed", multiplier: 1 },
  { id: 2, label: "2nd speed", multiplier: 2 },
  { id: 3, label: "3rd speed", multiplier: 4 },
];

export const SUBDIVISIONS = [
  { value: 2, label: "8ths",       short: "♪" },
  { value: 3, label: "triplets",   short: "3" },
  { value: 4, label: "16ths",      short: "♬" },
  { value: 6, label: "sextuplets", short: "6" },
];
