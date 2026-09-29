/**
 * "How to practise this mode": the short card on Practice, Sounds, Improvise,
 * Ear and Harmony. Every line is computed from the library, never typed per
 * page, and tests/mode-coach.test.ts checks it for every family, every mode
 * and every key.
 *
 *   Colour  the note or notes that make the mood (a table of degrees below,
 *           checked against the scale's own notes)
 *   Pair    the two triads that play it (Harmony → Two-triad pairs)
 *   Drone   hold the tonic and its 5th, or the tonic alone where there is no 5th
 *   Avoid   the note the scale takes out, in red
 *   Links   the Practice drill, the pair ladder and the Ear level that train it
 *
 * Imports are relative (not "@/") so the tests can load this file.
 */

import {
  buildDiatonic, buildScale, FAMILIES, familyById, modeCount, modeSource, prettyDegree, ScaleInstance,
} from "./theory/scales";
import { KEYS } from "./theory/scales";
import { Note, noteName, notePretty, pc } from "./theory/note";
import {
  buildParent, pairSlug, parentPairs, PARENTS, sixNoteScales, TwoChordPair,
} from "./theory/pairAtlas";
import { SOUNDS } from "./ear/sounds";
import { FAMILY_LEVELS, MODE_LEVELS } from "./ear/games";

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/* ── the colour notes, as semitones above the tonic ───────────────────────
   The note that tells this mood from its neighbours. Keyed by family, or by
   family:mode where the family has modes. Checked against every scale's own
   notes in all twelve keys. */
export const COLOUR: Record<string, number[]> = {
  /* the six moods of the Sunday-Scale shape */
  "diatonic:0": [4, 11],   // Major (no 4): the major 3rd and major 7th, nothing between
  "diatonic:1": [5, 10],   // Suspended (no 3rd): the 4th and ♭7 hold it open
  "diatonic:2": [3, 8],    // Dark minor (no 2): the ♭3 and ♭6
  "diatonic:3": [4, 9],    // Sunday Scale (no 7): the major 3rd and the 6th
  "diatonic:4": [3, 10],   // Minor (no 6): the ♭3 and ♭7
  "diatonic:5": [1],       // Phrygian (no 5th): the ♭2
  mixo: [4, 10],
  blues: [6],
  "blues-major": [3],
  whole: [6, 8],
  aug: [3, 8],
  prometheus: [6, 10],
  petrushka: [1, 6],
  messiaen5: [1, 6],
  "tritone-minor": [1, 6],
  /* the major scale's modes: each one's characteristic degree */
  "hepta:0": [11], "hepta:1": [9], "hepta:2": [1], "hepta:3": [6],
  "hepta:4": [10], "hepta:5": [8], "hepta:6": [6],
  "harm-minor:0": [8, 11], "harm-minor:1": [9], "harm-minor:2": [8], "harm-minor:3": [6],
  "harm-minor:4": [1, 4], "harm-minor:5": [3], "harm-minor:6": [9],
  "mel-minor:0": [9, 11], "mel-minor:1": [1, 9], "mel-minor:2": [8], "mel-minor:3": [6, 10],
  "mel-minor:4": [4, 8], "mel-minor:5": [2], "mel-minor:6": [4, 6],
  "penta:0": [4, 9], "penta:1": [5, 10], "penta:2": [3, 8], "penta:3": [5, 9], "penta:4": [3, 10],
  "dim-wh": [2, 11],       // over its diminished home chord: the 2 and the 7
  "dim-hw": [1, 3],        // over its dominant home chord: the ♭9 and ♯9
  hirajoshi: [3, 8],
  insen: [1],
  iwato: [1, 6],
  kumoi: [3, 9],
  yo: [5, 9],
  hijaz: [1, 4],
  custom: [],
};

export const colourKey = (family: string, mode: number) =>
  familyById(family).modes ? `${family}:${mode}` : family;

export interface CoachNote { note: Note; degree: string }

export interface PractiseCard {
  /** "G Major (no 4)" */
  title: string;
  scale: ScaleInstance;
  colour: CoachNote[];
  /** the two triads, or null with a reason */
  pair: { pair: TwoChordPair; href: string; leavesOut: Note | null } | null;
  pairWhy: string | null;
  drone: Note[];
  droneLine: string;
  /** the notes this scale takes out of its parent: red */
  avoid: CoachNote[];
  practiceHref: string;
  ear: { href: string; label: string } | null;
}

/** The degree label a scale gives the note `semis` above its tonic. */
function noteAt(scale: ScaleInstance, semis: number): CoachNote | null {
  const t = scale.notes[0];
  if (!t) return null;
  const i = scale.notes.findIndex((n) => mod12(pc(n) - pc(t)) === semis);
  return i < 0 ? null : { note: scale.notes[i], degree: prettyDegree(scale.degrees[i] ?? "") };
}

