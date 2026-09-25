/**
 * Improvisation: the backing beds and their voicings.
 *
 * THE RULE THAT MAKES THIS TEACH RATHER THAN DECORATE:
 * every chord in every bed (except the 12-bar blues, see blues.ts) is built
 * ONLY from notes the scale actually contains. If a progression would need a
 * note the scale does not have, that chord does not exist here.
 *
 * Progressions are derived from the scale at runtime, by interval above the
 * tonic, never hardcoded per key or per mode. One definition works in all
 * twelve keys and every scale.
 */

import { Note, note, pc, midi, noteName } from "./note";
import { ScaleInstance } from "./scales";
import { findChords, ChordSet } from "./chords";

export type VoicingStyle = "shell" | "rootless" | "quartal" | "spread";

export interface VoicedChord {
  label: string;
  altLabel?: string;
  bass: number;          // midi
  voicing: number[];     // midi, ascending
  chordTones: number[];  // pitch classes sounding — used to light the keys
  degreeRoot: number;    // which scale degree the chord is built on
}

export interface VampStep {
  chord: VoicedChord;
  bars: number;
  /** roman numeral against the tonic, e.g. "I", "vi", "♭VII", "Isus" */
  roman: string;
}

export type BedId = "drone" | "two" | "four" | "sus" | "swing" | "blues";

export interface VampDef {
  id: BedId;
  name: string;
  description: string;
  barsEach: number;
  /** the bed's own groove; the 6/8 toggle can override "straight" */
  feel: "straight" | "swing";
}

/** Six beds, each with a different job. */
export const VAMPS: VampDef[] = [
  {
    id: "drone", name: "Drone", feel: "straight", barsEach: 4,
    description: "Root and fifth, nothing else. Hear every note of the scale against the root.",
  },
  {
    id: "two", name: "Two-chord", feel: "straight", barsEach: 2,
    description: "The tonic and one partner chord, two bars each. I–vi in major, i–♭VII in minor.",
  },
  {
    id: "four", name: "Four-chord loop", feel: "straight", barsEach: 1,
    description: "Four of the scale's own chords, one bar each.",
  },
  {
    id: "sus", name: "Suspended pad", feel: "straight", barsEach: 2,
    description: "Open stacks of fifths with no 3rd, so nothing pulls. Two of them, two bars each.",
  },
  {
    id: "swing", name: "Swing", feel: "swing", barsEach: 2,
    description: "Swung comping and a walking bass, two chords.",
  },
  {
    id: "blues", name: "12-bar blues", feel: "swing", barsEach: 1,
    description: "Twelve bars, three dominant 7th chords. The chords sit outside the scale on purpose.",
  },
];

export const vampById = (id: string) => VAMPS.find((v) => v.id === id) ?? VAMPS[0];

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Semitones of each scale note above the tonic. */
const semisOf = (scale: ScaleInstance) =>
  scale.notes.map((n) => mod(pc(n) - pc(scale.notes[0]), 12));

/** Stack scale degrees into a chord, wrapping the octave as we climb. */
function stackFromDegree(scale: Note[], degree: number, count: number, skip = 2): Note[] {
  const n = scale.length;
  const out: Note[] = [];
  for (let i = 0; i < count; i++) {
    const idx = degree + i * skip;
    const base = scale[mod(idx, n)];
    out.push(note(base.letter, base.alt, base.octave + Math.floor(idx / n)));
  }
  return out;
}

/**
 * The chord ROOTED on a scale degree.
 *
 * ⚠️ You cannot build a triad in a six-note scale by taking "every other scale
 * degree": in G A B D E F♯ that gives G–B–E, which is E minor, not G. Chords are
 * looked up by real interval from the scale's chord table, never by degree
 * arithmetic.
 */
