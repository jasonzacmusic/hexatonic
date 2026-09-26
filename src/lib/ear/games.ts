/**
 * The five ear games: levels, question generation and the reveal.
 *
 * Rules every question obeys (tests/ear.test.ts checks each one):
 *   · the key is set before the question, by a tonic drone or a cadence;
 *   · the correct answer is always one of the choices;
 *   · no two choices sound the same (different notes above the same tonic,
 *     or a different accent pattern), and no choice's notes are all inside
 *     another's, so a short tune can never fit two answers;
 *   · the audio really contains the note that tells the answer, and a missing
 *     note is really missing;
 *   · the reveal plays your pick, then the right answer.
 *
 * Each game has levels, easiest first. The level decides the choices and how
 * much help the prompt gives (a chord after the tune, notes in order, the
 * melody moving with the accents). Levels unlock in progress.ts.
 */

import { Note, notePretty, parseNoteName, pc, spell, stepLetter } from "../theory/note";
import { gatiFor, lcm } from "../theory/resolution";
import { EarProgram, ProgramBuilder, cadenceChords } from "./program";
import { PHRASES, SWUNG, stepTime } from "./phrases";
import {
  EAR_KEYS, PARENTS, Parent, Quality, SOUNDS, SoundDef, Spelled, degreeLabel, fillTell,
  relSemi, soundById, spellParent, spellSound,
} from "./sounds";

export type GameId = "quality" | "mode" | "family" | "missing" | "accents";

export interface GameInfo {
  id: GameId;
  title: string;
  line: string;
}

export const GAMES: GameInfo[] = [
  { id: "quality", title: "Major, minor or suspended?", line: "Hear the 3rd: bright, dark, or neither." },
  { id: "mode", title: "Which mode?", line: "A short tune over a drone. Name the colour." },
  { id: "family", title: "Which family?", line: "Diatonic, blues, whole tone and more." },
  { id: "missing", title: "Which note is missing?", line: "A scale with one note gone. Find the gap." },
  { id: "accents", title: "Groups of 3, 4, 5 or 7?", line: "Hear where the accents fall." },
];
export const gameById = (id: string) => GAMES.find((g) => g.id === id) ?? GAMES[0];

export interface LevelInfo {
  name: string;
  line: string;
}

/** Easiest first. Each one unlocks after a streak on the one before it. */
export const LEVELS: Record<GameId, LevelInfo[]> = {
  quality: [
    { name: "Chords", line: "Just the chord on the tonic: 1, the 3rd or the 4, and 5." },
    { name: "Tune and chord", line: "A short tune, then its chord." },
    { name: "Tune only", line: "Only the tune. Find the 3rd inside it." },
  ],
  mode: [
    { name: "Three colours", line: "Major, minor, suspended. Tune, then chord." },
    { name: "Five colours", line: "Adds Sunday Scale and Dark minor." },
    { name: "All six", line: "Adds Unstable. Tune only, no chord." },
  ],
  family: [
    { name: "Three families", line: "Diatonic, blues, whole tone." },
    { name: "Four families", line: "Adds augmented." },
    { name: "Six families", line: "Adds major blues and Prometheus. Tune only." },
    { name: "Colour and world", line: "Sunday Scale, Prometheus, Hirajoshi, In sen, blues, whole tone." },
  ],
  missing: [
    { name: "Major, up and down", line: "A major scale, up and back down." },
    { name: "Major or minor", line: "Major or natural minor, up once." },
    { name: "Scrambled", line: "The six notes in any order, over a drone." },
  ],
  accents: [
    { name: "3 or 4", line: "Two choices. The tune moves with the accents." },
    { name: "3, 4, 5 or 7", line: "All four groupings, tune moving with them." },
    { name: "Accents only", line: "One repeated note. Only the loud ones tell you." },
  ],
};
export const levelCount = (g: GameId) => LEVELS[g].length;
export const clampLevel = (g: GameId, level: number) =>
  Math.min(Math.max(1, Math.round(level) || 1), levelCount(g));

export interface Options {
  /** steps per minute for the pitch games; the accent game runs about twice as fast */
  tempo: number;
  /** a fixed key for the whole session, or null for a new key each round */
  fixedKey: string | null;
  /** 1 = easiest; see LEVELS */
  level: number;
}

export const DEFAULT_OPTIONS: Options = { tempo: 108, fixedKey: null, level: 1 };

export interface Choice {
  id: string;
  label: string;
  hint?: string;
}

export interface Chip {
  /** big text: a note name, or the count in a group */
  label: string;
  /** small text: the degree, or nothing */
  sub?: string;
  /** "removed" is the missing note (red); "absent" is a note your pick leaves out */
  state?: "removed" | "absent" | "tell";
  accent?: boolean;
}

