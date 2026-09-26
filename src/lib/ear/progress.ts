/**
 * Ear-training progress: points, ranks, sets of ten and a daily streak.
 *
 * Pure functions over one plain object, so the rules are tested without a
 * browser and the page only has to load, record and save. The page keeps the
 * object in localStorage; nothing here is sent anywhere.
 *
 * The rules, kept deliberately simple so a player can predict them:
 *   · a right answer is 10 points, plus 1 for every answer already in the
 *     current streak (capped at +10), so a run of right answers pays more;
 *   · a wrong answer scores nothing and resets the streak, but costs nothing;
 *   · every ten answers in one game make a set, scored out of ten, with up to
 *     three stars (6+, 8+, 10);
 *   · playing on consecutive days builds a day streak.
 */

import type { GameId } from "./games";

export const SET_SIZE = 10;

export interface GameProgress {
  right: number;
  total: number;
  /** right answers in a row, now */
  streak: number;
  /** longest run of right answers ever */
  best: number;
  /** best finished set, out of SET_SIZE */
  bestSet: number;
  /** finished sets */
  sets: number;
}

export interface Progress {
  xp: number;
  /** consecutive days played, including lastDay */
  days: number;
  lastDay: string | null;
  games: Partial<Record<GameId, GameProgress>>;
  /** the set being played now: one game, one entry per answer */
  set: { game: GameId; answers: boolean[] } | null;
  /** points earned so far in the current set */
  setPoints: number;
}

export const EMPTY_PROGRESS: Progress = { xp: 0, days: 0, lastDay: null, games: {}, set: null, setPoints: 0 };
const EMPTY_GAME: GameProgress = { right: 0, total: 0, streak: 0, best: 0, bestSet: 0, sets: 0 };

export const RANKS = [
  { min: 0, name: "First listen" },
  { min: 100, name: "Listener" },
  { min: 300, name: "Attentive ear" },
  { min: 700, name: "Keen ear" },
  { min: 1500, name: "Sharp ear" },
  { min: 3000, name: "Trained ear" },
  { min: 6000, name: "Hexatonic ear" },
] as const;

export interface Rank {
  name: string;
  index: number;
  /** the next rank's name and threshold, or null at the top */
  next: { name: string; min: number } | null;
  /** 0..1 of the way from this rank to the next */
  progress: number;
}

export function rankFor(xp: number): Rank {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) index = i;
  const here = RANKS[index];
  const nextR = RANKS[index + 1] ?? null;
  return {
    name: here.name, index,
    next: nextR ? { name: nextR.name, min: nextR.min } : null,
    progress: nextR ? (xp - here.min) / (nextR.min - here.min) : 1,
  };
}

/** Points for one answer. `streakBefore` is the run before this answer. */
export const pointsFor = (right: boolean, streakBefore: number): number =>
  right ? 10 + Math.min(streakBefore, 10) : 0;

export const starsFor = (score: number): 0 | 1 | 2 | 3 =>
  score >= SET_SIZE ? 3 : score >= 8 ? 2 : score >= 6 ? 1 : 0;

/** "2026-09-26" in the player's own calendar. */
export const localDay = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function dayBefore(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

export interface SetResult {
  game: GameId;
  score: number;
  total: number;
  stars: 0 | 1 | 2 | 3;
  newBest: boolean;
  /** points earned across the set */
  points: number;
}

export interface Recorded {
  progress: Progress;
  gained: number;
  rankUp: Rank | null;
  setDone: SetResult | null;
}

/** Record one answer. Returns a new object; the input is not changed. */
export function record(p: Progress, game: GameId, right: boolean, today: string): Recorded {
  const g = { ...EMPTY_GAME, ...p.games[game] };
  const gained = pointsFor(right, g.streak);
  const streak = right ? g.streak + 1 : 0;
  const nextGame: GameProgress = {
    ...g, right: g.right + (right ? 1 : 0), total: g.total + 1, streak, best: Math.max(g.best, streak),
  };

  const days = p.lastDay === today ? p.days : p.lastDay === dayBefore(today) ? p.days + 1 : 1;
  const answers = [...(p.set && p.set.game === game ? p.set.answers : []), right];
  const pointsInSet = (p.set?.game === game ? p.setPoints : 0) + gained;

  let setDone: SetResult | null = null;
  let set: Progress["set"] = { game, answers };
  if (answers.length >= SET_SIZE) {
    const score = answers.filter(Boolean).length;
    setDone = {
      game, score, total: SET_SIZE, stars: starsFor(score),
      newBest: score > g.bestSet, points: pointsInSet,
    };
    nextGame.bestSet = Math.max(g.bestSet, score);
    nextGame.sets = g.sets + 1;
    set = null;
  }

  const before = rankFor(p.xp);
  const xp = p.xp + gained;
  const after = rankFor(xp);
  const progress: Progress = {
    xp, days, lastDay: today, games: { ...p.games, [game]: nextGame }, set,
    setPoints: set ? pointsInSet : 0,
  };
  return { progress, gained, rankUp: after.index > before.index ? after : null, setDone };
}

/** Leave a half-played set (a new game was picked). Scores are kept. */
export const abandonSet = (p: Progress): Progress => ({ ...p, set: null, setPoints: 0 });

/** Read what localStorage held, including the older per-game tallies. */
export function loadProgress(raw: string | null, legacy: string | null): Progress {
  try {
    if (raw) {
      const v = JSON.parse(raw);
      if (v && typeof v.xp === "number" && v.games) return { ...EMPTY_PROGRESS, ...v, setPoints: Number(v.setPoints) || 0 };
    }
  } catch { /* fall through */ }
  const out: Progress = { ...EMPTY_PROGRESS, games: {} };
  try {
    const old = legacy ? JSON.parse(legacy) : null;
    if (old && typeof old === "object") {
      for (const [id, t] of Object.entries(old as Record<string, Partial<GameProgress>>)) {
        if (!t || typeof t.right !== "number") continue;
        out.games[id as GameId] = { ...EMPTY_GAME, ...t };
        out.xp += 10 * t.right;
      }
    }
  } catch { /* nothing to migrate */ }
  return out;
}

/** The day streak as it stands today: a streak that missed yesterday is over. */
export const liveDays = (p: Progress, today: string): number =>
  p.lastDay === today || p.lastDay === dayBefore(today) ? p.days : 0;