function chordOnDegree(scale: ScaleInstance, degree: number, tertianOnly = false): ChordSet | null {
  const n = scale.notes.length;
  const rootName = noteName(scale.notes[mod(degree, n)]);
  const all = findChords(scale.notes, [3, 4]);
  /* On the tonic of a scale with a major 3rd, prefer the chord that has it:
     the major blues G A B♭ B D E holds both Gm6 and G6, and it is a major sound. */
  const root = scale.notes[mod(degree, n)];
  const major3 = (pc(root) + 4) % 12;
  const wantsMajor = mod(degree, n) === 0 && scale.notes.some((x) => pc(x) === major3);
  const rooted = (size: 3 | 4, tertian: boolean) => {
    const hits = all.filter((c) =>
      c.size === size &&
      c.names.some((x) => x.root === rootName && (!tertian || x.family === "tertian"))
    );
    /* …and a perfect 5th over a flattened one: the blues holds Gm7♭5 and Gm7. */
    const p5 = (pc(root) + 7) % 12;
    /* …and a 7th chord over a 6th chord when the scale has a 7th: Gmaj7, G7. */
    const has7 = (c: ChordSet) => c.pcs.includes((pc(root) + 10) % 12) || c.pcs.includes((pc(root) + 11) % 12);
    const score = (c: ChordSet) =>
      (c.pcs.includes(p5) ? 4 : 0) + (wantsMajor && c.pcs.includes(major3) ? 2 : 0) + (has7(c) ? 1 : 0);
    return hits.reduce<ChordSet | undefined>((b, c) => (!b || score(c) > score(b) ? c : b), undefined);
  };
  return rooted(4, true) ?? rooted(3, true) ??
    (tertianOnly ? null : rooted(4, false) ?? rooted(3, false) ?? null);
}

/** A chord's notes as an ascending stack from the given root. */
function ascendingFrom(chord: ChordSet, rootName: string, octave: number): Note[] {
  const named = chord.names.find((x) => x.root === rootName) ?? chord.names[0];
  const out: Note[] = [];
  let oct = octave, prev = -1;
  for (const nm of named.notes) {
    const src = chord.notes.find((x) => noteName(x) === nm);
    if (!src) continue;
    if (prev >= 0 && pc(src) <= prev) oct++;
    prev = pc(src);
    out.push(note(src.letter, src.alt, oct));
  }
  return out;
}

const clampComp = (m: number) => { let v = m; while (v < 55) v += 12; while (v > 84) v -= 12; return v; };

/**
 * An open stack of perfect fifths on a scale degree — root, 5, 9, 13 — as far
 * as the scale's own notes allow. Four fifths up from a root never reach its
 * 3rd, so the result is always suspended: G D A E is G6sus2.
 */
export function fifthsStack(scale: ScaleInstance, degree: number): Note[] {
  const n = scale.notes.length;
  const root = scale.notes[mod(degree, n)];
  const out: Note[] = [note(root.letter, root.alt, 3)];
  while (out.length < 4) {
    const top = out[out.length - 1];
    const next = scale.notes.find((x) => pc(x) === (pc(top) + 7) % 12);
    if (!next) break;
    let v = note(next.letter, next.alt, top.octave);
    while (midi(v) <= midi(top)) v = note(v.letter, v.alt, v.octave + 1);
    out.push(v);
  }
  return out;
}

const SUS_NAME = ["5", "5", "sus2", "sus2", "6sus2"];
const susLabel = (stack: Note[]) =>
  noteName(stack[0]) + (stack.length === 2 ? "5" : SUS_NAME[stack.length] ?? "sus2");

/**
 * Build a playable voicing on a scale degree.
 *  shell    — root, 3rd and 7th. The jazz default.
 *  rootless — drop the root and let the bass own it.
 *  quartal  — stacked fourths, by stepping three scale degrees.
 *  spread   — the whole chord, wide, for slow feels.
 */
