/**
 * The seven-note parents and the pentatonic, from every one of their notes.
 * Each mode is a rotation of its parent, spelled one letter per degree.
 */
import { describe, expect, it } from "vitest";
import { buildScale, familyById, HARMONIC_MINOR, KEYS, MAJOR, MELODIC_MINOR, modeCount } from "../src/lib/theory/scales";
import { noteName, pc } from "../src/lib/theory/note";

const names = (k: string, f: string, m: number) => buildScale(k, f, m).notes.map(noteName).join(" ");

describe("the modes of the major scale, harmonic minor and melodic minor", () => {
  it("are the rotations of their parent, in every key", () => {
    for (const [id, parent] of [["hepta", MAJOR], ["harm-minor", HARMONIC_MINOR], ["mel-minor", MELODIC_MINOR]] as const)
      for (let m = 0; m < 7; m++) {
        const want = parent.map((_, i) => (parent[(i + m) % 7] - parent[m] + 12) % 12);
        for (const k of KEYS) {
          const s = buildScale(k, id, m);
          expect(s.error).toBeUndefined();
          expect(s.notes.map((n) => (pc(n) - pc(s.notes[0]) + 12) % 12), `${k} ${id}:${m}`).toEqual(want);
          expect(new Set(s.notes.map((n) => n.letter)).size, `${k} ${id}:${m} one letter per degree`).toBe(7);
        }
      }
  });

  it("spell as a player reads them", () => {
    expect(names("D", "hepta", 1)).toBe("D E F G A B C");            // D Dorian
    expect(names("G", "hepta", 2)).toBe("G Ab Bb C D Eb F");        // G Phrygian
    expect(names("F", "hepta", 3)).toBe("F G A B C D E");            // F Lydian
    expect(names("Db", "hepta", 2)).toBe("C# D E F# G# A B");       // no double flats: C♯ Phrygian
    expect(names("A", "harm-minor", 0)).toBe("A B C D E F G#");
    expect(names("E", "harm-minor", 4)).toBe("E F G# A B C D");     // Phrygian dominant
    expect(names("C", "mel-minor", 3)).toBe("C D E F# G A Bb");     // Lydian dominant
    expect(names("G", "mel-minor", 6)).toBe("G Ab Bb Cb Db Eb F");  // altered
    expect(names("C", "harm-minor", 6)).toBe("C Db Eb Fb Gb Ab Bbb"); // the ♭♭7 is a diminished 7th
  });

  it("carry names that match their degrees", () => {
    const deg = (id: string, m: number) => familyById(id).modes![m].degrees;
    expect(deg("hepta", 1)).toBe("1 2 b3 4 5 6 b7");
    expect(deg("hepta", 3)).toBe("1 2 3 #4 5 6 7");
    expect(deg("hepta", 6)).toBe("1 b2 b3 4 b5 b6 b7");
    expect(deg("harm-minor", 4)).toBe("1 b2 3 4 5 b6 b7");
    expect(deg("harm-minor", 6)).toBe("1 b2 b3 b4 b5 b6 bb7");
    expect(deg("mel-minor", 3)).toBe("1 2 3 #4 5 6 b7");
    expect(deg("mel-minor", 6)).toBe("1 b2 b3 b4 b5 b6 b7");
    expect(familyById("hepta").modes!.map((m) => m.name)).toEqual(
      ["Major", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Natural minor", "Locrian"]);
  });

  it("Phrygian dominant is Hijaz, and Ritsusen is Yo, in every key", () => {
    for (const k of KEYS) {
      expect(buildScale(k, "harm-minor", 4).pcs).toEqual(buildScale(k, "hijaz").pcs);
      expect(buildScale(k, "penta", 3).pcs).toEqual(buildScale(k, "yo").pcs);
    }
  });
});

describe("the five modes of the major pentatonic", () => {
  it("are its rotations, spelled from their seven-note parent", () => {
    expect(modeCount(familyById("penta"))).toBe(5);
    expect(names("C", "penta", 0)).toBe("C D E G A");
    expect(names("D", "penta", 1)).toBe("D E G A C");     // suspended
    expect(names("E", "penta", 2)).toBe("E G A C D");     // man gong
    expect(names("G", "penta", 3)).toBe("G A C D E");     // ritsusen
    expect(names("A", "penta", 4)).toBe("A C D E G");     // minor pentatonic
    const deg = familyById("penta").modes!.map((m) => m.degrees);
    expect(deg).toEqual(["1 2 3 5 6", "1 2 4 5 b7", "1 b3 4 b6 b7", "1 2 4 5 6", "1 b3 4 5 b7"]);
  });
});
