/**
 * Regression locks for the 9 August 2026 audit.
 *
 * Each block here failed before that audit and states the musical rule in the
 * form a reader can check by eye, not the implementation that satisfies it.
 */
import { describe, it, expect } from "vitest";

import { KEYS, buildScale, DIATONIC_MODES, buildDiatonic, MAJOR, FAMILIES } from "../src/lib/theory/scales";
import { pc, noteName, letterIndex, LETTERS, Letter } from "../src/lib/theory/note";
import { PAIR_ATLAS, buildAtlasMovement } from "../src/lib/theory/pairAtlas";

const stepL = (l: Letter, k: number) => LETTERS[(letterIndex(l) + k) % 7] as Letter;

/** A triad is spelled as a triad when its letters are root, root+2, root+4. */
const spelledInThirds = (letters: Letter[]) =>
  letters.length === 3 &&
  [...new Set(letters)].length === 3 &&
  letters.some((l) => {
    const want = new Set([l, stepL(l, 2), stepL(l, 4)]);
    return letters.every((x) => want.has(x));
  });

describe("audit: every chord the Pair Atlas prints is spelled as that chord", () => {
  it("spells all twelve entries in all twelve keys with letters a third apart", () => {
    const wrong: string[] = [];
    for (const entry of PAIR_ATLAS) {
      if (entry.voices !== 3) continue;
      for (const key of KEYS) {
        for (const step of buildAtlasMovement(entry, key).steps) {
          if (!spelledInThirds(step.notes.map((n) => n.letter)))
            wrong.push(`${entry.id}/${key} ${step.label} = ${step.notes.map(noteName).join("-")}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("writes Db minor with an Fb, not an E", () => {
    const m = buildAtlasMovement(PAIR_ATLAS.find((e) => e.id === "dorian-pair")!, "Db");
    expect(m.steps[0].notes.map(noteName)).toEqual(["Db", "Fb", "Ab"]);
  });

  it("writes D major with an F#, even when the collection is flat-side", () => {
    const m = buildAtlasMovement(PAIR_ATLAS.find((e) => e.id === "major-pair-semitone")!, "Db");
    const d = m.steps.find((s) => s.label === "D")!;
    expect(d.notes.map(noteName)).toEqual(["D", "F#", "A"]);
  });

  it("still spells the plain keys the obvious way", () => {
    const m = buildAtlasMovement(PAIR_ATLAS.find((e) => e.id === "major-no3")!, "C");
    expect(m.pairLabels.slice().sort()).toEqual(["F", "G"]);
  });
});

describe("audit: no scale asks for a double accidental", () => {
  /*
   * The SYMMETRIC families only. Their letter run is arbitrary — nothing about
   * a whole-tone scale says which six letters it should take — so a double
   * accidental there is always the speller's fault.
   *
   * The diatonic rotations are a different case and are deliberately excluded:
   * Db Phrygian really is Db Ebb Fb Gb Ab Bbb Cb, because its relative major is
   * the theoretical key of Bbb. Those double flats are correct, and writing
   * Db E F# G# A B to dodge them would be worse. The kindness there is to offer
   * C# rather than Db for those two rotations, which is a UI question.
   */
  it("holds for the symmetric families in every key", () => {
    const bad: string[] = [];
    for (const id of ["whole", "aug", "petrushka", "dim-wh", "dim-hw", "messiaen5"])
      for (const key of KEYS) {
        const s = buildScale(key, id, 0);
        if (s.notes.some((n) => Math.abs(n.alt) === 2))
          bad.push(`${id} in ${key}: ${s.notes.map(noteName).join(" ")}`);
      }
    expect(bad).toEqual([]);
  });

  it("skips a letter rather than write B whole-tone as B C# D# E# F## G##", () => {
    expect(buildScale("B", "whole", 0).notes.map(noteName)).toEqual(
      ["B", "C#", "D#", "F", "G", "A"],
    );
  });

  it("leaves the spellings that were already right alone", () => {
    // the b5 and the 5 share a letter, and that is correct
    expect(buildScale("C", "blues", 0).notes.map(noteName)).toEqual(
      ["C", "Eb", "F", "Gb", "G", "Bb"],
    );
    // the b3 and the 3 share a letter, and that is correct too
    expect(buildScale("C", "blues-major", 0).notes.map(noteName)).toEqual(
      ["C", "D", "Eb", "E", "G", "A"],
    );
    expect(buildScale("C", "aug", 0).notes.map(noteName)).toEqual(
      ["C", "D#", "E", "G", "Ab", "B"],
    );
  });
});

describe("audit: the key signature spends every accidental it prints", () => {
  it("never picks a parent that carries a note the scale does not sound", () => {
    const noisy: string[] = [];
    for (const key of KEYS)
      for (const mode of DIATONIC_MODES) {
        const s = buildScale(key, "diatonic", mode.index);
        if (!s.keySignature) continue;
        const used = new Set(s.notes.map((n) => n.letter));
        const chosen = buildDiatonic(s.keySignature, MAJOR)!
          .filter((n) => n.alt !== 0 && !used.has(n.letter));
        // is a cleaner parent available?
        const have = new Set(s.notes.map(pc));
        const better = KEYS.some((root) => {
          const full = buildDiatonic(root, MAJOR);
          if (!full || ![...have].every((p) => full.map(pc).includes(p))) return false;
          return full.filter((n) => n.alt !== 0 && !used.has(n.letter)).length < chosen.length;
        });
        if (better)
          noisy.push(`${key} ${mode.name}: ${s.keySignature} prints ${chosen.map(noteName).join(",")}`);
      }
    expect(noisy).toEqual([]);
  });
});