export function voiceDegree(
  scale: ScaleInstance, degree: number, style: VoicingStyle, octave = 4
): VoicedChord {
  const n = scale.notes.length;
  const rootNote = scale.notes[mod(degree, n)];
  const rootName = noteName(rootNote);
  const bass = midi(note(rootNote.letter, rootNote.alt, octave - 2));

  const chord = chordOnDegree(scale, degree);
  const open = fifthsStack(scale, degree);
  const quartalStack = open.length >= 3 ? open : stackFromDegree(scale.notes, degree, 4, 3);

  let tones: Note[];
  if (style === "quartal" || !chord) {
    tones = quartalStack;
  } else {
    const asc = ascendingFrom(chord, rootName, octave);
    tones =
      style === "shell"
        ? asc.filter((_, i) => i === 0 || i === 1 || i === asc.length - 1)
        : style === "rootless"
          ? (asc.length > 3 ? asc.slice(1) : asc)
          : asc;
  }

  const raw = tones.map((t) => midi(note(t.letter, t.alt, t.octave + (octave - 4))));
  /* An open stack keeps its shape: move it as a block. Other voicings fold
     each note into the comping range. */
  let shift = 0;
  if (style === "quartal" || !chord) {
    while (Math.min(...raw) + shift < 55) shift += 12;
    while (Math.max(...raw) + shift > 84 + 12) shift -= 12;
  }
  const lifted = [...new Set(raw.map((m) =>
    style === "quartal" || !chord ? m + shift : clampComp(m)))].sort((a, b) => a - b);

  const useChordLabel = chord && style !== "quartal";
  const named = useChordLabel
    ? [...chord!.names].sort((a, b) =>
        Number(b.root === rootName) - Number(a.root === rootName))
    : [];

  return {
    label: named[0]?.symbol ?? (open.length >= 3 ? susLabel(open) : `${rootName} open`),
    altLabel: named[1]?.symbol,
    bass,
    voicing: lifted,
    chordTones: useChordLabel ? chord!.pcs : [...new Set(quartalStack.map(pc))],
    degreeRoot: mod(degree, n),
  };
}

/** Root and fifth (or root and octave, when the scale has no perfect fifth). */
function droneChord(scale: ScaleInstance, octave = 4): VoicedChord {
  const t = scale.notes[0];
  const r = midi(note(t.letter, t.alt, octave - 1));
  const hasFifth = semisOf(scale).includes(7);
  const upper = hasFifth ? [r + 7, r + 12] : [r + 12];
  return {
    label: noteName(t),
    bass: midi(note(t.letter, t.alt, octave - 2)),
    voicing: upper.map(clampComp).sort((a, b) => a - b),
    chordTones: hasFifth ? [pc(t), (pc(t) + 7) % 12] : [pc(t)],
    degreeRoot: 0,
  };
}

const ROMAN_BY_SEMI = ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"];

/** Roman numeral of a chord against the scale's tonic, from the notes it holds. */
export function romanOf(scale: ScaleInstance, chord: VoicedChord): string {
  const rootPc = pc(scale.notes[chord.degreeRoot]);
  const numeral = ROMAN_BY_SEMI[mod(rootPc - pc(scale.notes[0]), 12)];
  const has = (s: number) => chord.chordTones.includes((rootPc + s) % 12);
  if (has(3) && !has(4)) return numeral.toLowerCase() + (has(6) && !has(7) ? "°" : "");
  if (has(4)) return numeral + (has(8) && !has(7) ? "+" : "");
  return `${numeral}sus`;
}

/** The first scale degree, in order of preference, that carries a tertian chord. */
function pickDegrees(scale: ScaleInstance, prefs: number[], count: number, skipTonic = true): number[] {
  const semis = semisOf(scale);
  const out: number[] = [];
  for (const s of prefs) {
    const d = semis.indexOf(s);
    if (d < 0 || (skipTonic && d === 0) || out.includes(d)) continue;
    if (!chordOnDegree(scale, d, true)) continue;
    out.push(d);
    if (out.length === count) break;
  }
  return out;
}

