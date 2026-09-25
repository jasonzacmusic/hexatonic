/**
 * Locks for the 25 September 2026 theory audit (findings 1–9, 14, 15) and the
 * plain mode names. Every name and every sentence here is checked against the
 * notes the engine actually builds, not against another hand-typed string.
 */
import { describe, it, expect } from "vitest";
import {
  FAMILIES, FAMILY_GROUPS, KEYS, DIATONIC_MODES, MAJOR, buildScale, familyById, familiesIn,
} from "../src/lib/theory/scales";
import { noteName, pc, letterIndex, LETTERS, Letter, intervalVector } from "../src/lib/theory/note";

const names = (key: string, id: string, m = 0) =>
  buildScale(key, id, m).notes.map(noteName).join(" ");
const semisOf = (degrees: string) => degrees.split(" ").map((d) => ({
  "1": 0, b2: 1, "2": 2, b3: 3, "3": 4, "4": 5, b5: 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11,
} as Record<string, number>)[d]);

const MODE_NAMES = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
/** The seven modes of the major scale, as semitones above their own tonic. */
const MODES = MODE_NAMES.map((name, i) => ({
  name,
  semis: MAJOR.map((_, j) => (MAJOR[(i + j) % 7] - MAJOR[i] + 12) % 12),
}));

describe("mode names are computed from the degrees", () => {
  it("each modal name lists exactly the two modes that hold all six degrees", () => {
    for (const m of DIATONIC_MODES) {
      const six = semisOf(m.degrees);
      const holders = MODES.filter((md) => six.every((s) => md.semis.includes(s))).map((md) => md.name);
      expect(holders, m.degrees).toHaveLength(2);
      const [a, b] = m.modal.replace(" hexatonic", "").split("/");
      expect(new Set([a, b]), `${m.degrees}: ${m.modal}`).toEqual(new Set(holders));
    }
  });

  it("each plain name says which degree is missing", () => {
    const missing = (degrees: string) => {
      const six = new Set(degrees.split(" ").map((d) => d.replace("b", "")));
      return ["1", "2", "3", "4", "5", "6", "7"].find((d) => !six.has(d))!;
    };
    for (const m of DIATONIC_MODES) {
      const want = missing(m.degrees);
      expect(m.name, m.degrees).toMatch(new RegExp(`\\(no ${want}(st|nd|rd|th)?\\)`));
    }
  });

  it("the plain names are the agreed ones", () => {
    expect(DIATONIC_MODES.map((m) => m.name)).toEqual([
      "Major (no 4)", "Suspended (no 3rd)", "Dark minor (no 2)",
      "Folk major (no 7)", "Minor (no 6)", "Phrygian (no 5th)",
    ]);
  });

  it("'major' names have a major 3rd and 'minor' names a minor 3rd", () => {
    for (const m of DIATONIC_MODES) {
      const s = semisOf(m.degrees);
      if (/major/i.test(m.name)) expect(s).toContain(4);
      if (/minor|Phrygian/.test(m.name)) expect(s).toContain(3);
      if (/Suspended/.test(m.name)) { expect(s).not.toContain(3); expect(s).not.toContain(4); }
    }
  });

  it("the no-5 rotation keeps the b2 that makes it Phrygian", () => {
    expect(semisOf(DIATONIC_MODES[5].degrees)).toContain(1);
    expect(semisOf(DIATONIC_MODES[5].degrees)).not.toContain(7);
  });

  it("drops the unsourced bluegrass and McCoy Tyner claims", () => {
    const text = JSON.stringify(FAMILIES).toLowerCase();
    expect(text).not.toContain("bluegrass");
    expect(text).not.toContain("mccoy");
    expect(text).not.toContain("rootless");
  });
});

