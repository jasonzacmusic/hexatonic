import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { CLASS_PLAN, HOMEWORK, TOTAL_MIN } from "../src/lib/classPlan";
import { solveResolution } from "../src/lib/theory/resolution";
import { knockOut } from "../src/lib/theory/workout";
import { buildScale } from "../src/lib/theory/scales";
import { skipCycle } from "../src/lib/theory/patterns";
import { maskOf, identify, barryLens, harmonizeDegrees } from "../src/lib/theory/workout";

const routeExists = (href: string) => {
  const path = href.split("?")[0];
  return existsSync(`src/app${path === "/" ? "" : path}/page.tsx`);
};

describe("the 90-minute class plan", () => {
  it("sums to exactly 90 minutes", () => expect(TOTAL_MIN).toBe(90));

  it("every link points at a real page", () => {
    for (const s of CLASS_PLAN) expect(routeExists(s.href), s.href).toBe(true);
    for (const h of HOMEWORK) expect(routeExists(h.href), h.href).toBe(true);
  });

  it("every strand gets real time", () => {
    for (const strand of ["theory", "ear", "piano"] as const)
      expect(CLASS_PLAN.filter((s) => s.strands.includes(strand)).reduce((a, s) => a + s.min, 0))
        .toBeGreaterThanOrEqual(25);
  });
});

describe("what the class says out loud", () => {
  it("rhythm: 3s, 4s and 6s in sixteenths land in 3 bars; major takes 7 to 21", () => {
    for (const g of [3, 4, 6]) {
      expect(solveResolution(6, 4, 4, g, "full").bars).toBe(3);
      expect([7, 21]).toContain(solveResolution(7, 4, 4, g, "full").bars);
    }
    expect(solveResolution(6, 3, 4, 5, "full").bars).toBe(5);
  });

  it("only 4 and 7 (major), only 2 and b6 (minor); none in harmonic minor", () => {
    expect(knockOut("C", "major").filter((r) => !r.tritones).map((r) => r.removedDegree)).toEqual(["4", "7"]);
    expect(knockOut("C", "minor").filter((r) => !r.tritones).map((r) => r.removedDegree)).toEqual(["2", "b6"]);
    expect(knockOut("C", "harmonic").some((r) => !r.tritones)).toBe(false);
  });

  it("the minor hexatonic in fourths is six for six perfect", () => {
    expect(skipCycle(buildScale("C", "diatonic", 4).notes, 3).allPerfect).toBe(true);
  });

  it("C blues = E♭ major blues", () => {
    expect(identify(maskOf(buildScale("C", "blues").pcs)).map((e) => e.name)).toContain("E♭ Major blues hexatonic");
  });

  it("C D E G A B: four triads, D and B orphaned, and those are B°7's notes", () => {
    const s = buildScale("C", "diatonic", 0);
    const h = harmonizeDegrees(s.notes);
    const triads = new Set(h.flatMap((d) => d.rooted).filter((x) => /^[A-G][b#]?m?$/.test(x)));
    expect([...triads].sort()).toEqual(["Am", "C", "Em", "G"]);
    const c6 = barryLens(s.notes).find((b) => b.chordSymbol === "C6")!;
    expect(c6.dimTones).toEqual(["D", "B"]);
  });
});
