import { describe, expect, it } from "vitest";
import { buildScale } from "../src/lib/theory/scales";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { harmonicFunction, romanNumeral, triadQuality } from "../src/lib/theory/functions";

const triadsOf = (key: string, fam: string, mode = 0) => {
  const s = buildScale(key, fam, mode);
  return tertianOnly(findChords(s.notes, [3])).map((c) => {
    const [r, t, f] = c.names[0].voicing;
    return {
      name: c.names[0].symbol,
      roman: romanNumeral(s.notes[0], r, triadQuality(r, t, f)),
      fn: harmonicFunction(s.notes[0], r),
    };
  });
};

describe("roman numerals and functions", () => {
  it("G major no-4: G = I tonic, Bm = iii tonic, D = V dominant, Em = vi tonic", () => {
    const t = Object.fromEntries(triadsOf("G", "diatonic", 0).map((x) => [x.name, [x.roman, x.fn]]));
    expect(t).toEqual({
      G: ["I", "tonic"], Bm: ["iii", "tonic"], D: ["V", "dominant"], Em: ["vi", "tonic"],
    });
  });

  it("names every degree in every key the same way", () => {
    for (const key of ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]) {
      const t = triadsOf(key, "diatonic", 0).map((x) => x.roman).sort();
      expect(t).toEqual(["I", "V", "iii", "vi"].sort());
    }
  });

  it("minor no-6 in G (no E♭, so no Cm): Gm = i, B♭ = ♭III, Dm = v, F = ♭VII", () => {
    const s = buildScale("G", "diatonic", 4);
    expect(s.notes.map((n) => n.letter).join("")).toBe("GABCDF");
    const t = Object.fromEntries(triadsOf("G", "diatonic", 4).map((x) => [x.name, [x.roman, x.fn]]));
    expect(t.Gm).toEqual(["i", "tonic"]);
    expect(t.Cm).toBeUndefined();
    expect(t.Dm).toEqual(["v", "dominant"]);
    expect(t.F).toEqual(["♭VII", "dominant"]);
    expect(t.Bb).toEqual(["♭III", "tonic"]);
  });

  it("marks a diminished triad with ° and an augmented one with +", () => {
    const s = buildScale("G", "diatonic", 0);
    expect(romanNumeral(s.notes[0], { letter: "F", alt: 1, octave: 4 }, "dim")).toBe("vii°");
    expect(romanNumeral(s.notes[0], { letter: "B", alt: 0, octave: 4 }, "aug")).toBe("III+");
  });
});