/** Degree label from a spelled note on `step` letters above the tonic. */
function degreeOf(step: number, semis: number): string {
  const d = ((semis - [0, 2, 4, 5, 7, 9, 11][step] + 18) % 12) - 6;
  return prettyDegree((d < 0 ? "b".repeat(-d) : "#".repeat(d)) + String(step + 1));
}

/** The notes the scale takes out of its parent, with their degrees. */
export function removedNotes(scale: ScaleInstance): CoachNote[] {
  const f = scale.family;
  if (f.kind === "rotation" && scale.removed) {
    const md = f.modes?.[scale.modeIndex];
    return [{ note: scale.removed, degree: prettyDegree(md?.missing ?? "") }];
  }
  if (f.kind === "omit" && scale.removed) return [{ note: scale.removed, degree: String(f.omit) }];
  if (f.kind === "parentModes" && Array.isArray(f.omit) && f.omit.length) {
    const src = modeSource(f.parent!, f.omit, scale.modeIndex);
    const full = buildDiatonic(scale.tonic, src.semis7);
    if (!full) return [];
    return [...src.omit].sort((a, b) => a - b).map((o) => ({ note: full[o - 1], degree: degreeOf(o - 1, src.semis7[o - 1]) }));
  }
  return [];
}

/** The pair that plays it, most useful first: both chords major or minor, the
 *  home chord in it, every voice moving by step. */
function bestSixPair(pairs: TwoChordPair[], tonicPc: number): TwoChordPair | null {
  const score = (p: TwoChordPair) =>
    (p.plain ? 0 : 4) + (p.shapes.some((s) => s.notes.some((n) => pc(n) === tonicPc)) ? 0 : 2) + (p.stepwise ? 0 : 1);
  return [...pairs].sort((a, b) => score(a) - score(b))[0] ?? null;
}

const MAJOR_MODE_PARENT = ["ionian", "dorian", "phrygian", "lydian", "mixolydian", "aeolian", "locrian"];
const keyForPc = (p: number) => KEYS.find((k) => {
  const n = buildScale(k, "hepta", 0).notes[0];
  return n && pc(n) === p;
})!;

function pairFor(key: string, scale: ScaleInstance): { pair: PractiseCard["pair"]; why: string | null } {
  const f = scale.family;
  const n = scale.notes.length;
  const tonic = scale.notes[0];
  if (!tonic) return { pair: null, why: null };
  if (f.kind === "custom") return { pair: null, why: "Open Harmony → Two-triad pairs with a named scale." };
  if (n === 5) return { pair: null, why: "Five notes: two triads always make six, so no pair plays it." };
  if (n === 8) return { pair: null, why: "Eight notes: two four-note chords play it. See Harmony → Sixth–diminished." };
  if (n === 6) {
    const six = sixNoteScales(key).find((s) => s.id === `${f.id}-${scale.modeIndex}`);
    if (!six) return { pair: null, why: null };
    const p = bestSixPair(six.pairs, pc(tonic));
    if (!p) {
      return { pair: null, why: six.susSplits.length
        ? `No two major, minor, diminished or augmented chords make it; it splits only with a sus chord: ${six.susSplits.join(", ")}.`
        : "No two triads make these six notes." };
    }
    const q = new URLSearchParams({ tab: "pairs", src: "six", k: key, s: six.id, pair: pairSlug(p) });
    return { pair: { pair: p, href: `/harmony?${q}`, leavesOut: null }, why: null };
  }
  /* Seven notes: of the parent's seven pairs (each leaves one note out), the
     one that keeps the colour notes, with both chords major or minor, and the
     home chord in it where it can. D Dorian: Dm + Em (no C); G Mixolydian:
     F + G (no E), as the Learn page plays them. */
  /* A seven-note world scale that is a parent's mode (Hijaz is Phrygian
     dominant) takes that mode's pair. */
  if (f.kind === "fixed" && n === 7) {
    const semis = scale.notes.map((x) => mod12(pc(x) - pc(tonic))).join();
    for (const pf of FAMILIES.filter((x) => x.kind === "parentModes" && x.size === 7))
      for (let m = 0; m < modeCount(pf); m++)
        if (buildScale(key, pf.id, m).notes.map((x, _, a) => mod12(pc(x) - pc(a[0]))).join() === semis)
          return pairFor(key, buildScale(key, pf.id, m));
  }
  if (f.kind === "parentModes") {
    const m = scale.modeIndex;
    let parentId: string, parentKey: string;
    if (f.id === "hepta") { parentId = MAJOR_MODE_PARENT[m]; parentKey = key; }
    else {
      parentId = f.id === "harm-minor" ? "harmonic" : "melodic";
      parentKey = m === 0 ? key : keyForPc(mod12(pc(tonic) - f.parent![m]));
    }
    if (!PARENTS.some((x) => x.id === parentId)) return { pair: null, why: null };
    const list = parentPairs(buildParent(parentKey, parentId));
    const colour = new Set((COLOUR[colourKey(f.id, m)] ?? []).map((x) => mod12(pc(tonic) + x)));
    /* never leave out the tonic, the colour, or the 3rd that says major or minor */
    const out = (p: TwoChordPair) => (p.removed ? mod12(pc(p.removed) - pc(tonic)) : -1);
    const score = (p: TwoChordPair) =>
      (out(p) === 0 ? 8 : 0) + (p.removed && colour.has(pc(p.removed)) ? 4 : 0) +
      (out(p) === 3 || out(p) === 4 ? 4 : 0) + (p.plain ? 0 : 2) +
      (p.shapes.some((c) => pc(c.root) === pc(tonic)) ? 0 : 1) +
      (p.modal ? 0 : 0.5);   // six notes the app already names (G major → D + Em, Major (no 4))
    const p = list.map((x, i) => ({ x, i })).sort((a, b) => score(a.x) - score(b.x) || a.i - b.i)[0]?.x ?? null;
    if (!p) return { pair: null, why: null };
    const q = new URLSearchParams({ tab: "pairs", src: "parent", k: parentKey, s: parentId, pair: pairSlug(p) });
    return { pair: { pair: p, href: `/harmony?${q}`, leavesOut: p.removed }, why: null };
  }
  return { pair: null, why: "Seven notes and no parent the pairs page lists." };
}

