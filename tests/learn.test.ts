/**
 * Every sentence on /learn ("Why six notes") and /resolution that names a note,
 * a chord or a count. The page reads these values from src/lib/theory/learn.ts
 * and resolution.ts; these tests pin the exact words the page prints in G, and
 * then check the same facts hold in all twelve keys.
 */

import { describe, it, expect } from "vitest";
import {
  tritoneFact, sameSixFact, chordStackFact, smallHarmonyFact, fourthsFact,
  pretty, chordLabel, chordWords, listWords,
} from "../src/lib/theory/learn";
import { sixVsSeven, sharesFactor, solveResolution } from "../src/lib/theory/resolution";
import { solveTihai } from "../src/lib/theory/tihai";
import { meterById } from "../src/lib/theory/meters";
import { intervalName, midi, noteName, pc } from "../src/lib/theory/note";
import { KEYS } from "../src/lib/theory/scales";

const names = (ns: { letter: string; alt: number }[]) => ns.map((n) => noteName(n as any)).join(" ");

describe("Learn 1 · only the 4th or the 7th can go (in G)", () => {
  const f = tritoneFact("G");
  it("G major has exactly one tritone, C–F#", () => {
    expect(f.tritoneCount).toBe(1);
    expect(names(f.tritone)).toBe("C F#");
  });
  it("only removing C (the 4th) or F# (the 7th) leaves no tritone", () => {
    expect(f.clean).toEqual([{ note: "C", degree: "4th" }, { note: "F#", degree: "7th" }]);
    expect(f.rows.filter((r) => r.tritones === 1)).toHaveLength(5);
  });
  it("holds in every key: one tritone, and it is the 4th and the 7th", () => {
    for (const k of KEYS) {
      const t = tritoneFact(k);
      expect(t.tritoneCount).toBe(1);
      expect(t.clean.map((c) => c.degree)).toEqual(["4th", "7th"]);
    }
  });
});

describe("Learn 2 · major and minor are the same six notes (in G)", () => {
  const f = sameSixFact("G");
  it("G major no 4 and E minor no b6 are one set", () => {
    expect(names(f.major.notes)).toBe("G A B D E F#");
    expect(noteName(f.major.removed!)).toBe("C");
    expect(names(f.minor.notes)).toBe("E F# G A B D");
    expect(noteName(f.removed)).toBe("C");             // G's 4th = E minor's b6
    expect(intervalName(f.minor.notes[0], { ...f.removed, octave: 5 })).toBe("m6");
    expect(f.sameNotes).toBe(true);
  });
  it("holds in every key", () => {
    for (const k of KEYS) expect(sameSixFact(k).sameNotes).toBe(true);
  });
});

describe("Learn 3 · the scale is one chord (in G)", () => {
  const f = chordStackFact("G");
  it("stacks G B D F# A (C) E, and the one gap is the removed C", () => {
    expect(names(f.stack.map((s) => s.note))).toBe("G B D F# A C E");
    expect(f.stack.filter((s) => s.removed).map((s) => noteName(s.note))).toEqual(["C"]);
    expect(noteName(f.removed)).toBe("C");
  });
  it("is Gmaj13 with no 11th: 3, 5, maj7, 9 and 13 above G, rising", () => {
    const [root, ...rest] = f.voiced;
    expect(noteName(root)).toBe("G");
    // intervalName is the simple interval: the 9th reads M2 and the 13th M6,
    // so check they sit above the octave.
    expect(rest.map((n) => intervalName(root, n))).toEqual(["M3", "P5", "M7", "M2", "M6"]);
    expect(midi(rest[3]) - midi(root)).toBe(14);
    expect(midi(rest[4]) - midi(root)).toBe(21);
    for (let i = 1; i < f.voiced.length; i++)
      expect(midi(f.voiced[i])).toBeGreaterThan(midi(f.voiced[i - 1]));
    expect(new Set(f.voiced.map(pc)).size).toBe(6);
  });
});