export interface Row {
  id: string;
  title: string;
  kind: "notes" | "rhythm";
  chips: Chip[];
  /** the notes to show on the keyboard and the ring while this row sounds */
  scale?: Note[];
  /** the missing note, drawn red on the keyboard and the ring */
  removed?: Note | null;
}

export interface Reveal {
  right: boolean;
  verdict: string;
  tell: string;
  detail?: string;
  rows: Row[];
  program: EarProgram;
  /** the tonic's MIDI note, so the keyboard can frame it */
  tonicMidi?: number;
}

export interface Question {
  game: GameId;
  level: number;
  /** the key name as spelled (may be the enharmonic of the one asked for) */
  key: string;
  /** pitch class of the tonic, for "same key all session" */
  tonicPc: number;
  choices: Choice[];
  answer: string;
  prompt: EarProgram;
  /** What each choice would SOUND like, as a comparable string. Two choices
   *  with the same signature could not be told apart by ear. */
  signatures: Record<string, string>;
  reveal: (pick: string) => Reveal;
  /** for the tests: facts about the prompt */
  facts: Record<string, unknown>;
}

type Rng = () => number;
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length) % xs.length];

function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PC_OF: Record<string, number> = {};
for (const k of [...EAR_KEYS, "C#", "Gb", "D#", "G#", "A#"]) PC_OF[k] = pc(parseNoteName(k));

/** A key for this round: the fixed one, or a new one that is not the last one. */
export function chooseKey(opts: Options, previous: string | null, rng: Rng): string {
  if (opts.fixedKey) return opts.fixedKey;
  const prevPc = previous ? PC_OF[previous] : -1;
  const pool = EAR_KEYS.filter((k) => PC_OF[k] !== prevPc);
  return pick(pool, rng);
}

/* ── shared building blocks ───────────────────────────────────────────── */

/** One step: a gentle eighth note. 0.5 s at the default tempo. */
const stepOf = (opts: Options) => 54 / opts.tempo;

/** Melody loudness. The drone sits well under it (program.ts). */
const VEL = 0.66;
const VEL_LEAN = 0.8;

/** Ascending through the scale to the octave; optionally back down. */
function runIndices(n: number, updown: boolean): number[] {
  const up = Array.from({ length: n + 1 }, (_, i) => i);
  return updown ? [...up, ...up.slice(0, -1).reverse()] : up;
}

/** The notes voiced as one chord: the 1st, 3rd, 5th notes of the scale, then
 *  the others an octave up — a stack, not a cluster. */
