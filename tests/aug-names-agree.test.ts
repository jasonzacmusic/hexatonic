import { describe, expect, it } from "vitest";
import { FAMILIES, KEYS, buildScale } from "../src/lib/theory/scales";
import { noteName } from "../src/lib/theory/note";
import { augTriangles } from "../src/lib/theory/board";
import { sixNoteScales } from "../src/lib/theory/pairAtlas";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { ownSpellingFirst } from "../src/app/harmony/scaleOptions";

/*
 * One augmented chord, one name, on every surface: the ring (augTriangles),
 * the Pairs tab (sixNoteScales), the Chords tab and the Practice chord strip
 * (both lead with ownSpellingFirst over findChords).
 */
const ring = (k: string, f: string, m = 0) =>
  augTriangles(buildScale(k, f, m).notes).filter((t) => t.inScale).map((t) => t.notes.map(noteName).join(" ")).sort();
const chords = (k: string, f: string, m = 0) => {
  const s = buildScale(k, f, m);
  return ownSpellingFirst(tertianOnly(findChords(s.notes, [3])), s.notes).chords
    .filter((c) => c.names.some((x) => x.symbol.endsWith("aug")))
    .map((c) => c.names[0].notes.join(" ")).sort();
};
const pairs = (k: string, f: string) =>
  [...new Set(sixNoteScales(k).find((x) => x.familyId === f)!.pairs.flatMap((p) => p.shapes)
    .filter((c) => c.quality === "aug").map((c) => c.notes.map(noteName).join(" ")))].sort();

describe("augmented chords are named the same everywhere", () => {
  it("E whole tone: E+ = E G♯ B♯ and G♭+ = G♭ B♭ D on the ring, in Pairs, Chords and the Practice strip", () => {
    const want = ["E G# B#", "Gb Bb D"];
    expect(ring("E", "whole")).toEqual(want);
    expect(pairs("E", "whole")).toEqual(want);
    expect(chords("E", "whole")).toEqual(want);
  });

  it("whole tone and augmented, all twelve keys: ring = Pairs = Chords", () => {
    for (const f of ["whole", "aug"]) for (const k of KEYS) {
      const c = chords(k, f);
      expect(c, `${k} ${f}`).toHaveLength(2);
      expect(ring(k, f), `${k} ${f} ring`).toEqual(c);
      expect(pairs(k, f), `${k} ${f} pairs`).toEqual(c);
    }
  });

  it("every six-note scale, every mode, every key: the ring names what Chords names", () => {
    for (const f of FAMILIES) {
      if (f.size !== 6 || f.id === "custom") continue;
      for (let m = 0; m < (f.modes?.length ?? 1); m++) for (const k of KEYS)
        expect(ring(k, f.id, m), `${k} ${f.id}/${m}`).toEqual(chords(k, f.id, m));
    }
  });

  it("never a C♭, F♭, E♯ or B♯ root on the ring where another name exists (B whole tone is G+, not C♭+)", () => {
    expect(ring("B", "whole")).toContain("G B D#");
    expect(ring("F#", "whole")).toContain("D F# A#");
  });
});
