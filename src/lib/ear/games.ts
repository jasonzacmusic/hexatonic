/**
 * The five ear games: question generation and the reveal.
 *
 * Rules every question obeys (tests/ear.test.ts checks each one):
 *   · the key is set before the question, by a tonic drone or a cadence;
 *   · the correct answer is always one of the choices;
 *   · no two choices sound the same (different notes above the same tonic,
 *     or a different accent pattern);
 *   · the audio really contains the note that tells the answer, and a missing
 *     note is really missing;
 *   · the reveal plays your pick, then the right answer.
 */

import { Note, notePretty, parseNoteName, pc, spell, stepLetter } from "../theory/note";
import { gatiFor, lcm } from "../theory/resolution";
import { EarProgram, ProgramBuilder, cadenceChords } from "./program";
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
  { id: "mode", title: "Which mode?", line: "Six notes over a drone. Name the colour." },
  { id: "family", title: "Which family?", line: "Diatonic, blues, whole tone and more." },
  { id: "missing", title: "Which note is missing?", line: "A scale with one note gone. Find the gap." },
  { id: "accents", title: "Groups of 3, 4, 5 or 7?", line: "Hear where the accents fall." },
];
export const gameById = (id: string) => GAMES.find((g) => g.id === id) ?? GAMES[0];

export interface Options {
  /** notes per minute for the pitch games; the accent game runs twice as fast */
  tempo: number;
  /** a fixed key for the whole session, or null for a new key each round */
  fixedKey: string | null;
  /** 1 or 2 — fewer or more choices (mode, family), melody or pulse (accents) */
  level: 1 | 2;
  parent: Parent | "both";
  order: "up" | "scrambled";
  keySet: "cadence" | "drone";
}

export const DEFAULT_OPTIONS: Options = {
  tempo: 120, fixedKey: null, level: 1, parent: "major", order: "up", keySet: "cadence",
};

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
}

export interface Reveal {
  right: boolean;
  verdict: string;
  tell: string;
  detail?: string;
  rows: Row[];
  program: EarProgram;
}

