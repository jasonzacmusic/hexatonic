import { describe, expect, it } from "vitest";
import {
  buildAtlasMovement,
  buildPairExercise,
  DIATONIC_EXACT_COVERS,
  adjacentDiatonicPairs,
  PAIR_ATLAS,
  proveExactCover,
} from "../src/lib/theory/pairAtlas";
import { noteName } from "../src/lib/theory/note";

describe("Pair Atlas exact-cover catalogue", () => {
  it("proves every curated collection is disjoint and complete", () => {
    for (const entry of PAIR_ATLAS) {
      const movement = buildAtlasMovement(entry, entry.defaultKey);
      const proof = proveExactCover(movement);
      expect(proof.disjoint, entry.id).toBe(true);
      expect(proof.complete, entry.id).toBe(true);
      expect(movement.steps, entry.id).toHaveLength(entry.voices * 2);
      expect(movement.steps.filter((step) => step.pair === 0), entry.id).toHaveLength(entry.voices);
      expect(movement.steps.filter((step) => step.pair === 1), entry.id).toHaveLength(entry.voices);
    }
  });

  it("every formula matches the notes it describes", () => {
    const DEG: Record<string, number> = {
      "1": 0, "♭2": 1, "2": 2, "♭3": 3, "3": 4, "4": 5, "♯4": 6, "♭5": 6,
      "5": 7, "♯5": 8, "♭6": 8, "6": 9, "♭7": 10, "7": 11,
    };
    for (const entry of PAIR_ATLAS)
      expect(entry.formula.split(" ").map((d) => DEG[d]), entry.id).toEqual(entry.semis);
  });

  it("carries no private lesson notes", () => {
    for (const entry of PAIR_ATLAS)
      expect(JSON.stringify(entry), entry.id).not.toMatch(/2025|lesson|headline/i);
  });

  it("names the tritone pair plainly and spells it as two major triads", () => {
    const entry = PAIR_ATLAS.find((e) => e.id === "tritone-pair")!;
    expect(entry.title).toBe("Tritone pair");
    expect(entry.subtitle).toContain("G + D♭");
    const m = buildAtlasMovement(entry, "G");
    expect(m.pairLabels).toEqual(["G", "D♭"]);
    const db = m.steps.find((s) => s.label === "D♭")!;
    expect(db.notes.map(noteName)).toEqual(["Db", "F", "Ab"]);
  });

  it("builds C major-without-3 as F plus G through all inversions", () => {
    const entry = PAIR_ATLAS.find((item) => item.id === "major-no3")!;
    const movement = buildAtlasMovement(entry, "C");
    expect(movement.scale.notes.map(noteName)).toEqual(["C", "D", "F", "G", "A", "B"]);
    expect(movement.pairLabels).toEqual(["F", "G"]);
    expect(movement.steps.map((step) => step.label)).toEqual([
      "F/C", "G/D", "F", "G", "F/A", "G/B",
    ]);
  });

  it("builds all five exercise types including a two-octave scale", () => {
    const movement = buildAtlasMovement(PAIR_ATLAS[0], "C");
    expect(buildPairExercise(movement, "scale-up-down", 1)).toHaveLength(13);
    expect(buildPairExercise(movement, "scale-up-down", 2)).toHaveLength(25);
    expect(buildPairExercise(movement, "shape-a")).toHaveLength(5);
    expect(buildPairExercise(movement, "shape-b")).toHaveLength(5);
    expect(buildPairExercise(movement, "alternating")).toHaveLength(11);
    expect(buildPairExercise(movement, "scale-chord")).toHaveLength(12);
  });

  it("enumerates all seven adjacent diatonic exact covers", () => {
    expect(DIATONIC_EXACT_COVERS).toHaveLength(7);
    expect(new Set(DIATONIC_EXACT_COVERS.map((item) => item.omitted)).size).toBe(7);
  });

  it("computes which note each neighbouring pair of G major leaves out", () => {
    expect(adjacentDiatonicPairs("G").map((p) => `${p.chords.join("+")} no ${p.omitted}`)).toEqual([
      "G+Am no F#", "Am+Bm no G", "Bm+C no A", "C+D no B", "D+Em no C", "Em+F#° no D", "F#°+G no E",
    ]);
    expect(adjacentDiatonicPairs("F")[0]).toMatchObject({ chords: ["F", "Gm"], omitted: "E" });
  });
});
