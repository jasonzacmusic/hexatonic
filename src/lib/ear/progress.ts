/**
 * Progress through the ear games: levels that unlock, a score that is
 * remembered, and a ten-question session that ends with what you mix up most.
 *
 * All pure functions, so the tests can check them without a browser. The page
 * stores the result in localStorage (a convenience only: if storage is
 * missing, the games still work, they just forget between visits).
 */

import {
  FAMILY_LABEL, GAMES, GameId, ORDINAL, QUALITY_NOTE, choiceLabel, levelCount,
} from "./games";
import { degreeLabel, relSemi, soundById, spellSound } from "./sounds";

/** Right answers in a row, on your highest level, that open the next one. */
export const UNLOCK_STREAK = 5;
/** Questions in one session, before the summary. */
export const SESSION_LENGTH = 10;

export interface GameProgress {
  /** highest level open to you */
  unlocked: number;
  /** the level you last chose */
  level: number;
  right: number;
  total: number;
  streak: number;
  best: number;
  /** right in a row on the highest unlocked level, towards the next */
  toward: number;
}

export type AllProgress = Record<GameId, GameProgress>;

export const freshProgress = (): GameProgress => ({
  unlocked: 1, level: 1, right: 0, total: 0, streak: 0, best: 0, toward: 0,
});

export const freshAll = (): AllProgress =>
  Object.fromEntries(GAMES.map((g) => [g.id, freshProgress()])) as AllProgress;

export interface Recorded {
  progress: GameProgress;
  /** the level that just opened, if one did */
  unlocked: number | null;
}

/** Score one answer. Only answers on your highest open level count towards
 *  the next; a wrong one there starts the count again. */
export function recordAnswer(game: GameId, p: GameProgress, right: boolean, levelPlayed: number): Recorded {
  const streak = right ? p.streak + 1 : 0;
  let { toward, unlocked } = p;
  let opened: number | null = null;
  if (levelPlayed === p.unlocked && p.unlocked < levelCount(game)) {
    toward = right ? toward + 1 : 0;
    if (toward >= UNLOCK_STREAK) {
      unlocked += 1;
      toward = 0;
      opened = unlocked;
    }
  }
  return {
    progress: {
      ...p, unlocked, toward, streak, best: Math.max(p.best, streak),
      right: p.right + (right ? 1 : 0), total: p.total + 1,
    },
    unlocked: opened,
  };
}

const whole = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.floor(v), lo), hi) : fallback;

/** Read what was saved, whatever shape it is in: this version, the old
 *  score-only version, or rubbish. Never throws. */
export function loadProgress(saved: string | null, legacy: string | null = null): AllProgress {
  const out = freshAll();
  const parse = (s: string | null): Record<string, any> | null => {
    if (!s) return null;
    try {
      const v = JSON.parse(s);
      return v && typeof v === "object" ? v : null;
    } catch { return null; }
  };
  const data = parse(saved) ?? parse(legacy) ?? {};
  for (const g of GAMES) {
    const d = data[g.id];
    if (!d || typeof d !== "object") continue;
    const n = levelCount(g.id);
    const unlocked = whole(d.unlocked, 1, n, 1);
    const total = whole(d.total, 0, 1e7, 0);
    out[g.id] = {
      unlocked,
      level: whole(d.level, 1, unlocked, 1),
      total,
      right: whole(d.right, 0, total, 0),
      streak: whole(d.streak, 0, 1e7, 0),
      best: whole(d.best, 0, 1e7, 0),
      toward: whole(d.toward, 0, UNLOCK_STREAK - 1, 0),
    };
  }
  return out;
}

/* ── the session summary ──────────────────────────────────────────────── */

export interface Attempt {
  answer: string;
  pick: string;
}

export interface Confusion {
  /** the two choices, in a stable order */
  a: string;
  b: string;
  count: number;
  /** "You mix up X and Y." */
  line: string;
  /** what to listen for */
  tip: string;
}

export interface Summary {
  right: number;
  total: number;
  confusions: Confusion[];
}