export interface Question {
  game: GameId;
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

const stepOf = (opts: Options) => 60 / opts.tempo;

/** Six ascending notes and the octave, then back down to the tonic. */
function runIndices(updown: boolean): number[] {
  const up = [0, 1, 2, 3, 4, 5, 6];
  return updown ? [...up, 5, 4, 3, 2, 1, 0] : up;
}

/** The six notes voiced as one chord: 1st, 3rd, 5th note of the scale, then the
 *  2nd, 4th and 6th an octave up — a stack, not a cluster. */
function sixChord(midis: number[]): number[] {
  const order = [0, 2, 4, 1, 3, 5];
  const out: number[] = [];
  for (const i of order) {
    let m = midis[i];
    while (out.length && m <= out[out.length - 1]) m += 12;
    out.push(m);
  }
  return out;
}

function noteChips(sp: Spelled, def?: SoundDef, withOctave = true): Chip[] {
  const t = sp.notes[0];
  const chips: Chip[] = sp.notes.map((n) => ({
    label: notePretty(n),
    sub: degreeLabel(t, n),
    state: def && def.tellSemis.includes(relSemi(t, n)) ? "tell" : undefined,
  }));
  if (withOctave) chips.push({ label: notePretty(t), sub: "1" });
  return chips;
}

/** Play a spelled scale up (and optionally down) with the chips lighting. */
function playRun(
  b: ProgramBuilder, midis: number[], step: number, row: string | null, updown: boolean,
) {
  const all = [...midis, midis[0] + 12];
  const idx = runIndices(updown);
  idx.forEach((i, k) => {
    /* shape the line: lean into the top, relax on the way home */
    const vel = 0.62 + 0.1 * Math.sin((Math.PI * k) / Math.max(1, idx.length - 1));
    b.add({
      midis: [all[i]], dur: step * 0.95, vel, melody: true,
      mark: row ? { row, chips: [i] } : undefined,
    });
    b.wait(step);
  });
}

function playSixChord(b: ProgramBuilder, midis: number[], row: string | null) {
  const stack = sixChord(midis);
  b.add({
    midis: stack, dur: 2.2, vel: 0.5, spread: 0.07, melody: true,
    mark: row ? { row, chips: [0, 1, 2, 3, 4, 5] } : undefined,
  });
  b.wait(2.4);
}

/** Set the key with the tonic alone. Neutral: it gives away no 3rd, no 5th.
 *  Long enough to register (tests hold it to 1.5 s at least), short enough
 *  that the question arrives while the ear is still waiting for it. */
function droneIntro(b: ProgramBuilder, step: number) {
  b.phase("Setting the key");
  b.wait(Math.max(1.5, step * 3));
}

/** "This one has ♭6 (E♭). Minor (no 6) has 2 (A) instead." Only when one or
 *  two notes differ; past that, the count says it better than a list. */
function diffLine(answer: SoundDef, sa: Spelled, other: SoundDef, so: Spelled): string {
  const onlyA = sa.notes.filter((n) => !other.semis.includes(relSemi(sa.notes[0], n)));
  const onlyO = so.notes.filter((n) => !answer.semis.includes(relSemi(so.notes[0], n)));
  if (!onlyA.length || !onlyO.length) return "";
  if (onlyA.length > 2)
    return `The two share only ${sa.notes.length - onlyA.length} of their six notes.`;
  const list = (ns: Note[], t: Note) =>
    ns.map((n) => `${degreeLabel(t, n)} (${notePretty(n)})`).join(" and ");
  return `This one has ${list(onlyA, sa.notes[0])}. ${other.label} has ${list(onlyO, so.notes[0])} instead.`;
}

/** "E♭", "F♯" — the key as a musician reads it. */
export const keyName = (k: string) => k.replace("#", "♯").replace(/^([A-G])b$/, "$1♭");

/* ── 1. major, minor or suspended ─────────────────────────────────────── */

const QUALITY_CHOICES: Choice[] = [
  { id: "major", label: "Major", hint: "has the 3" },
  { id: "minor", label: "Minor", hint: "has the ♭3" },
  { id: "sus", label: "Suspended", hint: "no 3rd" },
];
/** The pool: sounds with one clear kind of 3rd (or none) and a perfect 5th. */
export const QUALITY_POOL = SOUNDS.filter((s) => s.quality && s.semis.includes(7));
/** The note that decides: semitones and letter steps above the tonic. */
const QUALITY_NOTE: Record<Quality, { semi: number; letters: number }> = {
  major: { semi: 4, letters: 2 }, minor: { semi: 3, letters: 2 }, sus: { semi: 5, letters: 3 },
};

function triad(tonic: Note, tonicMidi: number, q: Quality) {
  const d = QUALITY_NOTE[q];
  const third = spell(stepLetter(tonic.letter, d.letters), (pc(tonic) + d.semi) % 12)!;
  const fifth = spell(stepLetter(tonic.letter, 4), (pc(tonic) + 7) % 12)!;
  return {
    midis: [tonicMidi, tonicMidi + d.semi, tonicMidi + 7],
    chips: [
      { label: notePretty(tonic), sub: "1" },
      { label: notePretty(third), sub: degreeLabel(tonic, third) },
      { label: notePretty(fifth), sub: "5" },
    ] as Chip[],
  };
}

/** The chord first, as a block with the root doubled below, then broken
 *  upward so the 3rd can be heard on its own. Leading with the chord is the
 *  point: the question is about its colour, so the ear gets it at once. */
function playTriad(b: ProgramBuilder, midis: number[], row: string | null, chipIdx: number[], again = false) {
  const mark = (chips: number[]) => (row ? { row, chips } : undefined);
  const block = [midis[0] - 12, ...midis];
  b.add({ midis: block, dur: 1.5, vel: 0.58, spread: 0.012, melody: true, mark: mark(chipIdx) });
  b.wait(1.6);
  midis.forEach((m, i) => {
    b.add({ midis: [m], dur: 0.6, vel: 0.56 + i * 0.04, melody: true, mark: mark([chipIdx[i]]) });
    b.wait(0.36);
  });
  if (again) {
    b.wait(0.1);
    b.add({ midis: block, dur: 1.6, vel: 0.6, spread: 0.012, melody: true, mark: mark(chipIdx) });
    b.wait(1.8);
  } else b.wait(0.5);
}

export function qualityQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const q = pick(["major", "minor", "sus"] as Quality[], rng);
  const def = pick(QUALITY_POOL.filter((s) => s.quality === q), rng);
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const step = stepOf(opts);
  const tonic = sp.notes[0];
  const deg = (semi: number) => sp.midis.findIndex((m) => m - sp.midis[0] === semi);

  const b = new ProgramBuilder();
  droneIntro(b, step);
  b.phase("Listen");
  const tri = [0, deg(QUALITY_NOTE[q].semi), deg(7)];
  playTriad(b, tri.map((i) => sp.midis[i]), null, [0, 1, 2], true);
  b.drone(sp.midis[0], 0, b.t);
  const prompt = b.build();

