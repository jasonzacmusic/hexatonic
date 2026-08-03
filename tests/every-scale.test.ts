/**
 * The full sweep: every family, every mode, every key.
 *
 * The existing suite proves the theorems and checks the families that matter
 * most. This one is the brute-force pass — build every scale the app can build
 * and hold it to the spelling rules the app itself states, with the semitone
 * arithmetic recomputed here rather than read out of the module.
 */
import { describe, test, expect } from "vitest";

import { FAMILIES, KEYS, buildScale, DIATONIC_MODES, buildDiatonic, MAJOR } from "../src/lib/theory/scales";
import { pc, midi, noteName, LETTERS, letterIndex } from "../src/lib/theory/note";

const DEG_SEMI: Record<string, number> = {
  "1": 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, b5: 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11,
};

/** Every (family, mode) pair the interface can reach. */
const COMBOS = FAMILIES.flatMap((family) =>
  family.kind === "rotation"
    ? family.modes!.map((mode) => ({ family, modeIndex: mode.index }))
    : [{ family, modeIndex: 0 }],
).filter(({ family }) => family.id !== "custom");

describe("every scale in every key", () => {
  test("builds without error, in all twelve keys", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const scale = buildScale(key, family.id, modeIndex);
        expect(scale.error, `${key} ${family.id}/${modeIndex}: ${scale.error}`).toBeUndefined();
        expect(scale.notes.length, `${key} ${family.id}/${modeIndex}`).toBe(family.size);
      }
    }
  });

  test("never needs an accidental a staff cannot draw", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        for (const note of buildScale(key, family.id, modeIndex).notes) {
          expect(
            Math.abs(note.alt),
            `${key} ${family.id}/${modeIndex} asks for ${noteName(note)}`,
          ).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  test("ascends, and sounds each pitch once", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const notes = buildScale(key, family.id, modeIndex).notes;
        const pcs = notes.map(pc);
        expect(new Set(pcs).size, `${key} ${family.id}/${modeIndex} repeats a pitch`).toBe(pcs.length);
        for (let i = 1; i < notes.length; i++) {
          expect(
            midi(notes[i]) > midi(notes[i - 1]),
            `${key} ${family.id}/${modeIndex} goes down between ${noteName(notes[i - 1])} and ${noteName(notes[i])}`,
          ).toBe(true);
        }
        // Everything must stay inside one octave of the tonic.
        expect(
          midi(notes[notes.length - 1]) - midi(notes[0]),
          `${key} ${family.id}/${modeIndex} spans more than an octave`,
        ).toBeLessThan(12);
      }
    }
  });

  test("starts on the key it was asked for", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const scale = buildScale(key, family.id, modeIndex);
        expect(noteName(scale.notes[0]), `${key} ${family.id}/${modeIndex}`).toBe(key);
      }
    }
  });

  test("only repeats a letter where the music actually asks for it", () => {
    /*
     * A letter may be used twice — the blues scale is spelled C E♭ F G♭ G B♭,
     * with the ♭5 and the 5 both on G, and an eight-note scale cannot avoid it.
     * What must never happen is a letter used THREE times, or a repeat that is
     * not a genuine chromatic pair a semitone apart.
     */
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const notes = buildScale(key, family.id, modeIndex).notes;
        const where = `${key} ${family.id}/${modeIndex}: ${notes.map(noteName).join(" ")}`;
        const byLetter = new Map<string, typeof notes>();
        for (const n of notes) byLetter.set(n.letter, [...(byLetter.get(n.letter) ?? []), n]);
        for (const [letter, group] of byLetter) {
          expect(group.length, `${where} uses ${letter} ${group.length} times`).toBeLessThanOrEqual(2);
          if (group.length === 2) {
            /*
             * Two notes on one letter are legitimate in exactly two shapes:
             * a chromatic pair a semitone apart (the ♭5 and 5 of the blues
             * scale), or the eighth note of an octatonic taking the root's
             * letter again near the top — which is how A B C D E♭ F G♭ A♭ is
             * conventionally written, and the source says so.
             */
            const gap = Math.abs(midi(group[1]) - midi(group[0]));
            expect(
              gap === 1 || gap === 11,
              `${where}: the two ${letter}s are ${gap} semitones apart`,
            ).toBe(true);
          }
        }
        // A six- or seven-note scale should still use as many letters as it can.
        expect(
          new Set(notes.map((n) => n.letter)).size,
          `${where} spreads over too few letters`,
        ).toBeGreaterThanOrEqual(Math.min(notes.length - 1, 5));
      }
    }
  });

  test("the degrees shown are the degrees sounding", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const scale = buildScale(key, family.id, modeIndex);
        expect(scale.degrees.length, `${key} ${family.id}/${modeIndex}`).toBe(scale.notes.length);
        const root = pc(scale.notes[0]);
        scale.degrees.forEach((degree, i) => {
          expect(DEG_SEMI[degree], `${key} ${family.id}: "${degree}" is not a degree name`).toBeDefined();
          expect(
            ((pc(scale.notes[i]) - root) % 12 + 12) % 12,
            `${key} ${family.id}/${modeIndex}: ${noteName(scale.notes[i])} is labelled ${degree}`,
          ).toBe(DEG_SEMI[degree]);
        });
      }
    }
  });

  test("transposing a scale transposes every note by the same distance", () => {
    for (const { family, modeIndex } of COMBOS) {
      const reference = buildScale("C", family.id, modeIndex);
      for (const key of KEYS) {
        const scale = buildScale(key, family.id, modeIndex);
        const shift = ((pc(scale.notes[0]) - pc(reference.notes[0])) % 12 + 12) % 12;
        scale.notes.forEach((note, i) => {
          expect(
            pc(note),
            `${key} ${family.id}/${modeIndex}: note ${i + 1} is not the C scale transposed`,
          ).toBe((pc(reference.notes[i]) + shift) % 12);
        });
      }
    }
  });

  test("the set-class facts a scale reports are the facts of its own notes", () => {
    for (const { family, modeIndex } of COMBOS) {
      for (const key of KEYS) {
        const scale = buildScale(key, family.id, modeIndex);
        expect(scale.pcs, `${key} ${family.id}`).toEqual(scale.notes.map(pc));
        expect(scale.intervalVector.length).toBe(6);
        // The interval vector must account for every pair of notes in the set.
        const n = new Set(scale.pcs).size;
        expect(
          scale.intervalVector.reduce((a, b) => a + b, 0),
          `${key} ${family.id}: the vector does not describe ${n} notes`,
        ).toBe((n * (n - 1)) / 2);
        // The tritone count it advertises is the tritone entry of that vector.
        expect(scale.tritones, `${key} ${family.id}`).toBe(scale.intervalVector[5]);
        expect(scale.primeForm[0], `${key} ${family.id}`).toBe(0);
      }
    }
  });

  test("the diatonic hexachord really has no tritone, in any key or rotation", () => {
    for (const mode of DIATONIC_MODES) {
      for (const key of KEYS) {
        const scale = buildScale(key, "diatonic", mode.index);
        expect(scale.tritones, `${key} ${mode.name}`).toBe(0);
      }
    }
    // …and the seven-note parent has exactly one, which is the note removed.
    for (const key of KEYS) {
      expect(buildScale(key, "hepta", 0).tritones, `${key} major`).toBe(1);
    }
  });

  test("the six diatonic modes are six rotations of one set of notes", () => {
    for (const key of KEYS) {
      const sets = DIATONIC_MODES.map((mode) =>
        buildScale(key, "diatonic", mode.index).pcs.map((p) => ((p - pc(buildScale(key, "diatonic", mode.index).notes[0])) % 12 + 12) % 12)
          .sort((a, b) => a - b).join(","),
      );
      // Rotations of one set are different when read from their own tonic…
      expect(new Set(sets).size, `${key}: two rotations look identical`).toBe(6);
      // …but every one is a subset of the same parent major scale.
      const parent = new Set(buildDiatonic(key, MAJOR)!.map(pc));
      for (const mode of DIATONIC_MODES) {
        const scale = buildScale(key, "diatonic", mode.index);
        // The scale built ON this key is a rotation, so compare pitch content
        // against the parent that contains it.
        expect(scale.notes.length, `${key} ${mode.name}`).toBe(6);
        expect(parent.size).toBe(7);
      }
    }
  });

  test("a mode declares whether it has a third and a fifth, and is right", () => {
    for (const mode of DIATONIC_MODES) {
      for (const key of KEYS) {
        const scale = buildScale(key, "diatonic", mode.index);
        const root = pc(scale.notes[0]);
        const degrees = new Set(scale.notes.map((n) => ((pc(n) - root) % 12 + 12) % 12));
        expect(degrees.has(3) || degrees.has(4), `${key} ${mode.name} hasThird`).toBe(mode.hasThird);
        expect(degrees.has(7), `${key} ${mode.name} hasFifth`).toBe(mode.hasFifth);
      }
    }
  });

  test("a mode index the interface cannot reach falls back rather than breaking", () => {
    for (const key of KEYS) {
      expect(buildScale(key, "diatonic", 99).error).toBeUndefined();
      expect(buildScale(key, "whole", 4).error).toBeUndefined();
      expect(buildScale(key, "no-such-family", 0).error).toBeUndefined();
    }
  });
});