export function summarise(game: GameId, attempts: Attempt[]): Summary {
  const pairs = new Map<string, { a: string; b: string; count: number }>();
  for (const t of attempts) {
    if (t.pick === t.answer) continue;
    const [a, b] = [t.answer, t.pick].sort();
    const k = `${a}|${b}`;
    const x = pairs.get(k) ?? { a, b, count: 0 };
    x.count++;
    pairs.set(k, x);
  }
  const confusions = [...pairs.values()]
    .sort((x, y) => y.count - x.count || x.a.localeCompare(y.a))
    .map((x) => ({
      ...x,
      line: `You mix up ${cap(choiceLabel(game, x.a))} and ${choiceLabel(game, x.b)}${x.count > 1 ? ` (${x.count} times)` : ""}.`,
      tip: confusionTip(game, x.a, x.b),
    }));
  return { right: attempts.filter((t) => t.pick === t.answer).length, total: attempts.length, confusions };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a family sounds like, in one line, for telling it from another. */
const FAMILY_LISTEN: Record<string, string> = {
  diatonic: "no tritone and a plain perfect 5th: a major scale with one note out",
  blues: "the ♭5 rubbing right against the 5th",
  whole: "whole steps only, with no perfect 5th anywhere",
  aug: "a minor 3rd and a half step, over and over",
  "blues-major": "the ♭3 sliding up into the 3",
  prometheus: "the ♯4 and no 5th, with the 6 and ♭7 side by side",
  folk: "plain major with no 7th, so nothing leans into the tonic",
  hirajoshi: "only five notes: two half steps, each followed by a leap",
  insen: "only five notes: the ♭2 right above the tonic, and no 3rd",
};

/** Degree names of the notes one sound has and the other does not, spelled
 *  in G (the app's home key). */
function onlyIn(aId: string, bId: string): string[] {
  const a = soundById(aId), b = soundById(bId);
  const sp = spellSound("G", a);
  return sp.notes.filter((n) => !b.semis.includes(relSemi(sp.notes[0], n)))
    .map((n) => degreeLabel(sp.notes[0], n));
}

const thirdOf = (id: string): string | null => {
  const s = soundById(id).semis;
  return s.includes(4) ? "3" : s.includes(3) ? "♭3" : null;
};

const and = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);

/** What to listen for, to tell `a` from `b`. Every note named is computed. */
export function confusionTip(game: GameId, a: string, b: string): string {
  switch (game) {
    case "quality": {
      const deg = (q: string) => (q === "major" ? "3" : q === "minor" ? "♭3" : "4");
      const has = (q: string) => (q === "sus" ? "has the 4 in place of a 3rd" : `has the ${deg(q)}`);
      if (!QUALITY_NOTE[a as keyof typeof QUALITY_NOTE] || !QUALITY_NOTE[b as keyof typeof QUALITY_NOTE]) return "";
      return `Listen to the middle note of the chord: ${cap(choiceLabel(game, a).toLowerCase())} ${has(a)}, ${choiceLabel(game, b).toLowerCase()} ${has(b)}.`;
    }
    case "mode": {
      const la = soundById(a).label, lb = soundById(b).label;
      const oa = onlyIn(a, b), ob = onlyIn(b, a);
      const ta = thirdOf(a), tb = thirdOf(b);
      if (oa.length > 2 && ta !== tb) {
        const say = (l: string, t: string | null) => (t ? `${l} has the ${t}` : `${l} has no 3rd at all`);
        return `Listen to the 3rd first: ${say(la, ta)}, ${say(lb, tb)}.`;
      }
      return `Listen for the ${and(oa)}: ${la} has ${oa.length > 1 ? "them" : "it"}, ${lb} has the ${and(ob)} instead.`;
    }
    case "family":
      return `${FAMILY_LABEL[a]}: ${FAMILY_LISTEN[a]}. ${FAMILY_LABEL[b]}: ${FAMILY_LISTEN[b]}.`;
    case "missing": {
      const [lo, hi] = [Number(a), Number(b)].sort((x, y) => x - y);
      return hi - lo === 1
        ? `The ${ORDINAL[lo]} and the ${ORDINAL[hi]} sit side by side. Sing along from the tonic: the gap is the step your voice wants to fill.`
        : `Count along from the tonic, 1, 2, 3 and on. The gap is the number the tune skips.`;
    }
    case "accents": {
      const [x, y] = [Number(a), Number(b)].sort((m, n) => m - n);
      return `Count the soft notes between two loud ones: groups of ${x} have ${x - 1}, groups of ${y} have ${y - 1}.`;
    }
  }
}