function stackChord(midis: number[]): number[] {
  const order = [...midis.keys()].filter((i) => i % 2 === 0)
    .concat([...midis.keys()].filter((i) => i % 2 === 1));
  const out: number[] = [];
  for (const i of order) {
    let m = midis[i];
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
}

function noteChips(sp: Spelled, lean: number[] = [], withOctave = true): Chip[] {
  const t = sp.notes[0];
  const chips: Chip[] = sp.notes.map((n, i) => ({
    label: notePretty(n),
    sub: degreeLabel(t, n),
    state: lean.includes(i) ? "tell" : undefined,
  }));
  if (withOctave) chips.push({ label: notePretty(t), sub: "1" });
  return chips;
}

/** Index of each note of `sp` whose semitone is in `semis`. */
const indicesOf = (sp: Spelled, semis: number[]) =>
  sp.notes.map((n, i) => (semis.includes(relSemi(sp.notes[0], n)) ? i : -1)).filter((i) => i >= 0);

/** Play a spelled scale up (and optionally down) with the chips lighting. The
 *  notes in `lean` are held a little longer and a little louder, so the note
 *  that tells the answer stands out. Legato: each note rings into the next. */
function playRun(
  b: ProgramBuilder, midis: number[], step: number, row: string | null, updown: boolean,
  lean: number[] = [],
) {
  const all = [...midis, midis[0] + 12];
  const idx = runIndices(midis.length, updown);
  idx.forEach((i, k) => {
    const leaning = lean.includes(i % midis.length);
    const hold = leaning ? 1.5 : 1;
    const last = k === idx.length - 1;
    b.add({
      midis: [all[i]], dur: step * hold * (last ? 2.2 : 1.08), vel: leaning ? VEL_LEAN : VEL,
      melody: true, mark: row ? { row, chips: [i] } : undefined,
    });
    b.wait(step * hold);
  });
}

function playChord(b: ProgramBuilder, midis: number[], row: string | null) {
  const stack = stackChord(midis);
  b.add({
    midis: stack, dur: 2.2, vel: 0.46, spread: 0.07, melody: true,
    mark: row ? { row, chips: [...midis.keys()] } : undefined,
  });
  b.wait(2.4);
}

/**
 * Play a sound's tune (phrases.ts) from its tonic. Legato, with a gentle rise
 * in loudness towards the top of the phrase and a lean on the tell. The blues
 * sounds are swung. Returns the notes played, for the tests.
 */
function playPhrase(b: ProgramBuilder, def: SoundDef, tonic: number, step: number) {
  const phrase = PHRASES[def.id];
  if (!phrase) throw new Error(`no ear phrase for ${def.id}`);
  const swing = SWUNG.has(def.id);
  const lo = Math.min(...phrase.map((p) => p[0]));
  const hi = Math.max(...phrase.map((p) => p[0]));
  const start = b.t;
  let pos = 0;
  phrase.forEach(([semi, len], i) => {
    const on = stepTime(pos, swing), off = stepTime(pos + len, swing);
    const last = i === phrase.length - 1;
    const lean = def.tellSemis.includes(((semi % 12) + 12) % 12);
    const lift = hi > lo ? (semi - lo) / (hi - lo) : 0;
    b.add({
      midis: [tonic + semi], dur: (off - on) * step * (last ? 1.5 : 1.08),
      vel: Math.round((0.6 + 0.1 * lift + (lean ? 0.07 : 0)) * 1000) / 1000, melody: true,
    }, start + on * step);
    pos += len;
  });
  b.t = start + stepTime(pos, swing) * step + step * 0.5;
}

/** Set the key with the tonic alone: the drone (added by the caller from 0)
 *  and one soft tonic where the tune will sit. Neutral: no 3rd, no 5th. */
function droneIntro(b: ProgramBuilder, step: number, tonic: number) {
  b.phase("Setting the key");
  b.add({ midis: [tonic], dur: 1.6, vel: 0.42 });
  b.wait(Math.max(2, step * 4));
}

/** "This one has ♭6 (E♭). Minor (no 6) has 2 (A) instead." Only when one or
 *  two notes differ; past that, the count says it better than a list. */
function diffLine(answer: SoundDef, sa: Spelled, other: SoundDef, so: Spelled): string {
  const onlyA = sa.notes.filter((n) => !other.semis.includes(relSemi(sa.notes[0], n)));
  const onlyO = so.notes.filter((n) => !answer.semis.includes(relSemi(so.notes[0], n)));
  if (!onlyA.length && !onlyO.length) return "";
  if (onlyA.length > 2 || onlyO.length > 2)
    return `The two share only ${sa.notes.length - onlyA.length} of their notes.`;
  const list = (ns: Note[], t: Note) =>
    ns.map((n) => `${degreeLabel(t, n)} (${notePretty(n)})`).join(" and ");
  if (!onlyO.length) return `This one has ${list(onlyA, sa.notes[0])}; ${other.label} leaves it out.`;
  if (!onlyA.length) return `${other.label} adds ${list(onlyO, so.notes[0])}.`;
  return `This one has ${list(onlyA, sa.notes[0])}. ${other.label} has ${list(onlyO, so.notes[0])} instead.`;
}

/** "E♭", "F♯" — the key as a musician reads it. */
export const keyName = (k: string) => k.replace("#", "♯").replace(/^([A-G])b$/, "$1♭");

/** A choice's name, for the session summary. */
export function choiceLabel(game: GameId, id: string): string {
  switch (game) {
    case "quality": return label(QUALITY_CHOICES, id);
    case "mode": return soundById(id).label;
    case "family": return FAMILY_LABEL[id] ?? id;
    case "missing": return `the ${ORDINAL[Number(id)] ?? id}`;
    case "accents": return `groups of ${id}`;
  }
}

/* ── 1. major, minor or suspended ─────────────────────────────────────── */

export const QUALITY_CHOICES: Choice[] = [
  { id: "major", label: "Major", hint: "has the 3" },
  { id: "minor", label: "Minor", hint: "has the ♭3" },
  { id: "sus", label: "Suspended", hint: "no 3rd" },
];
/** The pool: six-note sounds with one clear kind of 3rd (or none) and a perfect 5th. */
export const QUALITY_POOL = SOUNDS.filter((s) => s.quality && s.semis.includes(7) && s.semis.length === 6);
/** The note that decides: semitones and letter steps above the tonic. */
export const QUALITY_NOTE: Record<Quality, { semi: number; letters: number }> = {
  major: { semi: 4, letters: 2 }, minor: { semi: 3, letters: 2 }, sus: { semi: 5, letters: 3 },
};

function triad(tonic: Note, tonicMidi: number, q: Quality) {
  const d = QUALITY_NOTE[q];
  const third = spell(stepLetter(tonic.letter, d.letters), (pc(tonic) + d.semi) % 12)!;
  const fifth = spell(stepLetter(tonic.letter, 4), (pc(tonic) + 7) % 12)!;
  return {
    midis: [tonicMidi, tonicMidi + d.semi, tonicMidi + 7],
    notes: [tonic, third, fifth],
    chips: [
      { label: notePretty(tonic), sub: "1" },
      { label: notePretty(third), sub: degreeLabel(tonic, third), state: "tell" },
      { label: notePretty(fifth), sub: "5" },
    ] as Chip[],
  };
}

/** Up the triad, then the chord. The 3rd is leaned on a little. */
function playTriad(b: ProgramBuilder, midis: number[], row: string | null, chipIdx: number[], step: number) {
  const gap = Math.max(0.42, step * 0.9);
  midis.forEach((m, i) => {
    b.add({
      midis: [m], dur: gap * 1.15, vel: i === 1 ? 0.72 : 0.62, melody: true,
      mark: row ? { row, chips: [chipIdx[i]] } : undefined,
    });
    b.wait(gap);
  });
  b.add({
    midis, dur: 1.8, vel: 0.52, spread: 0.02, melody: true,
    mark: row ? { row, chips: chipIdx } : undefined,
  });
  b.wait(2);
}

export function qualityQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const level = clampLevel("quality", opts.level);
  const q = pick(["major", "minor", "sus"] as Quality[], rng);
  const def = pick(QUALITY_POOL.filter((s) => s.quality === q), rng);
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const step = stepOf(opts);
  const tonic = sp.notes[0];
  const deg = (semi: number) => sp.midis.findIndex((m) => m - sp.midis[0] === semi);
  const tri = [0, deg(QUALITY_NOTE[q].semi), deg(7)];
  const answerTriad = triad(tonic, sp.midis[0], q);

  const b = new ProgramBuilder();
  droneIntro(b, step, sp.midis[0]);
  b.phase("Listen");
  if (level === 1) playTriad(b, answerTriad.midis, null, [0, 1, 2], step);
  else {
    playPhrase(b, def, sp.midis[0], step);
    if (level === 2) playTriad(b, tri.map((i) => sp.midis[i]), null, [0, 1, 2], step);
  }
  b.drone(sp.midis[0], 0, b.t);
  const prompt = b.build();

  return {
    game: "quality", level, key: sp.key, tonicPc: pc(tonic), choices: QUALITY_CHOICES, answer: q, prompt,
    signatures: Object.fromEntries(QUALITY_CHOICES.map((c) => [c.id, `3rd:${QUALITY_NOTE[c.id as Quality].semi}`])),
    facts: { sound: def.id, midis: sp.midis },
    reveal: (p) => {
      const right = p === q;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        const t = triad(tonic, sp.midis[0], p as Quality);
        rows.push({ id: "pick", title: `Your pick: ${label(QUALITY_CHOICES, p).toLowerCase()} chord`, kind: "notes", chips: t.chips, scale: t.notes });
        r.phase(`Your pick: ${label(QUALITY_CHOICES, p).toLowerCase()}`);
        playTriad(r, t.midis, "pick", [0, 1, 2], step);
        r.wait(0.4);
      }
      r.phase(`The answer: ${label(QUALITY_CHOICES, q).toLowerCase()}`);
      if (level === 1) {
        rows.push({ id: "answer", title: `The answer: ${label(QUALITY_CHOICES, q).toLowerCase()} chord`, kind: "notes", chips: answerTriad.chips, scale: answerTriad.notes });
        playTriad(r, answerTriad.midis, "answer", [0, 1, 2], step);
      } else {
        const chips = noteChips(sp, [tri[1]]);
        rows.push({ id: "answer", title: `The answer: ${def.label}`, kind: "notes", chips, scale: sp.notes });
        playRun(r, sp.midis, step, "answer", false, [tri[1]]);
        playTriad(r, tri.map((i) => sp.midis[i]), "answer", tri, step);
      }
      r.drone(sp.midis[0], 0, r.t);
      const decides = sp.notes[deg(QUALITY_NOTE[q].semi)];
      const named = `${degreeLabel(tonic, decides)} (${notePretty(decides)})`;
      const tell =
        q === "major" ? `The ${named} makes it major.`
        : q === "minor" ? `The ${named} makes it minor.`
        : `There is no 3rd, so it is neither major nor minor. The ${named} takes its place.`;
      const what = level === 1 ? `a ${label(QUALITY_CHOICES, q).toLowerCase()} chord` : def.label;
      return {
        right,
        verdict: right
          ? `Yes: ${label(QUALITY_CHOICES, q).toLowerCase()}. ${level === 1 ? "A chord" : def.label} on ${keyName(sp.key)}.`
          : `It was ${what} on ${keyName(sp.key)}. You said ${label(QUALITY_CHOICES, p).toLowerCase()}.`,
        tell, rows, program: r.build(), tonicMidi: sp.midis[0],
      };
    },
  };
}

