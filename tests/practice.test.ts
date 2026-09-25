/**
 * The Practice page's claims: six pattern families, old links that still open,
 * the routines ladder at ×1 ×2 ×4, the drone register, and every computed
 * sentence the page prints.
 */

import { describe, expect, it } from "vitest";
import { buildScale } from "../src/lib/theory/scales";
import { noteName } from "../src/lib/theory/note";
import {
  PATTERNS, PATTERN_FAMILIES, LEGACY_PATTERN, resolvePatternId, buildPattern,
  describeSkip, skipSummary, patternFamilyOf,
} from "../src/lib/theory/patterns";
import { DEFAULTS, decodeState, encodeState, beatsToTheOne, droneMidi } from "../src/lib/useDrill";
import { ROUTINES, SPEEDS, BASE_BPM, stepState } from "../src/app/practice/routines";
import {
  ragasForScale, topNoteCost, tripletHint, groupFamilies, isSixNoteSound, familyGroup,
} from "../src/app/practice/scaleFacts";
import { FAMILIES } from "../src/lib/theory/scales";
import { meterById } from "../src/lib/theory/meters";
import { solveResolution } from "../src/lib/theory/resolution";

describe("six pattern families", () => {
  it("has exactly six, each with its own drills, and every drill in one family", () => {
    expect(PATTERN_FAMILIES.map((f) => f.name)).toEqual([
      "Runs", "Fourths", "Thirds", "Sequences", "Broken chords", "Doubled notes",
    ]);
    const all = PATTERN_FAMILIES.flatMap((f) => f.patterns);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(PATTERNS.map((p) => p.id).sort());
    for (const p of PATTERNS) expect(patternFamilyOf(p.id).id).toBe(p.family);
  });

  it("maps every retired pattern id to a live drill, so old links open", () => {
    for (const [old, now] of Object.entries(LEGACY_PATTERN)) {
      expect(resolvePatternId(old)).toBe(now);
      expect(PATTERNS.some((p) => p.id === now)).toBe(true);
    }
    expect(decodeState("p=fifths").pattern).toBe("thirds");
    expect(decodeState("p=triads").pattern).toBe("chordLadder");
    expect(decodeState("p=sixths").pattern).toBe("both");
    expect(resolvePatternId("nonsense")).toBeNull();
  });

  it("fourths in the major hexatonic are all perfect (three 4ths, three 5ths)", () => {
    const g = buildScale("G", "diatonic", 0).notes;
    expect(skipSummary(g, 3)).toEqual([
      { semis: 5, count: 3, name: "perfect 4th" },
      { semis: 7, count: 3, name: "perfect 5th" },
    ]);
    expect(describeSkip(g, 3)).toBe("In this scale that gives three perfect 4ths and three perfect 5ths.");
  });

  it("thirds in the major hexatonic: two major 3rds, two minor 3rds, two perfect 4ths", () => {
    const g = buildScale("G", "diatonic", 0).notes;
    expect(describeSkip(g, 2)).toBe(
      "In this scale that gives two minor 3rds, two major 3rds and two perfect 4ths.");
  });

  it("the whole-tone scale's thirds are all major 3rds, its fourths all tritones", () => {
    const w = buildScale("G", "whole").notes;
    expect(describeSkip(w, 2)).toBe("In this scale that gives six major 3rds.");
    expect(describeSkip(w, 3)).toBe("In this scale that gives six tritones.");
  });

  it("the default drill in G starts on G and repeats nothing", () => {
    const g = buildScale("G", "diatonic", 0).notes;
    expect(buildPattern("both", g, 1, 4, false).map(noteName))
      .toEqual(["G", "A", "B", "D", "E", "F#", "G", "F#", "E", "D", "B", "A"]);
  });
});

