/**
 * The symmetrical six-note scales, and the augmented and whole-tone chords.
 * Every count here is computed, not typed: the five scales are found by
 * trying all 924 six-note sets.
 */
import { describe, it, expect } from "vitest";
import { buildScale, familiesIn, KEYS } from "../src/lib/theory/scales";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { noteName, notePretty, pc } from "../src/lib/theory/note";
import {
  repeatsEvery, symmetricHexachordClasses, symmetricTriadLine, symmetryLine, transpositionClass,
} from "../src/lib/theory/symmetric";
import { sixNoteScales } from "../src/lib/theory/pairAtlas";
import { ownSpellingFirst } from "../src/app/harmony/scaleOptions";

const names = (k: string, f: string) => buildScale(k, f, 0).notes.map(notePretty).join(" ");

describe("exactly five six-note scales repeat evenly inside the octave", () => {
  it("an exhaustive search of all 924 six-note sets finds exactly five shapes", () => {
    let sixes = 0;
    for (let m = 0; m < 4096; m++) if ([...Array(12).keys()].filter((i) => m & (1 << i)).length === 6) sixes++;
    expect(sixes).toBe(924);
    expect(symmetricHexachordClasses()).toEqual([
      "0,1,2,6,7,8",   // Messiaen mode 5
      "0,1,3,6,7,9",   // no common name (Petrushka upside down)
      "0,1,4,5,8,9",   // augmented
      "0,1,4,6,7,10",  // Petrushka
      "0,2,4,6,8,10",  // whole tone
    ]);
  });

  it("the Symmetrical group is exactly those five, one family each", () => {
    const fams = familiesIn("symmetric");
    expect(fams.map((f) => f.id)).toEqual(["whole", "aug", "petrushka", "messiaen5", "tritone-minor"]);
    expect(fams.map((f) => transpositionClass(buildScale("G", f.id, 0).pcs)).sort())
      .toEqual(symmetricHexachordClasses());
    expect(fams.every((f) => f.size === 6)).toBe(true);
  });

  it("whole tone 2, augmented 4, the other three 6 different transpositions", () => {
    const count = (f: string) => repeatsEvery(buildScale("C", f, 0).pcs);
    expect(count("whole")).toBe(2);
    expect(count("aug")).toBe(4);
    expect(count("petrushka")).toBe(6);
    expect(count("messiaen5")).toBe(6);
    expect(count("tritone-minor")).toBe(6);
    // and it really is that many different sets across the twelve keys
    for (const f of ["whole", "aug", "petrushka", "messiaen5", "tritone-minor"]) {
      const sets = new Set(KEYS.map((k) => [...buildScale(k, f, 0).pcs].sort((a, b) => a - b).join(",")));
      expect(sets.size, f).toBe(count(f));
    }
    // nothing else in the app's six-note menu repeats
    for (const f of ["blues", "blues-major", "prometheus", "mixo"]) expect(repeatsEvery(buildScale("C", f, 0).pcs)).toBe(12);
    expect(symmetryLine(buildScale("G", "aug", 0).pcs)).toBe("Repeats every major third: only 4 different ones exist.");
  });

  it("spells them in G as class writes them", () => {
    expect(names("G", "whole")).toBe("G A B C♯ D♯ F");
    expect(names("G", "aug")).toBe("G A♯ B D E♭ F♯");
    expect(names("G", "petrushka")).toBe("G A♭ B D♭ D F");
    expect(names("G", "messiaen5")).toBe("G A♭ C C♯ D F♯");
    expect(names("G", "tritone-minor")).toBe("G A♭ B♭ C♯ D E");
  });

  it("the no-common-name scale is G minor + C♯ minor, a tritone apart, in every key", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "tritone-minor", 0);
      const t = pc(s.notes[0]);
      const minor = (r: number) => [r, r + 3, r + 7].map((x) => ((x % 12) + 12) % 12);
      const all = new Set([...minor(t), ...minor(t + 6)]);
      expect([...all].sort((a, b) => a - b), k).toEqual([...s.pcs].sort((a, b) => a - b));
    }
  });
});