  return {
    game: "quality", key: sp.key, tonicPc: pc(tonic), choices: QUALITY_CHOICES, answer: q, prompt,
    signatures: Object.fromEntries(QUALITY_CHOICES.map((c) => [c.id, `3rd:${QUALITY_NOTE[c.id as Quality].semi}`])),
    facts: { sound: def.id, midis: sp.midis },
    reveal: (p) => {
      const right = p === q;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        const t = triad(tonic, sp.midis[0], p as Quality);
        rows.push({ id: "pick", title: `Your pick: ${label(QUALITY_CHOICES, p)}`, kind: "notes", chips: t.chips });
        r.phase(`Your pick: ${label(QUALITY_CHOICES, p).toLowerCase()}`);
        playTriad(r, t.midis, "pick", [0, 1, 2]);
        r.wait(0.4);
      }
      const chips = noteChips(sp, { ...def, tellSemis: [QUALITY_NOTE[q].semi] });
      rows.push({ id: "answer", title: `The answer: ${def.label}`, kind: "notes", chips });
      r.phase(`The answer: ${label(QUALITY_CHOICES, q).toLowerCase()}`);
      playTriad(r, tri.map((i) => sp.midis[i]), "answer", tri);
      r.phase(`${def.label}: the scale it came from`);
      playRun(r, sp.midis, step, "answer", false);
      r.drone(sp.midis[0], 0, r.t);
      const decides = sp.notes[deg(QUALITY_NOTE[q].semi)];
      const named = `${degreeLabel(tonic, decides)} (${notePretty(decides)})`;
      const tell =
        q === "major" ? `The ${named} makes it major.`
        : q === "minor" ? `The ${named} makes it minor.`
        : `There is no 3rd, so it is neither major nor minor. The ${named} takes its place.`;
      return {
        right,
        verdict: right
          ? `Yes: ${label(QUALITY_CHOICES, q).toLowerCase()}. ${def.label} on ${keyName(sp.key)}.`
          : `It was ${label(QUALITY_CHOICES, q).toLowerCase()}: ${def.label} on ${keyName(sp.key)}. You said ${label(QUALITY_CHOICES, p).toLowerCase()}.`,
        tell, rows, program: r.build(),
      };
    },
  };
}

const label = (cs: Choice[], id: string) => cs.find((c) => c.id === id)?.label ?? id;

/* ── 2. which mode ────────────────────────────────────────────────────── */

export const MODE_LEVELS: Record<1 | 2, string[]> = {
  1: ["maj-no4", "min-no6", "sus"],
  2: ["maj-no4", "folk", "sus", "min-no6", "dark", "unstable"],
};

/** Shared by the mode and family games: a scale over a drone, then its chord. */
function scaleQuestion(
  game: GameId, opts: Options, prevKey: string | null, rng: Rng,
  choices: Choice[], soundFor: (choiceId: string, answerSp: Spelled | null) => SoundDef,
  answer: string, tellFor: (def: SoundDef, sp: Spelled) => string,
): Question {
  const def = soundFor(answer, null);
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const step = stepOf(opts);
  const b = new ProgramBuilder();
  droneIntro(b, step);
  b.phase("Listen");
  playRun(b, sp.midis, step, null, false);
  playSixChord(b, sp.midis, null);
  b.drone(sp.midis[0], 0, b.t);

  const sigs: Record<string, string> = {};
  for (const c of choices) sigs[c.id] = soundFor(c.id, sp).semis.join(",");

  return {
    game, key: sp.key, tonicPc: pc(sp.notes[0]), choices, answer, prompt: b.build(),
    signatures: sigs, facts: { sound: def.id, midis: sp.midis },
    reveal: (p) => {
      const right = p === answer;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      let detail = "";
      if (!right) {
        const pd = soundFor(p, sp);
        const ps = spellSound(sp.key, pd);
        rows.push({ id: "pick", title: `Your pick: ${pd.label}`, kind: "notes", chips: noteChips(ps) });
        r.phase(`Your pick: ${pd.label}`);
        playRun(r, ps.midis, step, "pick", false);
        playSixChord(r, ps.midis, "pick");
        r.wait(0.3);
        detail = diffLine(def, sp, pd, ps);
      }
      rows.push({ id: "answer", title: `The answer: ${def.label}`, kind: "notes", chips: noteChips(sp, def) });
      r.phase(`The answer: ${def.label}`);
      playRun(r, sp.midis, step, "answer", false);
      playSixChord(r, sp.midis, "answer");
      r.drone(sp.midis[0], 0, r.t);
      const pickLabel = choices.find((c) => c.id === p)?.label ?? p;
      const ansLabel = choices.find((c) => c.id === answer)?.label ?? answer;
      return {
        right,
        verdict: right ? `Yes: ${ansLabel}, on ${keyName(sp.key)}.` : `It was ${ansLabel}, on ${keyName(sp.key)}. You said ${pickLabel}.`,
        tell: tellFor(def, sp), detail, rows, program: r.build(),
      };
    },
  };
}