const label = (cs: Choice[], id: string) => cs.find((c) => c.id === id)?.label ?? id;

/* ── 2. which mode ────────────────────────────────────────────────────── */

/** Ordered bright to dark, so the buttons read like a scale of colour. */
export const MODE_LEVELS: string[][] = [
  ["maj-no4", "sus", "min-no6"],
  ["maj-no4", "folk", "sus", "min-no6", "dark"],
  ["maj-no4", "folk", "sus", "min-no6", "dark", "unstable"],
];

/** Shared by the mode and family games: a tune over a drone, then its chord. */
function scaleQuestion(
  game: GameId, level: number, opts: Options, prevKey: string | null, rng: Rng,
  choices: Choice[], soundFor: (choiceId: string, answerSp: Spelled | null) => SoundDef,
  answer: string, tellFor: (def: SoundDef, sp: Spelled) => string, withChord: boolean,
): Question {
  const def = soundFor(answer, null);
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const step = stepOf(opts);
  const b = new ProgramBuilder();
  droneIntro(b, step, sp.midis[0]);
  b.phase("Listen");
  playPhrase(b, def, sp.midis[0], step);
  if (withChord) playChord(b, sp.midis, null);
  b.drone(sp.midis[0], 0, b.t);

  const sigs: Record<string, string> = {};
  for (const c of choices) sigs[c.id] = soundFor(c.id, sp).semis.join(",");

  return {
    game, level, key: sp.key, tonicPc: pc(sp.notes[0]), choices, answer, prompt: b.build(),
    signatures: sigs, facts: { sound: def.id, midis: sp.midis },
    reveal: (p) => {
      const right = p === answer;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      let detail = "";
      /* Lean on what differs: the notes one has and the other does not. When
         you were right, lean on the notes that give the answer its colour. */
      let answerLean = indicesOf(sp, def.tellSemis);
      if (!right) {
        const pd = soundFor(p, sp);
        const ps = spellSound(sp.key, pd);
        const pickLean = indicesOf(ps, pd.semis.filter((s) => !def.semis.includes(s)));
        answerLean = indicesOf(sp, def.semis.filter((s) => !pd.semis.includes(s)));
        /* A "Diatonic" pick is played as its nearest diatonic sound; say which. */
        const pickName = p === "diatonic" ? `Diatonic · ${pd.label}` : pd.label;
        rows.push({ id: "pick", title: `Your pick: ${pickName}`, kind: "notes", chips: noteChips(ps, pickLean), scale: ps.notes });
        r.phase(`Your pick: ${pickName}`);
        playRun(r, ps.midis, step, "pick", false, pickLean);
        playChord(r, ps.midis, "pick");
        r.wait(0.3);
        detail = diffLine(def, sp, pd, ps);
      }
      rows.push({ id: "answer", title: `The answer: ${def.label}`, kind: "notes", chips: noteChips(sp, answerLean), scale: sp.notes });
      r.phase(`The answer: ${def.label}`);
      playRun(r, sp.midis, step, "answer", false, answerLean);
      playChord(r, sp.midis, "answer");
      r.drone(sp.midis[0], 0, r.t);
      const pickLabel = choices.find((c) => c.id === p)?.label ?? p;
      const ansLabel = choices.find((c) => c.id === answer)?.label ?? answer;
      return {
        right,
        verdict: right ? `Yes: ${ansLabel}, on ${keyName(sp.key)}.` : `It was ${ansLabel}, on ${keyName(sp.key)}. You said ${pickLabel}.`,
        tell: tellFor(def, sp), detail, rows, program: r.build(), tonicMidi: sp.midis[0],
      };
    },
  };
}

