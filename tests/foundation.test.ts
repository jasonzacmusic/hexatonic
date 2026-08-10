import { describe, expect, it } from "vitest";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { forteName, midi, noteName } from "../src/lib/theory/note";
import { buildScale } from "../src/lib/theory/scales";
import { solveResolution } from "../src/lib/theory/resolution";

describe("foundation regressions", () => {
  it("maps the diatonic collection to Forte 7-35", () => {
    expect(forteName([0, 2, 4, 5, 7, 9, 11])).toContain("7-35");
    expect(buildScale("C", "hepta", 0).forte).toContain("7-35");
  });

  it("carries the parent major key signature through rotations", () => {
    expect(buildScale("G", "diatonic", 0).keySignature).toBe("G");
    /*
     * C D Eb F G Bb sits inside BOTH Eb major and Bb major, so there is a real
     * choice here. Bb spends both of its flats on notes the scale sounds; Eb
     * would print an Ab the scale never touches. This used to return Eb purely
     * because Eb comes first in KEYS.
     */
    expect(buildScale("C", "diatonic", 4).keySignature).toBe("Bb");
    expect(buildScale("Db", "penta", 0).keySignature).toBe("Db");
    expect(buildScale("C", "whole", 0).keySignature).toBeNull();
  });

  it("voices every named chord upward from that reading's root", () => {
    const chords = tertianOnly(findChords(buildScale("C", "diatonic", 0).notes));
    const c6 = chords.find((chord) => chord.names.some((name) => name.symbol === "C6"))!;
    const am7 = c6.names.find((name) => name.symbol === "Am7")!;
    expect(noteName(am7.voicing[0])).toBe("A");
    expect(am7.voicing.map(midi)).toEqual([...am7.voicing.map(midi)].sort((a, b) => a - b));
    expect(new Set(am7.voicing.map((note) => midi(note) % 12))).toEqual(new Set(c6.pcs));
  });

  it("resolves to whole bars across meters two through seven", () => {
    for (let beats = 2; beats <= 7; beats++)
      for (const size of [5, 6, 7, 8])
        for (const sub of [2, 3, 4, 6])
          for (const group of [3, 4, 5, 6, 7, 9]) {
            const result = solveResolution(size, sub, beats, group, "full");
            expect(Number.isInteger(result.bars)).toBe(true);
            expect(result.totalNotes % (sub * beats)).toBe(0);
          }
  });
});