export function modeQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const ids = MODE_LEVELS[opts.level];
  const choices = ids.map((id) => {
    const s = soundById(id);
    return { id, label: s.label, hint: s.hint };
  });
  return scaleQuestion("mode", opts, prevKey, rng, choices, (id) => soundById(id), pick(ids, rng), fillTell);
}

/* ── 3. which family ──────────────────────────────────────────────────── */

export const FAMILY_LEVELS: Record<1 | 2, string[]> = {
  1: ["diatonic", "blues", "whole"],
  2: ["diatonic", "blues", "whole", "aug", "blues-major", "prometheus"],
};
const FAMILY_LABEL: Record<string, string> = {
  diatonic: "Diatonic", blues: "Blues", whole: "Whole tone",
  aug: "Augmented", "blues-major": "Major blues", prometheus: "Prometheus",
};
const FAMILY_HINT: Record<string, string> = {
  diatonic: "a major scale, one note out", blues: "bite", whole: "floating",
  aug: "shimmer", "blues-major": "church", prometheus: "mystic",
};
/** The diatonic rotations the family game may play: the familiar five. */
export const FAMILY_DIATONIC = ["maj-no4", "folk", "sus", "min-no6", "dark"];
const DIATONIC_TELL =
  "No tritone anywhere and a perfect 5th above the tonic: a major scale with one note left out.";

export function familyQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const ids = FAMILY_LEVELS[opts.level];
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
  return scaleQuestion("family", opts, prevKey, rng, choices, soundFor, answer, tellFor);
}

/* ── 4. which note is missing ─────────────────────────────────────────── */

const ORDINAL: Record<number, string> = { 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th" };
export const MISSING_CHOICES: Choice[] = [2, 3, 4, 5, 6, 7].map((d) => ({ id: String(d), label: ORDINAL[d] }));

export function missingQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const parent: Parent = opts.parent === "both" ? pick(["major", "minor"] as Parent[], rng) : opts.parent;
  const sp = spellParent(chooseKey(opts, prevKey, rng), parent);
  const removed = pick([2, 3, 4, 5, 6, 7], rng);
  const step = stepOf(opts);
  const tonic = sp.midis[0];
  const keptIdx = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== removed - 1);
  const scrambled = opts.order === "scrambled";

  let order: number[] = [...keptIdx, 7];                      // 7 = the octave
  if (scrambled) {
    do order = shuffle(keptIdx, rng); while (order.join() === keptIdx.join());
  }
  const midiAt = (i: number) => (i === 7 ? tonic + 12 : sp.midis[i]);

  const b = new ProgramBuilder();
  b.phase("Setting the key");
  const useDrone = opts.keySet === "drone" || scrambled;
  if (opts.keySet === "cadence") {
    const gap = Math.max(0.75, step * 1.6);
    for (const c of cadenceChords(tonic, parent === "minor")) {
      b.add({ midis: c, dur: gap * 0.95, vel: 0.5, spread: 0.012 });
      b.wait(gap);
    }
    b.wait(0.5);
  } else {
    b.wait(Math.max(1.8, step * 4));
  }
  const qStart = b.t;
  b.phase("Listen");
  for (const i of order) {
    b.add({ midis: [midiAt(i)], dur: step * 0.95, vel: 0.72, melody: true });
    b.wait(step);
  }
  if (useDrone) b.drone(tonic, opts.keySet === "drone" ? 0 : qStart, b.t + 0.3);
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

  return {
    game: "missing", key: sp.key, tonicPc: pc(sp.notes[0]), choices: MISSING_CHOICES,
    answer: String(removed), prompt,
    signatures: Object.fromEntries(MISSING_CHOICES.map((c) => [c.id, signature(Number(c.id))])),
    facts: { parent, removed, removedMidi: sp.midis[removed - 1], midis: sp.midis, order },
    reveal: (p) => {
      const d = Number(p);
      const right = d === removed;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        rows.push({ id: "pick", title: `Your pick: no ${ORDINAL[d]}`, kind: "notes", chips: rowChips(d, "absent") });
        r.phase(`Your pick: no ${ORDINAL[d]}`);
        for (let i = 0; i < 8; i++) {
          if (i === d - 1) continue;
          r.add({ midis: [midiAt(i)], dur: step * 0.95, vel: 0.72, melody: true, mark: { row: "pick", chips: [i] } });
          r.wait(step);
        }
        r.wait(0.5);
      }
      rows.push({ id: "answer", title: `The answer: the ${ORDINAL[removed]} was missing`, kind: "notes", chips: rowChips(removed, "removed") });
      r.phase("The answer: the gap filled in");
      for (let i = 0; i < 8; i++) {
        r.add({ midis: [midiAt(i)], dur: step * 0.95, vel: i === removed - 1 ? 0.9 : 0.66, melody: true, mark: { row: "answer", chips: [i] } });
        r.wait(step);
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
        tell, rows, program: r.build(),
      };
    },
  };
}