describe("Learn 4 · only four chords fit (in G)  [theory-audit #11]", () => {
  const f = smallHarmonyFact("G");
  it("the four triads are G, Bm, D, Em", () => {
    expect(f.triads.map((c) => chordLabel(c.names[0].symbol))).toEqual(["G", "Bm", "D", "Em"]);
  });
  it("the three lost triads are A minor, C and F#°, and all three needed the C", () => {
    expect(listWords(f.lost.map((c) => chordWords(c.names[0].symbol)))).toBe("A minor, C and F♯°");
    expect(noteName(f.removed)).toBe("C");
    expect(f.lostAllNeedRemoved).toBe(true);
  });
  it("holds in every key: four left, three lost, all three need the missing 4th", () => {
    for (const k of KEYS) {
      const h = smallHarmonyFact(k);
      expect(h.triads).toHaveLength(4);
      expect(h.lost).toHaveLength(3);
      expect(h.lostAllNeedRemoved).toBe(true);
    }
  });
});

describe("Learn 5 · every fourth is perfect (in G)", () => {
  const f = fourthsFact("G");
  it("six for six in the six-note scale", () => {
    expect(f.six.allPerfect).toBe(true);
    expect(f.six.pairs).toHaveLength(6);
  });
  it("in full G major, C–F# is the one jump that breaks, and C is the removed note", () => {
    expect(f.breaks).toHaveLength(1);
    expect(noteName(f.breaks[0].from)).toBe("C");
    expect(noteName(f.breaks[0].to)).toBe("F#");
    expect(f.breaks[0].interval).toBe("A4");
    expect(noteName(f.removed)).toBe("C");
  });
  it("holds in every key", () => {
    for (const k of KEYS) {
      const x = fourthsFact(k);
      expect(x.six.allPerfect).toBe(true);
      expect(x.breaks).toHaveLength(1);
      expect(pc(x.breaks[0].from)).toBe(pc(x.removed));
    }
  });
});

describe("Learn rhythm · six lines up, seven doesn't  [theory-audit #21]", () => {
  const rows = sixVsSeven();
  it("prints these bar counts (4/4, 16ths)", () => {
    expect(rows.map((r) => [r.grouping, r.six, r.seven])).toEqual([
      [3, 3, 21], [4, 3, 7], [5, 15, 35], [6, 3, 21], [7, 21, 7], [9, 9, 63],
    ]);
  });
  it("six splits into 2s and 3s, so it lines up with most groupings", () => {
    expect(rows.filter((r) => r.sixShares).map((r) => r.grouping)).toEqual([3, 4, 6, 9]);
  });
  it("seven is prime and lines up only with groups of 7, where it wins", () => {
    expect(rows.filter((r) => r.sevenShares).map((r) => r.grouping)).toEqual([7]);
    for (const r of rows) expect(r.seven < r.six).toBe(r.grouping === 7);
  });
  it("the audible proof: groups of 4 on six notes land after exactly 48 sixteenths", () => {
    expect(solveResolution(6, 4, 4, 4, "full").totalNotes).toBe(48);
    expect(sharesFactor(7, 14)).toBe(true);
  });
});

describe("display helpers", () => {
  it("prettifies without touching the letter B", () => {
    expect(pretty("Bb Eb F#")).toBe("B♭ E♭ F♯");
    expect(pretty("B")).toBe("B");
    expect(chordLabel("F#dim")).toBe("F♯°");
    expect(chordWords("Bm")).toBe("B minor");
    expect(chordWords("Bbm")).toBe("B♭ minor");
  });
});

describe("Resolution page · the tihai example it prints", () => {
  it("a phrase of 11 in Adi tala 16ths needs no gap", () => {
    expect(solveTihai(11, 32)!.gap).toBe(0);
  });
  it("the tala menu's Adi entry is 8 beats (Triputa, chatusra jati)", () => {
    const adi = meterById("tala-triputa-4");
    expect(adi.label).toBe("Adi (8)");
    expect(adi.top).toBe(8);
  });
});
