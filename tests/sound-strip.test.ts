/**
 * The home "Tap to hear" strip plays eight six-note sounds in any of the twelve keys.
 * These lock what a player sees on it: every sound builds, every note is
 * spelled with at most one accidental, the notes shown are the notes played,
 * and the removed note of each one-note-out scale is the right degree.
 */
import { describe, it, expect } from "vitest";
import { KEYS } from "../src/lib/theory/scales";
import { midi, noteName, pc } from "../src/lib/theory/note";
import { stripSounds, STRIP_DEFS } from "../src/lib/theory/strip";

const names = (key: string, id: string) =>
  stripSounds(key).find((s) => s.id === id)!.scale.notes.map(noteName).join(" ");

describe("home sound strip", () => {
  it("builds all six sounds in all twelve keys with no double accidentals", () => {
    const bad: string[] = [];
    for (const k of KEYS)
      for (const s of stripSounds(k)) {
        if (s.scale.error || s.scale.notes.length !== 6) bad.push(`${k} ${s.id}: ${s.scale.error ?? s.scale.notes.length}`);
        for (const n of s.scale.notes) if (Math.abs(n.alt) > 1) bad.push(`${k} ${s.id}: ${noteName(n)}`);
      }
    expect(bad).toEqual([]);
    expect(stripSounds("G")).toHaveLength(STRIP_DEFS.length);
  });

  it("plays exactly the notes it shows, up to the octave", () => {
    for (const k of KEYS)
      for (const s of stripSounds(k)) {
        expect(s.midis.slice(0, 6)).toEqual(s.scale.notes.map(midi));
        expect(s.midis[6]).toBe(s.midis[0] + 12);
        for (let i = 1; i < s.midis.length; i++) expect(s.midis[i]).toBeGreaterThan(s.midis[i - 1]);
      }
  });

  it("starts every sound on the key's own tonic pitch", () => {
    const tonicPc: Record<string, number> = { C: 0, G: 7, D: 2, A: 9, E: 4, B: 11, "F#": 6, Db: 1, Ab: 8, Eb: 3, Bb: 10, F: 5 };
    for (const k of KEYS)
      for (const s of stripSounds(k)) expect(pc(s.scale.notes[0]), `${k} ${s.id}`).toBe(tonicPc[k]);
  });

  it("spells the default key the way a player reads it", () => {
    expect(names("G", "major")).toBe("G A B D E F#");
    expect(names("G", "minor")).toBe("G A Bb C D F");
    expect(names("G", "blues")).toBe("G Bb C Db D F");
    expect(names("G", "major-blues")).toBe("G A Bb B D E");
    expect(names("G", "sunday")).toBe("G A B C D E");
    expect(names("G", "prometheus")).toBe("G A B C# E F");
  });

  it("spells flat keys with flats and sharp keys with sharps", () => {
    expect(names("Eb", "major")).toBe("Eb F G Bb C D");
    expect(names("E", "minor")).toBe("E F# G A B D");
    expect(names("F#", "major")).toBe("F# G# A# C# D# E#");
    expect(names("Db", "major")).toBe("Db Eb F Ab Bb C");
    expect(names("Ab", "minor")).toBe("Ab Bb Cb Db Eb Gb");
  });

  it("shows the 4 missing from major and the 6 missing from minor, in every key", () => {
    for (const k of KEYS) {
      const [maj, min] = stripSounds(k);
      const semis = (s: typeof maj) => ((pc(s.scale.removed!) - pc(s.scale.notes[0])) % 12 + 12) % 12;
      expect(semis(maj), `${k} major`).toBe(5);
      // Minor (no 6) sits between Dorian and Aeolian; the red note is the 6.
      expect(semis(min), `${k} minor`).toBe(9);
    }
  });

  it("links each sound to Practice in the chosen key", () => {
    const by = (id: string) => stripSounds("Eb").find((s) => s.id === id)!;
    const [maj, min, blues] = [by("major"), by("minor"), by("blues")];
    expect(maj.practice).toBe("/practice?k=Eb&f=diatonic&m=0");
    expect(min.practice).toBe("/practice?k=Eb&f=diatonic&m=4");
    expect(blues.practice).toBe("/practice?k=Eb&f=blues");
  });

  it("includes the Sunday Scale under its own name", () => {
    const sunday = stripSounds("G").find((s) => s.id === "sunday")!;
    expect(sunday.name).toBe("Sunday Scale (no 7)");
    expect(sunday.practice).toBe("/practice?k=G&f=diatonic&m=3");
  });

  it("prints the whole strip in every key (read by eye in the test log)", () => {
    const rows = KEYS.map((k) => `${k.padEnd(3)} ${stripSounds(k).map((s) =>
      s.scale.notes.map(noteName).join(" ") + (s.scale.respelledFrom ? ` (from ${s.scale.tonic})` : "")).join(" | ")}`);
    if (process.env.STRIP_LOG) console.log(rows.join("\n"));
    expect(rows).toHaveLength(12);
  });
});