/* ── 5. accents in groups ─────────────────────────────────────────────── */

export const GROUPS = [3, 4, 5, 7];
export const ACCENT_CHOICES: Choice[] = GROUPS.map((g) => ({
  id: String(g), label: `Groups of ${g}`, hint: gatiFor(g)?.name?.toLowerCase() ?? undefined,
}));
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
 * The rhythm. Level 1: cells of g rising notes, each cell starting one scale
 * note higher, so the melody and the accent agree. Level 2: one repeated note,
 * so the accent is the only cue. Either way the accent is on every g-th note
 * and nowhere else, and an accented note also gets a low tonic underneath.
 */
export function accentSteps(g: number, n: number, midis: number[], level: 1 | 2): AccentStep[] {
  const ext = [...midis.map((m) => m - 12), ...midis, ...midis.map((m) => m + 12)];
  return Array.from({ length: n }, (_, i) => {
    const cell = Math.floor(i / g), at = i % g;
    const m = level === 2 ? midis[0] + 12 : ext[(cell % 6) + at];
    return { midi: m, accent: at === 0, count: at + 1 };
  });
}

function playAccents(b: ProgramBuilder, steps: AccentStep[], tonic: number, dur: number, row: string | null) {
  steps.forEach((s, i) => {
    b.add({
      midis: s.accent ? [tonic - 24, s.midi] : [s.midi], dur: dur * 0.9,
      vel: s.accent ? 0.95 : 0.4, melody: true, accent: s.accent,
      mark: row ? { row, chips: [i] } : undefined,
    });
    b.wait(dur);
  });
}

export function accentQuestion(opts: Options, prevKey: string | null, rng: Rng = Math.random): Question {
  const g = pick(GROUPS, rng);
  const def = soundById(pick(["folk", "maj-no4", "min-no6"], rng));
  const sp = spellSound(chooseKey(opts, prevKey, rng), def);
  const dur = 30 / opts.tempo;
  const tonic = sp.midis[0];
  const steps = accentSteps(g, ACCENT_STEPS, sp.midis, opts.level);

  const b = new ProgramBuilder();
  /* One tonic, not a pulse: a count-in in 4 would suggest groups of 4. */
  b.phase("Setting the key");
  b.add({ midis: [tonic - 24, tonic - 12, tonic], dur: 1.6, vel: 0.4, spread: 0 });
  b.wait(1.8);
  b.phase("Listen");
  playAccents(b, steps, tonic, dur, null);

  const pattern = (h: number) =>
    accentSteps(h, ACCENT_STEPS, sp.midis, opts.level).map((s) => (s.accent ? "x" : ".")).join("");
  const rowFor = (h: number): Row => ({
    id: "", title: "", kind: "rhythm",
    chips: accentSteps(h, 3 * h + 1, sp.midis, opts.level).map((s) => ({
      label: String(s.count), accent: s.accent,
    })),
  });

  return {
    game: "accents", key: sp.key, tonicPc: pc(sp.notes[0]), choices: ACCENT_CHOICES, answer: String(g),
    prompt: b.build(),
    signatures: Object.fromEntries(GROUPS.map((h) => [String(h), pattern(h)])),
    facts: { grouping: g, steps },
    reveal: (p) => {
      const h = Number(p);
      const right = h === g;
      const r = new ProgramBuilder();
      const rows: Row[] = [];
      if (!right) {
        rows.push({ ...rowFor(h), id: "pick", title: `Your pick: groups of ${h}` });
        r.phase(`Your pick: groups of ${h}`);
        playAccents(r, accentSteps(h, 3 * h + 1, sp.midis, opts.level), tonic, dur, "pick");
        r.wait(0.6);
      }
      rows.push({ ...rowFor(g), id: "answer", title: `The answer: groups of ${g}` });
      r.phase(`The answer: groups of ${g}`);
      playAccents(r, accentSteps(g, 3 * g + 1, sp.midis, opts.level), tonic, dur, "answer");
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