describe("augmented = two augmented triads", () => {
  const augTriads = (k: string) => {
    const s = buildScale(k, "aug", 0);
    return ownSpellingFirst(tertianOnly(findChords(s.notes, [3])), s.notes).chords;
  };

  it("in G: two augmented chords (G B D♯ and D F♯ A♯), plus major and minor on G, B and E♭", () => {
    const tri = augTriads("G");
    expect(tri.length).toBe(8);
    const aug = tri.filter((c) => c.names[0].symbol.endsWith("aug"));
    expect(aug.map((c) => c.names[0].notes.join(" ")).sort()).toEqual(["D F# A#", "G B D#"]);
    expect(tri.filter((c) => /^[A-G][b#]?$/.test(c.names[0].symbol)).length).toBe(3);
    expect(tri.filter((c) => /^[A-G][b#]?m$/.test(c.names[0].symbol)).length).toBe(3);
    expect(symmetricTriadLine("aug", buildScale("G", "aug", 0).notes))
      .toBe("The augmented scale holds two augmented chords, plus major and minor chords on G, B and E♭.");
  });

  it("G+ never shows E♭, and the tonic's augmented chord is named from the tonic, in all twelve keys", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "aug", 0);
      const tonic = noteName(s.notes[0]);
      const onTonic = augTriads(k).find((c) => c.pcs.includes(pc(s.notes[0])) && c.names[0].symbol.endsWith("aug"))!;
      const lead = onTonic.names[0];
      if (lead.root === tonic) {
        // spelled as a triad from the tonic: two letters up, then two more
        expect(lead.notes.length).toBe(3);
        expect(lead.notes[0]).toBe(tonic);
      }
      if (k === "G") expect(lead.notes).toEqual(["G", "B", "D#"]);
    }
  });

  it("Pairs: G+ + D+ is G B D♯ with D F♯ A♯, never G B E♭", () => {
    const aug = sixNoteScales("G").find((s) => s.familyId === "aug")!;
    const pair = aug.pairs.find((p) => p.shapes.every((s) => s.quality === "aug"))!;
    expect(pair.shapes.map((s) => s.notes.map(noteName).join(" "))).toEqual(["G B D#", "D F# A#"]);
    for (const p of aug.pairs) for (const sh of p.shapes)
      if (sh.symbol === "G+") expect(sh.notes.map(noteName)).not.toContain("Eb");
    expect(aug.pairs.length).toBe(4);
    // the other three pairs are a major and a minor chord, roots on G, B and E♭
    expect(aug.pairs.map((p) => p.symbol).sort()).toEqual(["E♭ + Bm", "G + E♭m", "G+ + D+", "Gm + B"]);
  });

  it("every key: the line counts two augmented chords and three roots", () => {
    for (const k of KEYS) {
      const line = symmetricTriadLine("aug", buildScale(k, "aug", 0).notes)!;
      expect(line, k).toMatch(/^The augmented scale holds two augmented chords, plus major and minor chords on \S+, \S+ and \S+\.$/);
    }
  });
});

describe("whole tone: only two augmented triads, each from three roots", () => {
  it("in G: G B D♯ and A C♯ E♯ (the scale writes F)", () => {
    const s = buildScale("G", "whole", 0);
    const tri = tertianOnly(findChords(s.notes, [3]));
    expect(tri.length).toBe(2);
    expect(tri.every((c) => c.names.every((n) => n.symbol.endsWith("aug")))).toBe(true);
    expect(tri.every((c) => c.names.length >= 2)).toBe(true);
    expect(symmetricTriadLine("whole", s.notes)).toBe(
      "Whole tone holds only two three-note chords, both augmented: G+ (G B D♯) and A+ (A C♯ E♯; in the scale E♯ is written F). " +
      "Each is one chord seen from three roots: G+ = B+ = D♯+ and A+ = C♯+ = F+.");
  });

  it("every key: exactly two triads, both augmented, and the line says so", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "whole", 0);
      const tri = tertianOnly(findChords(s.notes, [3]));
      expect(tri.length, k).toBe(2);
      expect(symmetricTriadLine("whole", s.notes), k).toMatch(/^Whole tone holds only two three-note chords, both augmented: .+ = .+ = .+ and .+ = .+ = .+\.$/);
    }
  });

  it("says nothing for scales it is not about", () => {
    expect(symmetricTriadLine("blues", buildScale("G", "blues", 0).notes)).toBeNull();
  });
});