export function modeQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const level = clampLevel("mode", opts.level);
  const ids = MODE_LEVELS[level - 1];
  const choices = ids.map((id) => {
    const s = soundById(id);
    return { id, label: s.label, hint: s.hint };
  });
  return scaleQuestion("mode", level, opts, prevKey, rng, choices, (id) => soundById(id),
    pick(ids, rng), fillTell, level < 3);
}

/* ── 3. which family ──────────────────────────────────────────────────── */

export const FAMILY_LEVELS: string[][] = [
  ["diatonic", "blues", "whole"],
  ["diatonic", "blues", "whole", "aug"],
  ["diatonic", "blues", "whole", "aug", "blues-major", "prometheus"],
  /* No "Diatonic" here: the Sunday Scale IS a diatonic sound, so the two
     could not both be right answers. Each of these six is one fixed sound. */
  ["folk", "blues", "whole", "prometheus", "hirajoshi", "insen"],
];
export const FAMILY_LABEL: Record<string, string> = {
  diatonic: "Diatonic", blues: "Blues", whole: "Whole tone",
  aug: "Augmented", "blues-major": "Major blues", prometheus: "Prometheus",
  folk: "Sunday Scale", hirajoshi: "Hirajoshi", insen: "In sen",
};
const FAMILY_HINT: Record<string, string> = {
  diatonic: "a major scale, one note out", blues: "bite", whole: "floating",
  aug: "shimmer", "blues-major": "church", prometheus: "mystic",
  folk: "major, no 7th", hirajoshi: "koto, five notes", insen: "sombre, five notes",
};
/** The diatonic rotations the family game may play: the familiar five. */
export const FAMILY_DIATONIC = ["maj-no4", "folk", "sus", "min-no6", "dark"];
const DIATONIC_TELL =
  "No tritone anywhere and a perfect 5th above the tonic: a major scale with one note left out.";

