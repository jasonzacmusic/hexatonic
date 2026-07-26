/**
 * Custom scales. The engine was always size-agnostic; the missing piece was
 * spelling an arbitrary pitch-class set, which is the same search that solved
 * the octatonic — generalised to any number of notes.
 */
import { describe, it, expect } from "vitest";
import { spellSet, encodeCustom, decodeCustom, describeSet, CUSTOM_PRESETS } from "../src/lib/theory/custom";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import { noteName, pc } from "../src/lib/theory/note";

const names = (r: any) => r.notes.map(noteName).join(" ");

describe("spelling an arbitrary set", () => {
  it("spells the known scales the way the dedicated code does", () => {
    expect(names(spellSet("C", [0, 2, 4, 7, 9, 11]))).toBe("C D E G A B");
    expect(names(spellSet("C", [0, 2, 3, 5, 7, 10]))).toBe("C D Eb F G Bb");
    expect(names(spellSet("C", [0, 2, 4, 5, 7, 9, 11]))).toBe("C D E F G A B");
    expect(names(spellSet("F#", [0, 2, 4, 7, 9, 11]))).toBe("F# G# A# C# D# E#");
  });
  it("uses one letter per degree wherever that is possible at all", () => {
    // Some sets cannot manage it: a blues scale contains both a b5 and a 5, which
    // are one letter apart no matter how you write them. That is a property of
    // the set, so the test only demands it of sets that can satisfy it.
    const canBeClean = (semis: number[]) => {
      const slots = semis.map((s) => [0,0,1,1,2,3,3,4,4,5,5,6][s]);
      return new Set(slots).size === semis.length;
    };
    for (const k of KEYS)
      for (const set of CUSTOM_PRESETS.filter((p) => p.semis.length > 1 && canBeClean(p.semis))) {
        const r = spellSet(k, set.semis);
        expect(r.error, `${k} ${set.name}`).toBeUndefined();
        expect(r.repeatedLetter, `${k} ${set.name} -> ${names(r)}`).toBe(false);
      }
  });

  it("spells minor-flavoured sets with flats, the way a musician writes them", () => {
    // C D# F F# G A# is legal and looks wrong. Same cost, so a tie-break decides.
    expect(names(spellSet("C", [0, 3, 5, 6, 7, 10]))).toBe("C Eb F Gb G Bb");
    expect(names(spellSet("C", [0, 3, 5, 7, 10]))).toBe("C Eb F G Bb");
  });
  it("never needs a double accidental for any preset in any key", () => {
    for (const k of KEYS)
      for (const set of CUSTOM_PRESETS) {
        const r = spellSet(k, set.semis);
        if (r.error) continue;
        expect(r.notes.every((n) => Math.abs(n.alt) <= 1), `${k} ${set.name} -> ${names(r)}`).toBe(true);
      }
  });
  it("handles the degenerate cases", () => {
    expect(spellSet("C", []).error).toBeTruthy();
    expect(names(spellSet("C", [0]))).toBe("C");
    expect(spellSet("C", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).notes).toHaveLength(12);
  });
});

describe("custom scales round-trip through a URL", () => {
  it("encodes to at most three characters and back", () => {
    for (const p of CUSTOM_PRESETS) {
      const code = encodeCustom(p.semis);
      expect(code.length).toBeLessThanOrEqual(3);
      expect(decodeCustom(code)).toEqual([...p.semis].sort((a, b) => a - b));
    }
  });
  it("falls back to a sensible scale on junk input", () => {
    expect(decodeCustom("zzzz").length).toBeGreaterThan(0);
    expect(decodeCustom("")).toEqual([0, 2, 4, 7, 9, 11]);
  });
  it("always includes the tonic", () => {
    expect(decodeCustom(encodeCustom([2, 4, 7]))).toContain(0);
  });
});

describe("a custom scale behaves like any other", () => {
  it("builds through buildScale and reports its own set-class facts", () => {
    const s = buildScale("C", "custom", 0, [0, 2, 4, 7, 9, 11]);
    expect(s.error).toBeUndefined();
    expect(s.notes.map(noteName)).toEqual(["C", "D", "E", "G", "A", "B"]);
    expect(s.intervalVector).toEqual([1, 4, 3, 2, 5, 0]);   // 6-32, as it should be
    expect(s.tritones).toBe(0);
  });
  it("works in every key", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "custom", 0, [0, 3, 5, 6, 7, 10]);
      expect(s.error, k).toBeUndefined();
      expect(s.notes).toHaveLength(6);
    }
  });
  it("describes what was built", () => {
    expect(describeSet([0, 2, 4, 7, 9, 11])).toContain("Shadava");
    expect(describeSet([0, 2, 4, 7, 9])).toContain("Audava");
    expect(describeSet([0, 2, 4, 6, 8, 10])).toContain("symmetric");
  });
});

describe("the default drill", () => {
  it("opens on the minor hexatonic — the one Jason actually uses", async () => {
    const { DEFAULTS } = await import("../src/lib/useDrill");
    expect(DEFAULTS.family).toBe("diatonic");
    expect(DEFAULTS.mode).toBe(4);
    const s = buildScale(DEFAULTS.key, DEFAULTS.family, DEFAULTS.mode);
    expect(s.notes.map(noteName)).toEqual(["C", "D", "Eb", "F", "G", "Bb"]);
    expect(s.label).toContain("Dorian/Aeolian");
  });
});