/* ── the ear game that drills it ─────────────────────────────────────── */

/** Which library scale each ear sound is. */
function soundScale(id: string): { family: string; mode: number } | null {
  const def = SOUNDS.find((s) => s.id === id);
  if (!def) return null;
  if (def.family !== "diatonic") return { family: def.family, mode: 0 };
  for (let m = 0; m < 6; m++) {
    const s = buildScale("C", "diatonic", m);
    if (s.notes.map((n) => mod12(pc(n))).join() === def.semis.join()) return { family: "diatonic", mode: m };
  }
  return null;
}

/** The first Ear level that asks about this scale, or null. */
export function earLevelFor(family: string, mode: number): { game: "mode" | "family"; level: number } | null {
  const same = (id: string) => {
    const s = soundScale(id);
    return !!s && s.family === family && s.mode === mode;
  };
  for (let i = 0; i < MODE_LEVELS.length; i++)
    if (MODE_LEVELS[i].some(same)) return { game: "mode", level: i + 1 };
  for (let i = 0; i < FAMILY_LEVELS.length; i++)
    if (FAMILY_LEVELS[i].some((id) => same(id) || (id === family && family !== "diatonic"))) return { game: "family", level: i + 1 };
  return null;
}

/** The Practice drill for a scale: broken thirds over the tonic drone. */
export function practiceHref(key: string, family: string, mode: number): string {
  const q = new URLSearchParams({ k: key, f: family });
  if (mode) q.set("m", String(mode));
  q.set("p", "thirds");
  q.set("v", "2");
  return `/practice?${q}`;
}

export function practiseCard(key: string, family: string, mode = 0): PractiseCard {
  const scale = buildScale(key, family, mode);
  const tonic = scale.notes[0];
  const f = scale.family;
  const md = f.modes?.[mode];
  const title = `${tonic ? notePretty(tonic) : key} ${md?.name ?? f.short}`;
  const colour = (COLOUR[colourKey(family, mode)] ?? [])
    .map((s) => noteAt(scale, s)).filter((x): x is CoachNote => !!x);
  const fifth = noteAt(scale, 7);
  const drone = tonic ? (fifth ? [tonic, fifth.note] : [tonic]) : [];
  const droneLine = !tonic ? ""
    : fifth ? `Hold ${notePretty(tonic)} and ${notePretty(fifth.note)}, the tonic and its 5th.`
    : `Hold ${notePretty(tonic)} alone: there is no perfect 5th above it.`;
  const { pair, why } = pairFor(key, scale);
  const ear = earLevelFor(f.id, mode);
  return {
    title, scale, colour, pair, pairWhy: why, drone, droneLine,
    avoid: removedNotes(scale),
    practiceHref: practiceHref(key, family, mode),
    ear: ear ? { href: `/ear?game=${ear.game}&level=${ear.level}`, label: `Ear: ${ear.game === "mode" ? "Which mode?" : "Which family?"} level ${ear.level}` } : null,
  };
}

/** Note names for a test or a share line: "B F♯". */
export const names = (ns: CoachNote[]) => ns.map((c) => notePretty(c.note)).join(" ");
export const plain = (ns: Note[]) => ns.map(noteName).join(" ");
