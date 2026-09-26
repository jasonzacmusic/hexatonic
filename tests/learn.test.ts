/**
 * Every sentence on /learn ("Why six notes") and /resolution that names a note,
 * a chord or a count. The page reads these values from src/lib/theory/learn.ts
 * and resolution.ts; these tests pin the exact words the page prints in G, and
 * then check the same facts hold in all twelve keys.
 *
 * The lesson follows Jason Zac's "Piano Workout: 2 Chords, All Inversions &
 * Modal Hexatonic Scales" and his handwritten notes for it (B♭ Sunday Scale
 * with B♭ + Cm, A minor hexatonic with Am + G, then G Dorian Gm + Am, Lydian
 * G + A, Phrygian Gm + A♭, Mixolydian G + F). The notes' own examples are
 * checked here too, in the keys he wrote them.
 */

import { describe, it, expect } from "vitest";
import {
  sweetSpotFact, twoChordsFact, inversionDrillFact, minorFact, modalFact, MODES,
  rhythmFact, keyPairs, sundayRun, pretty, chordLabel, chordWords, listWords, triadSymbol,
} from "../src/lib/theory/learn";
import { sixVsSeven, sharesFactor, solveResolution } from "../src/lib/theory/resolution";
import { solveTihai } from "../src/lib/theory/tihai";
import { meterById } from "../src/lib/theory/meters";
import { decodeCustom } from "../src/lib/theory/custom";
import { noteName, pc } from "../src/lib/theory/note";
import { KEYS } from "../src/lib/theory/scales";
import { decodeState } from "../src/lib/useDrill";

const names = (ns: { letter: string; alt: number }[]) => ns.map((n) => noteName(n as any)).join(" ");
const noDoubles = (ns: { alt: number }[]) => ns.every((n) => Math.abs(n.alt) < 2);
const sevenLetters = (ns: { letter: string }[]) => new Set(ns.map((n) => n.letter)).size === ns.length;

describe("Learn 1 · six notes: the pentatonic plus one, the major minus one (in G)", () => {
  const f = sweetSpotFact("G");
  it("five, six and seven notes", () => {
    expect(names(f.penta)).toBe("G A B D E");
    expect(names(f.sunday)).toBe("G A B C D E");
    expect(names(f.major)).toBe("G A B C D E F#");
  });
  it("the Sunday Scale adds C to the pentatonic and leaves F# out of the major", () => {
    expect(noteName(f.added)).toBe("C");
    expect(noteName(f.dropped)).toBe("F#");
  });
  it("leaving out the 7th also takes out G major's only tritone, C–F#", () => {
    expect(names(f.tritone)).toBe("C F#");
    expect(f.sundayTritones).toBe(0);
  });
  it("Jason's own example: B♭ C D E♭ F G, B♭ major without the A", () => {
    const b = sweetSpotFact("Bb");
    expect(names(b.sunday)).toBe("Bb C D Eb F G");
    expect(noteName(b.dropped)).toBe("A");
  });
  it("holds in every key: 4th added, 7th dropped, no tritone, spelled on six letters", () => {
    for (const k of KEYS) {
      const x = sweetSpotFact(k);
      expect(x.penta).toHaveLength(5);
      expect(x.sunday).toHaveLength(6);
      expect(pc(x.added)).toBe(pc(x.major[3]));
      expect(pc(x.dropped)).toBe(pc(x.major[6]));
      expect(x.sundayTritones).toBe(0);
      expect(sevenLetters(x.sunday) && noDoubles(x.sunday)).toBe(true);
    }
  });
});

describe("Learn 2 · the scale holds two chords (in G)", () => {
  const f = twoChordsFact("G");
  it("stacking every other note gives G, Am, G, Am, G, Am", () => {
    expect(f.stacks.map((s) => chordLabel(s.symbol))).toEqual(["G", "Am", "G", "Am", "G", "Am"]);
    expect(f.stacks.map((s) => names(s.notes))).toEqual([
      "G B D", "A C E", "B D G", "C E A", "D G B", "E A C",
    ]);
    expect(f.chords).toEqual(["G", "Am"]);
    expect(names(f.chordNotes[0])).toBe("G B D");
    expect(names(f.chordNotes[1])).toBe("A C E");
  });
  it("the two share no note and use all six", () => {
    expect(f.shareNone).toBe(true);
    expect(f.coverAll).toBe(true);
  });
  it("in G major only A minor (a step up) and F#° (a step down) share no note with G", () => {
    expect(f.strangers).toEqual([{ symbol: "Am", degree: 2 }, { symbol: "F#dim", degree: 7 }]);
    expect(listWords(f.strangers.map((s) => chordWords(s.symbol)))).toBe("A minor and F♯°");
  });
  it("Jason's example: B♭ and C minor", () => {
    expect(twoChordsFact("Bb").chords).toEqual(["Bb", "Cm"]);
  });
  it("holds in every key: a major tonic and the minor chord a step up, nothing shared", () => {
    for (const k of KEYS) {
      const x = twoChordsFact(k);
      expect(new Set(x.stacks.map((s) => s.symbol)).size).toBe(2);
      expect(x.chords[0]).toBe(noteName(x.scale[0]));
      expect(x.chords[1]).toBe(noteName(x.scale[1]) + "m");
      expect(x.shareNone && x.coverAll).toBe(true);
      expect(x.strangers.map((s) => s.degree)).toEqual([2, 7]);
    }
  });
});