const colour = (scale: ScaleInstance) => {
  const semis = semisOf(scale);
  return semis.includes(4) ? "major" : semis.includes(3) ? "minor" : "none";
};

/** Which scale degrees a bed plays, for this scale. Empty when it cannot be built. */
export function bedDegrees(scale: ScaleInstance, id: BedId): number[] {
  const c = colour(scale);
  if (id === "drone") return [0];
  if (id === "two") {
    const prefs = c === "major" ? [9, 4, 5, 7, 2] : c === "minor" ? [10, 8, 5, 7, 3] : [10, 5, 7, 2, 9];
    const p = pickDegrees(scale, prefs, 1);
    return p.length ? [0, ...p] : [];
  }
  if (id === "four") {
    const prefs = c === "minor" ? [10, 8, 5, 3, 7, 2] : [9, 5, 7, 2, 4, 10, 11];
    const p = pickDegrees(scale, prefs, 3);
    return p.length === 3 ? [0, ...p] : [];
  }
  if (id === "sus") {
    if (fifthsStack(scale, 0).length < 3) return [];
    const semis = semisOf(scale);
    for (const s of [10, 5, 2, 7, 3, 8]) {
      const d = semis.indexOf(s);
      if (d > 0 && fifthsStack(scale, d).length >= 3) return [0, d];
    }
    return [];
  }
  if (id === "swing") {
    const prefs = c === "minor" ? [5, 7, 10, 8] : [7, 5, 2, 9];
    const p = pickDegrees(scale, prefs, 1);
    return p.length ? [0, ...p] : [];
  }
  return [];
}

export function buildVamp(
  scale: ScaleInstance, vamp: VampDef, style: VoicingStyle
): VampStep[] {
  if (vamp.id === "blues") return [];
  if (vamp.id === "drone") {
    const chord = droneChord(scale);
    return [{ chord, bars: vamp.barsEach, roman: "I" }];
  }
  const voicingStyle = vamp.id === "sus" ? "quartal" : style;
  return bedDegrees(scale, vamp.id).map((d) => {
    const chord = voiceDegree(scale, d, voicingStyle);
    return { chord, bars: vamp.barsEach, roman: romanOf(scale, chord) };
  });
}

/** The beds this scale can carry. The blues is always available: it brings
 *  its own chords. */
export function vampsFor(scale: ScaleInstance): VampDef[] {
  return VAMPS.filter((v) => v.id === "blues" || v.id === "drone" || bedDegrees(scale, v.id).length > 0);
}

/** Guide tones: which of the scale's notes are chord tones right now, and which
 *  are the colour notes that make the line move. Both are correct to play — the
 *  distinction is what to LAND on. */
export function guideTones(scale: ScaleInstance, chord: VoicedChord) {
  const chordPcs = new Set(chord.chordTones);
  return {
    chordTones: scale.notes.filter((x) => chordPcs.has(pc(x))),
    colourTones: scale.notes.filter((x) => !chordPcs.has(pc(x))),
  };
}

/**
 * Where the loop is heading: from the bar and beat now sounding, how many
 * beats until the next chord, and which chord that is. null for a one-chord bed.
 */
export function nextChange(
  bars: number[], bar: number, beat: number, beatsPerBar: number, labels?: string[],
): { beats: number; index: number } | null {
  if (bars.length < 2) return null;
  if (labels && new Set(labels).size < 2) return null;
  let end = 0;
  for (let i = 0; i < bars.length; i++) {
    end += bars[i];
    if (bar > end) continue;
    let beats = (end - bar) * beatsPerBar + (beatsPerBar - beat) + 1;
    let next = (i + 1) % bars.length;
    /* A repeated chord (C7 C7 C7 C7) is not a change: count on to the next new one. */
    while (labels && labels[next] === labels[i]) {
      beats += bars[next] * beatsPerBar;
      next = (next + 1) % bars.length;
    }
    return { beats, index: next };
  }
  return null;
}