describe("the sentences in the scale data are true", () => {
  it("#3: the no-5 rotation has perfect fifths, just none above its tonic", () => {
    const s = buildScale("C", "diatonic", 5);
    expect(s.pcs).not.toContain(7);
    expect(intervalVector(s.pcs)[4]).toBeGreaterThan(0);
    expect(s.teaching).toContain("above the tonic");
  });

  it("#1: the semitone and whole-step triad pairs give the sets the Petrushka note names", () => {
    const maj = (r: number) => [r, r + 4, r + 7].map((x) => x % 12);
    const degs = (pcs: number[]) => [...new Set(pcs)].sort((a, b) => a - b);
    expect(degs([...maj(0), ...maj(1)])).toEqual([0, 1, 4, 5, 7, 8]);   // 1 b2 3 4 5 b6
    expect(degs([...maj(0), ...maj(2)])).toEqual([0, 2, 4, 6, 7, 9]);   // 1 2 3 #4 5 6
    expect(degs([...maj(0), ...maj(6)])).toEqual(
      [...familyById("petrushka").semis!].sort((a, b) => a - b));
    const note = familyById("petrushka").note!;
    expect(note).toContain("1 ♭2 3 4 5 ♭6");
    expect(note).toContain("1 2 3 ♯4 5 6");
    expect(note).not.toMatch(/augmented and whole-tone/);
  });

  it("#2: Petrushka's second triad is spelled as a triad in every key", () => {
    const L = (l: Letter, k: number) => LETTERS[(letterIndex(l) + k) % 7];
    for (const key of KEYS) {
      const s = buildScale(key, "petrushka", 0);
      const root = s.notes[0];
      const tri = s.notes.filter((n) => [6, 10, 1].includes((pc(n) - pc(root) + 12) % 12));
      expect(tri, key).toHaveLength(3);
      const lowest = tri.find((n) => (pc(n) - pc(root) + 12) % 12 === 6)!;
      const want = new Set([lowest.letter, L(lowest.letter, 2), L(lowest.letter, 4)]);
      expect(tri.every((n) => want.has(n.letter)), `${key}: ${s.notes.map(noteName).join(" ")}`).toBe(true);
    }
  });

  it("#8: iwato is a rotation of hirajoshi, not of in sen", () => {
    const rotations = (semis: number[]) => semis.map((r) =>
      semis.map((x) => (x - r + 12) % 12).sort((a, b) => a - b).join(","));
    const iwato = [...familyById("iwato").semis!].join(",");
    expect(rotations(familyById("hirajoshi").semis!)).toContain(iwato);
    expect(rotations(familyById("insen").semis!)).not.toContain(iwato);
    expect(familyById("iwato").note).toContain("hirajoshi");
  });

  it("#9: Hijaz does not claim to be written the same in every tradition", () => {
    expect(familyById("hijaz").note).not.toContain("same way");
    expect(familyById("hijaz").note).toContain("maqam");
  });

  it("#7: Messiaen mode 5 is gone", () => {
    expect(FAMILIES.some((f) => f.id === "messiaen5")).toBe(false);
  });

  it("the augmented note: 3 major, 3 minor triads, no dominant 7th, three perfect 5ths", () => {
    const s = new Set(buildScale("C", "aug", 0).pcs);
    const has = (r: number, ivs: number[]) => ivs.every((i) => s.has((r + i) % 12));
    const roots = [...s];
    expect(roots.filter((r) => has(r, [0, 4, 7]))).toHaveLength(3);
    expect(roots.filter((r) => has(r, [0, 3, 7]))).toHaveLength(3);
    expect(roots.filter((r) => has(r, [0, 4, 7, 10]))).toHaveLength(0);
    expect(intervalVector([...s])[4]).toBe(3);
  });

  it("whole tone has no perfect fifth anywhere", () => {
    expect(intervalVector(buildScale("C", "whole", 0).pcs)[4]).toBe(0);
  });

  it("C blues and E♭ major blues are the same six notes, as the notes say", () => {
    expect(new Set(buildScale("C", "blues").pcs)).toEqual(new Set(buildScale("Eb", "blues-major").pcs));
    expect(new Set(buildScale("C", "blues-major").pcs)).toEqual(new Set(buildScale("A", "blues").pcs));
  });
});

describe("#14, #15: spellings in flat keys", () => {
  it("fixes the blues in E♭, A♭ and D♭", () => {
    expect(names("Eb", "blues")).toBe("Eb Gb Ab A Bb Db");
    expect(names("Ab", "blues")).toBe("Ab B Db D Eb Gb");
    expect(names("Db", "blues")).toBe("Db E Gb G Ab B");
    expect(names("C", "blues")).toBe("C Eb F Gb G Bb");
  });

  it("respells only the clashing note in the Japanese pentatonics", () => {
    expect(names("Db", "insen")).toBe("Db D Gb Ab Cb");
    expect(names("Db", "hirajoshi")).toBe("Db Eb Fb Ab A");
    expect(names("Eb", "iwato")).toBe("Eb Fb Ab A Db");
  });

  it("spells D♭ and A♭ Phrygian (no 5th), and D♭ Dark minor, from the sharp side", () => {
    expect(names("Db", "diatonic", 5)).toBe("C# D E F# A B");
    expect(names("Ab", "diatonic", 5)).toBe("G# A B C# E F#");
    expect(names("Db", "diatonic", 2)).toBe("C# E F# G# A B");
    expect(buildScale("Db", "diatonic", 5).respelledFrom).toBe("Db");
  });

  it("spells augmented by degree: C E♭ E G A♭ B", () => {
    expect(names("C", "aug")).toBe("C Eb E G Ab B");
  });
});

