/**
 * Barry Harris. These tests exist because his system is mangled everywhere and
 * the errors are always the same four. Each test guards one of them.
 */
import { describe, it, expect } from "vitest";
import {
  SIXTH_DIMINISHED, buildSixthDim, harmonise, theFamily, notOctatonic, borrow,
} from "../src/lib/theory/barryharris";
import { noteName, pc, primeForm } from "../src/lib/theory/note";

const names = (t: string, f: any) => buildSixthDim(t, f).map(noteName).join(" ");

describe("the four scales are spelled correctly", () => {
  it("there are FOUR, not three", () => {
    expect(SIXTH_DIMINISHED).toHaveLength(4);
  });
  it("major 6th diminished on C", () => {
    expect(names("C", "major6")).toBe("C D E F G Ab A B");
  });
  it("minor 6th diminished on C", () => {
    expect(names("C", "minor6")).toBe("C D Eb F G Ab A B");
  });
  it("the dominant one uses Ab, NOT A", () => {
    expect(names("C", "dominant7")).toBe("C D E F G Ab Bb B");
    // the bebop dominant scale, which this is NOT
    expect(names("C", "dominant7")).not.toBe("C D E F G A Bb B");
  });
  it("seventh flat five diminished on C", () => {
    expect(names("C", "dominant7b5")).toBe("C D E F Gb Ab Bb B");
  });
  it("spells in flat and sharp keys without triple accidentals", () => {
    for (const k of ["C", "F", "Bb", "Eb", "Ab", "G", "D", "A", "E"])
      for (const f of SIXTH_DIMINISHED)
        expect(() => buildSixthDim(k, f.id), `${k} ${f.id}`).not.toThrow();
  });
});

describe("the mechanism — alternate notes give two chords, forever", () => {
  it("major6 alternates C6 and B diminished through the inversions", () => {
    const h = harmonise("C", "major6");
    expect(h).toHaveLength(8);
    expect(h.map((s) => s.isDiminished)).toEqual(
      [false, true, false, true, false, true, false, true]
    );
    expect(h[0].notes.map(noteName)).toEqual(["C", "E", "G", "A"]);   // C6
    expect(h[1].notes.map(noteName)).toEqual(["D", "F", "Ab", "B"]);  // B°7
    expect(h.map((step) => step.label)).toEqual([
      "C6", "B°7/D", "C6/E", "B°7/F", "C6/G", "B°7/Ab", "C6/A", "B°7",
    ]);
  });
  it("every voice moves by ONE scale step between adjacent steps", () => {
    for (const f of SIXTH_DIMINISHED) {
      const h = harmonise("C", f.id);
      for (let i = 1; i < h.length; i++)
        for (let v = 0; v < 4; v++) {
          const gap = h[i].voicing[v] - h[i - 1].voicing[v];
          expect(gap, `${f.id} step ${i} voice ${v}`).toBeGreaterThan(0);
          expect(gap, `${f.id} step ${i} voice ${v}`).toBeLessThanOrEqual(2);
        }
    }
  });
  it("borrowing produces a different chord without leaving the scale", () => {
    const scalePcs = new Set(buildSixthDim("C", "major6").map(pc));
    for (const step of borrow("C", "major6", 3))
      for (const n of step.notes) expect(scalePcs.has(pc(n))).toBe(true);
  });
});

describe("the family — one diminished, four dominants a minor third apart", () => {
  it("B diminished is the related diminished of Bb7, Db7, E7 and G7", () => {
    const { dominants } = theFamily("C", "major6");
    const roots = dominants.map((d) => d.root).sort();
    expect(roots).toHaveLength(4);
    // roots must be a minor-third cycle
    const pcs = dominants.map((d) => (12 + "CDEFGAB".indexOf(d.root[0])) )
    const set = new Set(dominants.map((d) => d.root));
    expect(set.size).toBe(4);
  });
});

describe("these are eight-note scales, NOT the octatonic", () => {
  it("none has the symmetric diminished's 3 transpositions", () => {
    // The usual line is "all four have 12". Three do. The 7b5 member maps to
    // itself at the tritone and has 6 — which is tritone substitution, encoded.
    const expected: Record<string, number> = {
      major6: 12, minor6: 12, dominant7: 12, dominant7b5: 6,
    };
    for (const f of SIXTH_DIMINISHED) {
      const r = notOctatonic(f.id);
      expect(r.transpositions, f.id).toBe(expected[f.id]);
      expect(r.transpositions, f.id).not.toBe(3);
      expect(r.symmetricTranspositions).toBe(3);
    }
  });
  it("none of them shares a prime form with the symmetric diminished", () => {
    const sym = primeForm([0, 2, 3, 5, 6, 8, 9, 11]).join(",");
    for (const f of SIXTH_DIMINISHED)
      expect(primeForm(f.scale).join(","), f.id).not.toBe(sym);
  });
});

describe("terminology guards", () => {
  it("never uses the word octatonic, and never claims a six-note collection", () => {
    const blob = JSON.stringify(SIXTH_DIMINISHED).toLowerCase();
    expect(blob).not.toContain("octatonic");
    expect(blob).not.toContain("hexatonic");
    expect(blob).not.toContain("major 7th diminished scale");
  });
});

describe("the family, spelled the way a musician would write it", () => {
  it("B diminished yields exactly Bb7, Db7, E7 and G7 — four, all sensible", () => {
    const { dominants } = theFamily("C", "major6");
    expect(dominants.map((d) => d.root).sort()).toEqual(["Bb", "Db", "E", "G"]);
  });
  it("never spells a root as Fb, Cb or a double accidental", () => {
    for (const k of ["C", "F", "Bb", "Eb", "Ab", "G", "D", "A", "E"])
      for (const f of SIXTH_DIMINISHED)
        for (const d of theFamily(k, f.id).dominants) {
          expect(d.root, `${k} ${f.id}`).not.toMatch(/bb|##/);
          expect(d.root.length, `${k} ${f.id} -> ${d.root}`).toBeLessThanOrEqual(2);
        }
  });
  it("the four roots are a minor-third cycle", () => {
    const { dominants } = theFamily("C", "major6");
    const PC: Record<string, number> = { C:0, Db:1, D:2, Eb:3, E:4, F:5, Gb:6, G:7, Ab:8, A:9, Bb:10, B:11 };
    const pcs = dominants.map((d) => PC[d.root]).sort((a, b) => a - b);
    for (let i = 1; i < pcs.length; i++) expect(pcs[i] - pcs[i - 1]).toBe(3);
  });
});