export function familyQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const level = clampLevel("family", opts.level);
  const ids = FAMILY_LEVELS[level - 1];
  const choices = ids.map((id) => ({ id, label: FAMILY_LABEL[id], hint: FAMILY_HINT[id] }));
  const answer = pick(ids, rng);
  const rotation = pick(FAMILY_DIATONIC, rng);
  /* "Diatonic" as the answer is one chosen rotation. As a wrong pick, it is
     the rotation that shares the most notes with what was played, so the
     back-to-back replay changes as little as possible. */
  const soundFor = (id: string, sp: Spelled | null): SoundDef => {
    if (id !== "diatonic") return soundById(id);
    if (!sp || answer === "diatonic") return soundById(rotation);
    const heard = new Set(sp.midis.map((m) => (m - sp.midis[0] + 120) % 12));
    let best = soundById(FAMILY_DIATONIC[0]), bestShared = -1;
    for (const r of FAMILY_DIATONIC) {
      const shared = soundById(r).semis.filter((s) => heard.has(s)).length;
      if (shared > bestShared) { bestShared = shared; best = soundById(r); }
    }
    return best;
  };
  const tellFor = (def: SoundDef, sp: Spelled) =>
    answer === "diatonic" ? `${DIATONIC_TELL} This one was ${def.label}.` : fillTell(def, sp);
  return scaleQuestion("family", level, opts, prevKey, rng, choices, soundFor, answer, tellFor, level < 3);
}

/* ── 4. which note is missing ─────────────────────────────────────────── */

export const ORDINAL: Record<number, string> = { 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };
export const MISSING_CHOICES: Choice[] = [2, 3, 4, 5, 6, 7].map((d) => ({ id: String(d), label: ORDINAL[d] }));
export const MISSING_LEVELS: { parents: Parent[]; order: "updown" | "up" | "scrambled" }[] = [
  { parents: ["major"], order: "updown" },
  { parents: ["major", "minor"], order: "up" },
  { parents: ["major", "minor"], order: "scrambled" },
];

