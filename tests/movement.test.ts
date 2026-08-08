/**
 * Interlocked chord movement — the bridge between a scale list and the actual
 * two-hand inversion drill used in Music Gym.
 */

import { describe, expect, it } from "vitest";
import {
  hexatonicTriadMovement,
  octatonicSeventhMovement,
} from "../src/lib/theory/movement";
import { KEYS } from "../src/lib/theory/scales";
import { noteName, pc } from "../src/lib/theory/note";

const setKey = (pcs: number[]) => [...new Set(pcs)].sort((a, b) => a - b).join(",");

describe("hexatonic — two triads through every inversion", () => {
  it("reproduces Jason's B-flat no-7 classroom movement exactly", () => {
    const movement = hexatonicTriadMovement("Bb", 3);
    expect(movement.scale.notes.map(noteName)).toEqual(["Bb", "C", "D", "Eb", "F", "G"]);
    expect(movement.pairLabels).toEqual(["B♭", "Cm"]);
    expect(movement.steps.map((step) => step.label)).toEqual([
      "B♭", "Cm", "B♭/D", "Cm/E♭", "B♭/F", "Cm/G",
    ]);
    expect(movement.steps.map((step) => step.inversion)).toEqual([
      "root position", "root position",
      "first inversion", "first inversion",
      "second inversion", "second inversion",
    ]);
  });

  it("is exhaustive in all twelve keys and all six rotations", () => {
    for (const key of KEYS) {
      for (let mode = 0; mode < 6; mode++) {
        const movement = hexatonicTriadMovement(key, mode);
        expect(movement.steps, `${key} mode ${mode}`).toHaveLength(6);
        expect(new Set(movement.steps.map((step) => setKey(step.notes.map(pc))).values()).size)
          .toBe(2);
        for (const pair of [0, 1] as const) {
          const steps = movement.steps.filter((step) => step.pair === pair);
          expect(steps.map((step) => step.inversion).sort()).toEqual([
            "first inversion", "root position", "second inversion",
          ]);
          expect(steps.some((step) => step.label.endsWith(`/${step.label.split("/")[0]}`)))
            .toBe(false);
        }
        const scalePcs = new Set(movement.scale.notes.map(pc));
        for (const step of movement.steps)
          expect(step.notes.every((note) => scalePcs.has(pc(note)))).toBe(true);
      }
    }
  });

  it("moves every voice upward by one scale step", () => {
    const { steps } = hexatonicTriadMovement("D", 3);
    for (let i = 1; i < steps.length; i++)
      for (let voice = 0; voice < 3; voice++) {
        const gap = steps[i].voicing[voice] - steps[i - 1].voicing[voice];
        expect(gap).toBeGreaterThan(0);
        expect(gap).toBeLessThanOrEqual(3);
      }
  });

  it("names rotations from the real chord root, even when the pair enters inverted", () => {
    const movement = hexatonicTriadMovement("Bb", 4);
    expect(movement.steps.map((step) => step.label)).toEqual([
      "B♭m", "A♭/C", "B♭m/D♭", "A♭/E♭", "B♭m/F", "A♭",
    ]);
    expect(movement.steps.map((step) => step.inversion)).toEqual([
      "root position", "first inversion", "first inversion",
      "second inversion", "second inversion", "root position",
    ]);
  });
});

describe("symmetric octatonic — two diminished sevenths through every inversion", () => {
  it("splits C whole-half into C diminished and D diminished", () => {
    const movement = octatonicSeventhMovement("C", "whole-half");
    expect(movement.scale.notes.map(noteName)).toEqual(["C", "D", "Eb", "F", "Gb", "Ab", "A", "B"]);
    expect(movement.pairLabels).toEqual(["C°7", "D°7"]);
    expect(movement.steps.map((step) => step.label)).toEqual([
      "C°7", "D°7", "C°7/E♭", "D°7/F", "C°7/G♭", "D°7/A♭", "C°7/A", "D°7/B",
    ]);
    expect(movement.steps[0].aliases).toHaveLength(4);
    expect(movement.steps[1].aliases).toHaveLength(4);
  });

  it("is exhaustive in every key, both rotations and all four inversions", () => {
    for (const key of KEYS) {
      for (const kind of ["whole-half", "half-whole"] as const) {
        const movement = octatonicSeventhMovement(key, kind);
        expect(movement.steps, `${key} ${kind}`).toHaveLength(8);
        expect(new Set(movement.steps.map((step) => setKey(step.notes.map(pc))).values()).size)
          .toBe(2);
        for (const pair of [0, 1] as const) {
          const steps = movement.steps.filter((step) => step.pair === pair);
          expect(steps.map((step) => step.inversion)).toEqual([
            "root position", "first inversion", "second inversion", "third inversion",
          ]);
        }
      }
    }
  });
});