describe("spelling in all twelve keys", () => {
  const MAIN = FAMILIES.filter((f) => f.kind !== "custom" && f.kind !== "symmetric8");

  it("no double sharps or double flats in any scale a player picks", () => {
    const bad: string[] = [];
    for (const f of MAIN) {
      const modes = f.kind === "rotation" ? DIATONIC_MODES.length : 1;
      for (let m = 0; m < modes; m++)
        for (const k of KEYS) {
          const s = buildScale(k, f.id, m);
          if (s.notes.some((n) => Math.abs(n.alt) === 2)) bad.push(`${k} ${f.id}/${m}: ${names(k, f.id, m)}`);
        }
    }
    expect(bad).toEqual([]);
  });

  it("never mixes sharps and flats, except where the parent key does", () => {
    const bad: string[] = [];
    for (const f of MAIN) {
      if (f.mixOk) continue;
      const modes = f.kind === "rotation" ? DIATONIC_MODES.length : 1;
      for (let m = 0; m < modes; m++)
        for (const k of KEYS) {
          const ns = buildScale(k, f.id, m).notes;
          if (ns.some((n) => n.alt > 0) && ns.some((n) => n.alt < 0)) bad.push(`${k} ${f.id}/${m}: ${names(k, f.id, m)}`);
        }
    }
    expect(bad).toEqual([]);
  });

  it("the diatonic rotations use one letter per note in every key", () => {
    for (const m of DIATONIC_MODES)
      for (const k of KEYS) {
        const ns = buildScale(k, "diatonic", m.index).notes;
        expect(new Set(ns.map((n) => n.letter)).size, `${k} ${m.name}`).toBe(6);
      }
  });

  it("the blues, major blues and whole tone avoid Cb, Fb, E# and B#", () => {
    for (const id of ["blues", "blues-major", "whole"])
      for (const k of KEYS) {
        const white = buildScale(k, id, 0).notes.filter((n) =>
          (n.alt === -1 && "CF".includes(n.letter)) || (n.alt === 1 && "EB".includes(n.letter)));
        expect(white, `${k} ${id}: ${names(k, id)}`).toEqual([]);
      }
  });

  it("custom sets pick the lean that does not mix: B with a minor 3rd is B C# D E F# A", () => {
    expect(buildScale("B", "custom", 0, [0, 2, 3, 5, 7, 10]).notes.map(noteName).join(" "))
      .toBe("B C# D E F# A");
  });
});

describe("the red note is the degree the name says is missing", () => {
  const LETTER_STEP: Record<string, number> = { "2": 1, b3: 2, "4": 3, "5": 4, "6": 5, "7": 6 };
  it("in every key and every rotation, on its own letter", () => {
    const bad: string[] = [];
    for (const m of DIATONIC_MODES)
      for (const k of KEYS) {
        const s = buildScale(k, "diatonic", m.index);
        const t = s.notes[0];
        const r = s.removed!;
        const semis = (pc(r) - pc(t) + 12) % 12;
        const letter = LETTERS[(letterIndex(t.letter) + LETTER_STEP[m.missing]) % 7];
        if (semis !== semisOf(m.missing)[0] || r.letter !== letter || Math.abs(r.alt) > 1)
          bad.push(`${k} ${m.name}: removed ${noteName(r)}`);
        expect(m.name).toContain(`no ${m.missing.replace("b", "")}`);
      }
    expect(bad).toEqual([]);
  });

  it("D♭ major (no 4) has G♭ removed, not G", () => {
    expect(noteName(buildScale("Db", "diatonic", 0).removed!)).toBe("Gb");
    expect(noteName(buildScale("G", "diatonic", 0).removed!)).toBe("C");
    expect(noteName(buildScale("F", "diatonic", 0).removed!)).toBe("Bb");
  });
});

describe("the Sounds page's cross-reference line", () => {
  it("Minor (no 6) is minor pentatonic + 2; Major (no 4) is major pentatonic + 7", () => {
    const set = (d: string) => new Set(semisOf(d));
    const minorPenta = [0, 3, 5, 7, 10], majorPenta = [0, 2, 4, 7, 9];
    expect(set(DIATONIC_MODES[4].degrees)).toEqual(new Set([...minorPenta, 2]));
    expect(set(DIATONIC_MODES[0].degrees)).toEqual(new Set([...majorPenta, 11]));
  });
});

describe("groups", () => {
  it("every family has a known group", () => {
    const ids = new Set(FAMILY_GROUPS.map((g) => g.id));
    for (const f of FAMILIES) expect(ids.has(f.group), f.id).toBe(true);
  });

  it("the main groups hold only six-note scales", () => {
    for (const g of ["remove", "pentatonic", "symmetric", "custom"] as const)
      for (const f of familiesIn(g)) expect(f.size, f.id).toBe(6);
  });

  it("Prometheus, the Japanese pentatonics and Hijaz sit under 'Beyond six notes'", () => {
    expect(familiesIn("beyond").map((f) => f.id)).toEqual(
      ["prometheus", "hirajoshi", "insen", "iwato", "kumoi", "yo", "hijaz"]);
  });
});