describe("Learn 3 · two chords, every inversion (in G)", () => {
  const f = inversionDrillFact("G");
  it("G, Am, G/B, Am/C, G/D, Am/E, then G again an octave up", () => {
    expect(f.steps.map((s) => s.label)).toEqual(["G", "Am", "G/B", "Am/C", "G/D", "Am/E", "G"]);
    expect(f.steps.map((s) => s.inversion)).toEqual([
      "root position", "root position", "first inversion", "first inversion",
      "second inversion", "second inversion", "root position",
    ]);
    expect(f.steps[6].voicing.map((m, i) => m - f.steps[0].voicing[i])).toEqual([12, 12, 12]);
  });
  it("every voice climbs one scale note at a time", () => {
    expect(f.stepwise).toBe(true);
  });
  it("Jason's notes: B♭DF, CE♭G, DFB♭, E♭GC, FB♭D, GCE♭", () => {
    const b = inversionDrillFact("Bb");
    expect(b.movement.steps.map((s) => names(s.notes))).toEqual([
      "Bb D F", "C Eb G", "D F Bb", "Eb G C", "F Bb D", "G C Eb",
    ]);
  });
  it("holds in every key", () => {
    for (const k of KEYS) {
      const x = inversionDrillFact(k);
      expect(x.steps).toHaveLength(7);
      expect(x.stepwise).toBe(true);
      expect(x.steps.map((s) => s.pair)).toEqual([0, 1, 0, 1, 0, 1, 0]);
    }
  });
});

describe("Learn 4 · the minor hexatonic: the same two chords, a new home (in G)", () => {
  const f = minorFact("G");
  it("A B C D E G, with A minor and G, exactly as in Jason's notes", () => {
    expect(noteName(f.tonic)).toBe("A");
    expect(names(f.scale)).toBe("A B C D E G");
    expect(f.movement.pairLabels).toEqual(["Am", "G"]);
    expect(f.steps.map((s) => s.label)).toEqual(["Am", "G/B", "Am/C", "G/D", "Am/E", "G", "Am"]);
  });
  it("is G's Sunday Scale started on A", () => {
    expect(f.sameAsSunday).toBe(true);
  });
  it("is the A minor pentatonic plus B, with no 6th of either kind", () => {
    expect(names(f.pentatonic)).toBe("A C D E G");
    expect(noteName(f.added)).toBe("B");
    expect(f.noSixth).toBe(true);
  });
  it("holds in every key", () => {
    for (const k of KEYS) {
      const x = minorFact(k);
      expect(x.sameAsSunday && x.noSixth).toBe(true);
      expect(x.pentatonic).toHaveLength(5);
      expect(x.movement.pairLabels[0]).toMatch(/m$/);
      expect(noDoubles(x.scale)).toBe(true);
    }
  });
});