export function missingQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const level = clampLevel("missing", opts.level);
  const cfg = MISSING_LEVELS[level - 1];
  const parent: Parent = pick(cfg.parents, rng);
  const sp = spellParent(chooseKey(opts, prevKey, rng), parent);
  const removed = pick([2, 3, 4, 5, 6, 7], rng);
  const step = stepOf(opts);
  const tonic = sp.midis[0];
  const keptIdx = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== removed - 1);
  const scrambled = cfg.order === "scrambled";

  let order: number[] = [...keptIdx, 7];                      // 7 = the octave
  if (cfg.order === "updown") order = [...keptIdx, 7, ...[...keptIdx].reverse()];
  if (scrambled) {
    do order = shuffle(keptIdx, rng); while (order.join() === keptIdx.join());
  }
  const midiAt = (i: number) => (i === 7 ? tonic + 12 : sp.midis[i]);

  const b = new ProgramBuilder();
  b.phase("Setting the key");
  const gap = Math.max(0.75, step * 1.6);
  for (const c of cadenceChords(tonic, parent === "minor")) {
    b.add({ midis: c, dur: gap * 1.02, vel: 0.46, spread: 0.012 });
    b.wait(gap);
  }
  b.wait(0.6);
  const qStart = b.t;
  b.phase("Listen");
  order.forEach((i, k) => {
    const last = k === order.length - 1;
    b.add({ midis: [midiAt(i)], dur: step * (last ? 2 : 1.06), vel: VEL, melody: true });
    b.wait(step);
  });
  if (scrambled) b.drone(tonic, qStart, b.t + 0.3);
  const prompt = b.build();

  const parentName = `${keyName(sp.key)} ${parent}`;
  const rowChips = (gone: number, state: Chip["state"]): Chip[] => [
    ...sp.notes.map((n, i) => ({
      label: notePretty(n), sub: String(i + 1), state: i === gone - 1 ? state : undefined,
    })),
    { label: notePretty(sp.notes[0]), sub: "1" },
  ];
  const signature = (d: number) =>
    [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== d - 1).map((i) => PARENTS[parent][i]).join(",");
  const without = (d: number) => sp.notes.filter((_, i) => i !== d - 1);

  return {
    game: "missing", level, key: sp.key, tonicPc: pc(sp.notes[0]), choices: MISSING_CHOICES,
    answer: String(removed), prompt,
    signatures: Object.fromEntries(MISSING_CHOICES.map((c) => [c.id, signature(Number(c.id))])),
    facts: { parent, removed, removedMidi: sp.midis[removed - 1], midis: sp.midis, order },
    reveal: (p) => {
      const d = Number(p);
      const right = d === removed;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        rows.push({
          id: "pick", title: `Your pick: no ${ORDINAL[d]}`, kind: "notes", chips: rowChips(d, "absent"),
          scale: without(d), removed: null,
        });
        r.phase(`Your pick: no ${ORDINAL[d]}`);
        for (let i = 0; i < 8; i++) {
          if (i === d - 1) continue;
          r.add({ midis: [midiAt(i)], dur: step * 1.06, vel: VEL, melody: true, mark: { row: "pick", chips: [i] } });
          r.wait(step);
        }
        r.wait(0.5);
      }
      rows.push({
        id: "answer", title: `The answer: the ${ORDINAL[removed]} was missing`, kind: "notes",
        chips: rowChips(removed, "removed"), scale: without(removed), removed: sp.notes[removed - 1],
      });
      r.phase("The answer: the gap filled in");
      for (let i = 0; i < 8; i++) {
        const gapNote = i === removed - 1;
        r.add({
          midis: [midiAt(i)], dur: step * (gapNote ? 1.5 : 1.06), vel: gapNote ? 0.86 : 0.62,
          melody: true, mark: { row: "answer", chips: [i] },
        });
        r.wait(step * (gapNote ? 1.5 : 1));
      }
      r.drone(tonic, 0, r.t);
      const below = sp.notes[removed - 2];
      const above = removed === 7 ? sp.notes[0] : sp.notes[removed];
      const gone = sp.notes[removed - 1];
      const tell = scrambled
        ? `In ${parentName}, the ${ORDINAL[removed]} is ${notePretty(gone)}. It never sounded.`
        : `${notePretty(below)} went straight to ${notePretty(above)}${removed === 7 ? " at the top" : ""}. The ${ORDINAL[removed]}, ${notePretty(gone)}, was missing.`;
      return {
        right,
        verdict: right
          ? `Yes: the ${ORDINAL[removed]}, in ${parentName}.`
          : `It was the ${ORDINAL[removed]}, in ${parentName}. You said the ${ORDINAL[d]}.`,
        tell, rows, program: r.build(), tonicMidi: tonic,
      };
    },
  };
}

/* ── 5. accents in groups ─────────────────────────────────────────────── */

export const GROUPS = [3, 4, 5, 7];
export const ACCENT_LEVELS: { groups: number[]; melody: boolean }[] = [
  { groups: [3, 4], melody: true },
  { groups: [3, 4, 5, 7], melody: true },
  { groups: [3, 4, 5, 7], melody: false },
];
const accentChoice = (g: number): Choice => ({
  id: String(g), label: `Groups of ${g}`, hint: gatiFor(g)?.name?.toLowerCase() ?? undefined,
});
export const ACCENT_CHOICES: Choice[] = GROUPS.map(accentChoice);
/** Every accent prompt is this many notes long, whatever the grouping, so the
 *  length of the phrase can never give the answer away. Four groups of 7, plus
 *  a landing note. */
export const ACCENT_STEPS = 29;
const EIGHTHS_PER_BAR = 8;
export const barsToLand = (g: number) => lcm(g, EIGHTHS_PER_BAR) / EIGHTHS_PER_BAR;

export interface AccentStep {
  midi: number;
  accent: boolean;
  /** 1-based count within the group */
  count: number;
}

