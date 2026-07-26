/**
 * Improvisation harmony.
 *
 * The bug these tests exist to prevent: building chords by taking "every other
 * scale degree". In a six-note scale that is NOT thirds — C D E G A B gives
 * C–E–A, which is A minor, not C. It is the app's own Theorem 5, and the first
 * implementation of the vamp engine walked straight into it.
 */
import { describe, it, expect } from "vitest";
import { buildScale } from "../src/lib/theory/scales";
import { voiceDegree, buildVamp, vampById, vampsFor, guideTones, VAMPS } from "../src/lib/theory/vamps";
import { pc } from "../src/lib/theory/note";

const major = buildScale("C", "diatonic", 0);   // C D E G A B
const minor = buildScale("C", "diatonic", 4);   // C D Eb F G Bb

describe("chords are rooted where they claim to be", () => {
  it("degree 0 of C Ionian/Lydian is a C chord, NOT A minor", () => {
    const v = voiceDegree(major, 0, "spread");
    expect(v.label.startsWith("C")).toBe(true);
    expect(v.label).not.toBe("Am");
    expect(v.chordTones).toContain(0);           // C must be in it
  });
  it("degree 0 of C Dorian/Aeolian is a C minor chord", () => {
    const v = voiceDegree(minor, 0, "spread");
    expect(v.label.startsWith("C")).toBe(true);
    expect(v.chordTones).toEqual(expect.arrayContaining([0, 3, 7])); // C Eb G
  });
  it("every degree of every mode names a chord rooted on that degree", () => {
    for (let mode = 0; mode < 6; mode++) {
      const s = buildScale("C", "diatonic", mode);
      for (let d = 0; d < 6; d++) {
        const v = voiceDegree(s, d, "spread");
        const rootPc = pc(s.notes[d]);
        expect(v.chordTones, `mode ${mode} degree ${d} (${v.label})`).toContain(rootPc);
      }
    }
  });
});

describe("chords use only notes the scale actually has", () => {
  it("no vamp in any key or mode can sound a removed note", () => {
    for (const key of ["C", "F#", "Eb", "A"]) {
      for (let mode = 0; mode < 6; mode++) {
        const s = buildScale(key, "diatonic", mode);
        const allowed = new Set(s.pcs);
        const forbidden = s.removed ? pc(s.removed) : -1;
        for (const vamp of vampsFor(s)) {
          for (const style of ["shell", "rootless", "quartal", "spread"] as const) {
            for (const step of buildVamp(s, vamp, style)) {
              for (const m of [...step.chord.voicing, step.chord.bass]) {
                const p = ((m % 12) + 12) % 12;
                expect(allowed.has(p), `${key} m${mode} ${vamp.id}/${style} played ${p}`).toBe(true);
                expect(p).not.toBe(forbidden);
              }
            }
          }
        }
      }
    }
  });
});

describe("quartal voicings really are quartal", () => {
  it("stacking three degrees gives only perfect fourths and fifths", () => {
    const v = voiceDegree(major, 0, "quartal");
    for (let i = 1; i < v.voicing.length; i++) {
      const gap = v.voicing[i] - v.voicing[i - 1];
      expect([5, 7]).toContain(gap % 12 === 0 ? 12 : gap % 12);
    }
  });
});

describe("vamp selection and guide tones", () => {
  it("offers the minor-only vamp only in minor modes", () => {
    expect(vampsFor(major).some((v) => v.id === "i-VII")).toBe(false);
    expect(vampsFor(minor).some((v) => v.id === "i-VII")).toBe(true);
  });
  it("guide tones split the scale with nothing lost or duplicated", () => {
    const chord = voiceDegree(major, 0, "spread");
    const { chordTones, colourTones } = guideTones(major, chord);
    expect(chordTones.length + colourTones.length).toBe(major.notes.length);
    const overlap = chordTones.filter((a) => colourTones.some((b) => pc(a) === pc(b)));
    expect(overlap).toHaveLength(0);
  });
  it("every declared vamp builds without throwing, in every mode", () => {
    for (let mode = 0; mode < 6; mode++) {
      const s = buildScale("C", "diatonic", mode);
      for (const v of VAMPS)
        expect(() => buildVamp(s, v, "rootless"), `${v.id} mode ${mode}`).not.toThrow();
    }
  });
});
