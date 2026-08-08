import { describe, expect, it } from "vitest";
import {
  buildAtlasMovement,
  buildPairExercise,
  DIATONIC_EXACT_COVERS,
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

  it("keeps the new headline separate from Jason's 2025 examples", () => {
    const newIds = PAIR_ATLAS.filter((entry) => entry.status === "new-lesson").map((entry) => entry.id);
    expect(newIds).toContain("major-no3");
    expect(newIds).toContain("true-octatonic");
    expect(newIds).not.toContain("sunday");
    expect(newIds).not.toContain("lydian-pair");
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
});