/**
 * The rhythm. With the melody: cells of g rising notes, each cell starting one
 * scale note higher, so the melody and the accent agree. Without: one repeated
 * note, so the accent is the only cue. Either way the accent is on every g-th
 * note and nowhere else, and an accented note also gets a low tonic underneath.
 */
export function accentSteps(g: number, n: number, midis: number[], melody: boolean): AccentStep[] {
  const ext = [...midis.map((m) => m - 12), ...midis, ...midis.map((m) => m + 12)];
  return Array.from({ length: n }, (_, i) => {
    const cell = Math.floor(i / g), at = i % g;
    const m = melody ? ext[(cell % 6) + at] : midis[0] + 12;
    return { midi: m, accent: at === 0, count: at + 1 };
  });
}

function playAccents(b: ProgramBuilder, steps: AccentStep[], tonic: number, dur: number, row: string | null) {
  steps.forEach((s, i) => {
    b.add({
      midis: s.accent ? [tonic - 24, s.midi] : [s.midi], dur: dur * 0.9,
      vel: s.accent ? 0.92 : 0.4, melody: true, accent: s.accent,
      mark: row ? { row, chips: [i] } : undefined,
    });
    b.wait(dur);
  });
}

export function accentQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const level = clampLevel("accents", opts.level);
  const cfg = ACCENT_LEVELS[level - 1];
  const g = pick(cfg.groups, rng);
  const choices = cfg.groups.map(accentChoice);
  const def = soundById(pick(["folk", "maj-no4", "min-no6"], rng));
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const dur = 30 / opts.tempo;
  const tonic = sp.midis[0];
  const steps = accentSteps(g, ACCENT_STEPS, sp.midis, cfg.melody);

  const b = new ProgramBuilder();
  /* One tonic, not a pulse: a count-in in 4 would suggest groups of 4. */
  b.phase("Setting the key");
  b.add({ midis: [tonic - 24, tonic - 12, tonic], dur: 1.6, vel: 0.4, spread: 0 });
  b.wait(1.8);
  b.phase("Listen");
  playAccents(b, steps, tonic, dur, null);

  const pattern = (h: number) =>
    accentSteps(h, ACCENT_STEPS, sp.midis, cfg.melody).map((s) => (s.accent ? "x" : ".")).join("");
  const rowFor = (h: number): Row => ({
    id: "", title: "", kind: "rhythm",
    chips: accentSteps(h, 3 * h + 1, sp.midis, cfg.melody).map((s) => ({
      label: String(s.count), accent: s.accent,
    })),
  });

  return {
    game: "accents", level, key: sp.key, tonicPc: pc(sp.notes[0]), choices, answer: String(g),
    prompt: b.build(),
    signatures: Object.fromEntries(cfg.groups.map((h) => [String(h), pattern(h)])),
    facts: { grouping: g, steps },
    reveal: (p) => {
      const h = Number(p);
      const right = h === g;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        rows.push({ ...rowFor(h), id: "pick", title: `Your pick: groups of ${h}` });
        r.phase(`Your pick: groups of ${h}`);
        playAccents(r, accentSteps(h, 3 * h + 1, sp.midis, cfg.melody), tonic, dur, "pick");
        r.wait(0.6);
      }
      rows.push({ ...rowFor(g), id: "answer", title: `The answer: groups of ${g}` });
      r.phase(`The answer: groups of ${g}`);
      playAccents(r, accentSteps(g, 3 * g + 1, sp.midis, cfg.melody), tonic, dur, "answer");
      const count = Array.from({ length: g }, (_, i) => i + 1).join(" ");
      const bars = barsToLand(g);
      const land = bars === 1
        ? "In 4/4 eighth notes, groups of 4 land on the one in every bar."
        : `In 4/4 eighth notes, groups of ${g} come back to the one after ${bars} bars.`;
      const name = gatiFor(g)?.name;
      return {
        right,
        verdict: right
          ? `Yes: groups of ${g}${name ? ` · ${name.toLowerCase()}` : ""}.`
          : `It was groups of ${g}${name ? ` · ${name.toLowerCase()}` : ""}. You said groups of ${h}.`,
        tell: `The loud note, with the low tonic under it, came every ${g} notes: count ${count}.`,
        detail: land, rows, program: r.build(),
      };
    },
  };
}

/* ── dispatch ─────────────────────────────────────────────────────────── */

export function makeQuestion(game: GameId, opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  switch (game) {
    case "quality": return qualityQuestion(opts, prevKey, rng);
    case "mode": return modeQuestion(opts, prevKey, rng);
    case "family": return familyQuestion(opts, prevKey, rng);
    case "missing": return missingQuestion(opts, prevKey, rng);
    case "accents": return accentQuestion(opts, prevKey, rng);
  }
}
