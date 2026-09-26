import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS, Progress, RANKS, SET_SIZE, abandonSet, loadProgress, localDay, pointsFor,
  liveDays, rankFor, record, starsFor,
} from "../src/lib/ear/progress";

const play = (p: Progress, answers: boolean[], day = "2026-09-26", game = "quality" as const) => {
  let cur = p;
  const out = [];
  for (const a of answers) { const r = record(cur, game, a, day); out.push(r); cur = r.progress; }
  return { p: cur, results: out };
};

describe("points", () => {
  it("a right answer is 10, plus 1 per answer already in the streak, capped at +10", () => {
    expect(pointsFor(true, 0)).toBe(10);
    expect(pointsFor(true, 4)).toBe(14);
    expect(pointsFor(true, 40)).toBe(20);
    expect(pointsFor(false, 9)).toBe(0);
  });

  it("the running total is the sum of what each answer earned", () => {
    const { p, results } = play(EMPTY_PROGRESS, [true, true, false, true]);
    expect(results.map((r) => r.gained)).toEqual([10, 11, 0, 10]);
    expect(p.xp).toBe(31);
    expect(p.games.quality).toMatchObject({ right: 3, total: 4, streak: 1, best: 2 });
  });

  it("recording never changes the object it was given", () => {
    const before = JSON.stringify(EMPTY_PROGRESS);
    record(EMPTY_PROGRESS, "mode", true, "2026-09-26");
    expect(JSON.stringify(EMPTY_PROGRESS)).toBe(before);
  });
});

describe("sets of ten", () => {
  it("the tenth answer closes the set with its score, stars and points", () => {
    const answers = [true, true, true, true, true, true, true, true, false, true];
    const { p, results } = play(EMPTY_PROGRESS, answers);
    expect(results.slice(0, 9).every((r) => r.setDone === null)).toBe(true);
    const done = results[9].setDone!;
    expect(done).toMatchObject({ score: 9, total: SET_SIZE, stars: 2, newBest: true });
    expect(done.points).toBe(results.reduce((a, r) => a + r.gained, 0));
    expect(p.set).toBeNull();
    expect(p.games.quality).toMatchObject({ bestSet: 9, sets: 1 });
  });

  it("a worse second set is not a new best", () => {
    const first = play(EMPTY_PROGRESS, Array(10).fill(true)).p;
    const second = play(first, Array(10).fill(false)).results[9].setDone!;
    expect(second.newBest).toBe(false);
    expect(second.stars).toBe(0);
  });

  it("stars: 6+ one, 8+ two, 10 three", () => {
    expect([5, 6, 7, 8, 9, 10].map(starsFor)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it("switching games starts a fresh set without touching scores", () => {
    const { p } = play(EMPTY_PROGRESS, [true, true, true]);
    const moved = record(abandonSet(p), "mode", true, "2026-09-26").progress;
    expect(moved.set).toEqual({ game: "mode", answers: [true] });
    expect(moved.games.quality!.right).toBe(3);
  });
});

describe("ranks and days", () => {
  it("ranks climb with points and report progress to the next", () => {
    expect(rankFor(0).name).toBe(RANKS[0].name);
    expect(rankFor(150)).toMatchObject({ name: "Listener", next: { name: "Attentive ear", min: 300 } });
    expect(rankFor(200).progress).toBeCloseTo(0.5);
    expect(rankFor(99999)).toMatchObject({ name: "Hexatonic ear", next: null, progress: 1 });
  });

  it("reaching a new rank is reported once, on the answer that crossed it", () => {
    const { results } = play(EMPTY_PROGRESS, Array(8).fill(true));
    const ups = results.filter((r) => r.rankUp);
    expect(ups).toHaveLength(1);
    expect(ups[0].rankUp!.name).toBe("Listener");
  });

  it("consecutive days build the day streak; a gap resets it", () => {
    let p = record(EMPTY_PROGRESS, "quality", true, "2026-09-24").progress;
    p = record(p, "quality", true, "2026-09-24").progress;
    expect(p.days).toBe(1);
    p = record(p, "quality", true, "2026-09-25").progress;
    expect(p.days).toBe(2);
    p = record(p, "quality", true, "2026-09-28").progress;
    expect(p.days).toBe(1);
  });

  it("the day before the 1st of a month is the last day of the previous one", () => {
    let p = record(EMPTY_PROGRESS, "quality", true, "2026-09-30").progress;
    p = record(p, "quality", true, "2026-10-01").progress;
    expect(p.days).toBe(2);
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("the streak shown today", () => {
  it("holds through yesterday and ends after a missed day", () => {
    const p = record(EMPTY_PROGRESS, "quality", true, "2026-09-25").progress;
    expect(liveDays(p, "2026-09-25")).toBe(1);
    expect(liveDays(p, "2026-09-26")).toBe(1);
    expect(liveDays(p, "2026-09-27")).toBe(0);
    expect(liveDays(EMPTY_PROGRESS, "2026-09-27")).toBe(0);
  });
});

describe("loading", () => {
  it("keeps the older per-game scores and credits their points", () => {
    const p = loadProgress(null, JSON.stringify({ mode: { right: 7, total: 9, streak: 2, best: 5 } }));
    expect(p.games.mode).toMatchObject({ right: 7, total: 9, best: 5, bestSet: 0 });
    expect(p.xp).toBe(70);
  });

  it("survives junk", () => {
    expect(loadProgress("{not json", "also not")).toEqual(EMPTY_PROGRESS);
  });
});