describe("share links", () => {
  it("a new link carries the version mark and round-trips", () => {
    const s = { ...DEFAULTS, key: "D", pattern: "fourths" as const };
    const qs = encodeState(s);
    expect(qs).toContain("v=2");
    expect(decodeState(qs)).toEqual(s);
  });
  it("the default drill encodes to an empty link", () => {
    expect(encodeState(DEFAULTS)).toBe("");
    expect(decodeState("")).toEqual(DEFAULTS);
  });
  it("an old link with no key or mode still opens on C, the minor hexatonic", () => {
    const s = decodeState("p=fourths&g=5");
    expect(s.key).toBe("C");
    expect(s.mode).toBe(4);
    expect(s.pattern).toBe("fourths");
    expect(s.grouping).toBe(5);
  });
});

describe("the transport's count to the one", () => {
  it("counts the beats left in the cycle, including the current one", () => {
    expect(beatsToTheOne(1, 3, 1, 4)).toBe(12);
    expect(beatsToTheOne(3, 3, 4, 4)).toBe(1);
    expect(beatsToTheOne(2, 3, 3, 4)).toBe(6);
  });
});

describe("the tonic drone", () => {
  it("sits between C3 and B3 and follows the key", () => {
    expect(droneMidi(7)).toBe(55);   // G3
    expect(droneMidi(0)).toBe(48);   // C3
    expect(droneMidi(11)).toBe(59);  // B3
    expect(droneMidi(-1)).toBe(59);
  });
});

describe("routines", () => {
  it("speeds go ×1, ×2, ×4 (kala pramanam), each inside the tempo range", () => {
    expect(SPEEDS.map((s) => s.multiplier)).toEqual([1, 2, 4]);
    expect(SPEEDS.map((s) => s.bpm)).toEqual([BASE_BPM, BASE_BPM * 2, BASE_BPM * 4]);
    for (const s of SPEEDS) {
      expect(s.bpm).toBeGreaterThanOrEqual(40);
      expect(s.bpm).toBeLessThanOrEqual(200);
    }
  });
  it("every step is a valid drill that survives a share link", () => {
    for (const r of ROUTINES)
      for (const st of r.steps) {
        const s = { ...DEFAULTS, ...stepState(st, 100) };
        expect(decodeState(encodeState(s)), `${r.name}: ${st.label}`).toEqual(s);
        expect(meterById(s.meter).id).toBe(s.meter);
      }
  });
  it("the tala rung uses the seven talas, each in its usual jati", () => {
    const talas = ROUTINES.find((r) => r.id === "talas")!;
    expect(talas.steps).toHaveLength(7);
    expect(talas.steps.some((s) => s.label.startsWith("Triputa"))).toBe(true);
  });
});

describe("computed sentences", () => {
  it("the minor hexatonic is raga Pushpalathika; the major hexatonic matches no listed raga", () => {
    const minor = buildScale("C", "diatonic", 4);
    expect(ragasForScale("C", minor.notes).map((r) => r.name)).toEqual(["Pushpalathika"]);
    const major = buildScale("G", "diatonic", 0);
    expect(ragasForScale("G", major.notes)).toEqual([]);
  });
  it("the top note turns 3 bars into 7 for a six-note run in 16ths", () => {
    expect(topNoteCost(7, 4, 4, 4, "full")).toEqual({ length: 7, withTop: 7, without: 3 });
  });
  it("only suggests triplets when they genuinely land sooner", () => {
    // groups of 5 over a 12-note pattern in 16ths: 15 bars; in triplets: 5
    expect(solveResolution(12, 4, 4, 5, "full").bars).toBe(15);
    expect(tripletHint(12, 4, 4, 5, "full")).toBe("In triplets the same drill lands in 5 bars.");
    expect(tripletHint(12, 4, 4, 4, "full")).toBeNull();
    expect(tripletHint(12, 3, 4, 5, "full")).toBeNull();
  });
});

describe("the family menu", () => {
  it("puts the six-note sounds first and never lets Surprise me roll custom or a non-six", () => {
    const groups = groupFamilies(FAMILIES);
    expect(groups.length).toBeGreaterThan(1);
    expect(familyGroup(FAMILIES.find((f) => f.id === "diatonic")!)).not.toBe("Compare with");
    const pool = FAMILIES.filter(isSixNoteSound);
    expect(pool.length).toBeGreaterThan(4);
    for (const f of pool) {
      expect(f.size).toBe(6);
      expect(f.kind).not.toBe("custom");
    }
  });
});