describe("Learn 5 · two chords make a mode (in G, as in Jason's notes)", () => {
  const g = Object.fromEntries(MODES.map((m) => [m.id, modalFact(m.id, "G")]));
  it("Dorian: Gm + Am, G A B♭ C D E, keeps B♭ and E", () => {
    expect(g.dorian.chords).toEqual(["Gm", "Am"]);
    expect(names(g.dorian.six)).toBe("G A Bb C D E");
    expect(noteName(g.dorian.dropped)).toBe("F");
    expect(names(g.dorian.colourNotes)).toBe("Bb E");
  });
  it("Lydian: G + A, G A B C# D E, keeps C#", () => {
    expect(g.lydian.chords).toEqual(["G", "A"]);
    expect(names(g.lydian.six)).toBe("G A B C# D E");
    expect(noteName(g.lydian.dropped)).toBe("F#");
    expect(names(g.lydian.colourNotes)).toBe("C#");
  });
  it("Phrygian: Gm + A♭, G A♭ B♭ C D E♭, keeps A♭", () => {
    expect(g.phrygian.chords).toEqual(["Gm", "Ab"]);
    expect(names(g.phrygian.six)).toBe("G Ab Bb C D Eb");
    expect(noteName(g.phrygian.dropped)).toBe("F");
    expect(names(g.phrygian.colourNotes)).toBe("Ab");
  });
  it("Mixolydian: G + F, G A B C D F, keeps B and F", () => {
    expect(g.mixolydian.chords).toEqual(["G", "F"]);
    expect(names(g.mixolydian.six)).toBe("G A B C D F");
    expect(noteName(g.mixolydian.dropped)).toBe("E");
    expect(names(g.mixolydian.colourNotes)).toBe("B F");
    expect(g.mixolydian.steps.map((s) => s.label)).toEqual(["G", "F/A", "G/B", "F/C", "G/D", "F", "G"]);
  });
  it("each Practice link opens on exactly these six notes", () => {
    for (const m of MODES) {
      const x = g[m.id];
      const s = decodeState(x.practiceHref.split("?")[1]);
      expect(s.key).toBe("G");
      expect(s.family).toBe("custom");
      expect(decodeCustom(s.custom)).toEqual(x.six.map((n) => ((pc(n) - 7) % 12 + 12) % 12));
    }
  });
  it("holds in every key: two triads, nothing shared, colour kept, cleanly spelled", () => {
    for (const k of KEYS) for (const m of MODES) {
      const x = modalFact(m.id, k);
      expect(x.six).toHaveLength(6);
      expect(x.shareNone).toBe(true);
      expect(x.keepsColour).toBe(true);
      expect(x.chords.every((c) => /^[A-G][#b]?m?$/.test(c))).toBe(true);
      expect(x.chords[0].endsWith("m")).toBe(m.id === "dorian" || m.id === "phrygian");
      expect(sevenLetters(x.seven) && noDoubles(x.seven)).toBe(true);
      expect(x.steps).toHaveLength(7);
    }
  });
});

describe("Learn 6 · rhythm: accents in 3s, 4s and 5s  [theory-audit #21]", () => {
  it("six notes land in 3, 3 and 15 bars; seven need 21, 7 and 35", () => {
    expect(rhythmFact().map((r) => [r.grouping, r.six, r.seven])).toEqual([
      [3, 3, 21], [4, 3, 7], [5, 15, 35],
    ]);
    for (const r of rhythmFact()) expect(r.six).toBeLessThan(r.seven);
  });
  it("the full table the resolution maths rests on", () => {
    const rows = sixVsSeven();
    expect(rows.map((r) => [r.grouping, r.six, r.seven])).toEqual([
      [3, 3, 21], [4, 3, 7], [5, 15, 35], [6, 3, 21], [7, 21, 7], [9, 9, 63],
    ]);
    expect(rows.filter((r) => r.sixShares).map((r) => r.grouping)).toEqual([3, 4, 6, 9]);
    expect(rows.filter((r) => r.sevenShares).map((r) => r.grouping)).toEqual([7]);
  });
  it("the audible proof: groups of 4 on six notes land after exactly 48 sixteenths", () => {
    expect(solveResolution(6, 4, 4, 4, "full").totalNotes).toBe(48);
    expect(solveResolution(6, 4, 4, 3, "full").totalNotes).toBe(48);
    expect(solveResolution(6, 4, 4, 5, "full").totalNotes).toBe(240);
    expect(sharesFactor(7, 14)).toBe(true);
  });
});

describe("Learn 7 · every key, in key-signature pairs", () => {
  const pairs = keyPairs(KEYS);
  it("G–F, D–B♭, A–E♭, E–A♭, B–D♭", () => {
    expect(pairs.map((p) => [p.count, p.sharp, p.flat])).toEqual([
      [1, "G", "F"], [2, "D", "Bb"], [3, "A", "Eb"], [4, "E", "Ab"], [5, "B", "Db"],
    ]);
  });
  it("Jason's pair: B♭ and D Sunday Scales, two flats and two sharps", () => {
    expect(names(sundayRun("Bb"))).toBe("Bb C D Eb F G Bb");
    expect(names(sundayRun("D"))).toBe("D E F# G A B D");
    expect(sundayRun("D")[6].octave).toBe(sundayRun("D")[0].octave + 1);
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
  it("names triads from spelled notes", () => {
    const n = (l: string, a = 0) => ({ letter: l, alt: a, octave: 4 }) as any;
    expect(triadSymbol([n("G"), n("B"), n("D")])).toBe("G");
    expect(triadSymbol([n("A"), n("C"), n("E")])).toBe("Am");
    expect(triadSymbol([n("F", 1), n("A"), n("C")])).toBe("F#dim");
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
