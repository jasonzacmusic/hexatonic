/**
 * The board layer: the augmented star on the circle of fifths, the interval
 * labels and the major-third arcs are all computed and checked here.
 */
import { describe, expect, it } from "vitest";
import {
  augTriangles, augTriad, boardStyle, fifthsSlot, fromTonic, majorThirdArcs, steps,
} from "../src/lib/theory/board";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import { intervalName, notePretty, parseNoteName, pc } from "../src/lib/theory/note";

const names = (ns: any[]) => ns.map(notePretty).join(" ");

describe("circle of fifths", () => {
  it("puts the fifth one slot clockwise and visits all twelve", () => {
    expect(fifthsSlot(7)).toBe(1);
    expect(fifthsSlot(5)).toBe(11);
    expect(new Set(Array.from({ length: 12 }, (_, i) => fifthsSlot(i))).size).toBe(12);
  });
  it("draws every augmented triad as an equilateral triangle (slots 4 apart)", () => {
    for (const t of augTriangles([])) {
      const s = t.pcs.map(fifthsSlot).sort((a, b) => a - b);
      expect([s[1] - s[0], s[2] - s[1]]).toEqual([4, 4]);
    }
  });
});

describe("the four augmented triangles", () => {
  it("default names are C E G♯, G B D♯, D F♯ A♯, A C♯ E♯", () => {
    expect(augTriangles([]).map((t) => t.name)).toEqual(["C E G♯", "G B D♯", "D F♯ A♯", "A C♯ E♯"]);
  });
  it("cover the twelve notes exactly once", () => {
    expect(augTriangles([]).flatMap((t) => t.pcs).sort((a, b) => a - b)).toEqual([...Array(12).keys()]);
  });
  it("augmented and whole tone hold exactly two, in every key; diatonic holds none", () => {
    for (const k of KEYS) {
      for (const fam of ["aug", "whole"]) {
        const s = buildScale(k, fam);
        const inside = augTriangles(s.notes).filter((t) => t.inScale);
        expect(inside, `${k} ${fam}`).toHaveLength(2);
        for (const t of inside) {
          expect(intervalName(t.notes[0], t.notes[1])).toBe("M3");
          expect(intervalName(t.notes[1], t.notes[2])).toBe("M3");
          expect(t.notes.every((n) => s.notes.some((x) => pc(x) === pc(n)))).toBe(true);
        }
      }
      expect(augTriangles(buildScale(k, "diatonic", 0).notes).filter((t) => t.inScale)).toHaveLength(0);
    }
  });
  it("G augmented: G B D♯ first (from the tonic), then B♭ D F♯", () => {
    const s = buildScale("G", "aug");
    const inside = augTriangles(s.notes).filter((t) => t.inScale).sort((x, y) => x.order - y.order);
    expect(inside.map((t) => t.name)).toEqual(["G B D♯", "B♭ D F♯"]);
  });
  it("the same with the board's spelling, G A♯ B D E♭ F♯, and says what is written differently", () => {
    const board = ["G", "A#", "B", "D", "Eb", "F#"].map((n) => parseNoteName(n));
    const inside = augTriangles(board).filter((t) => t.inScale).sort((x, y) => x.order - y.order);
    expect(inside.map((t) => t.name)).toEqual(["G B D♯", "B♭ D F♯"]);
    expect(inside[0].written.map((w) => `${notePretty(w.chord)}=${notePretty(w.scale)}`)).toEqual(["D♯=E♭"]);
    expect(inside[1].written.map((w) => `${notePretty(w.chord)}=${notePretty(w.scale)}`)).toEqual(["B♭=A♯"]);
  });
  it("G whole tone: G B D♯ then A C♯ E♯, with E♯ written F in the scale", () => {
    const s = buildScale("G", "whole");
    const inside = augTriangles(s.notes).filter((t) => t.inScale).sort((x, y) => x.order - y.order);
    expect(inside.map((t) => t.name)).toEqual(["G B D♯", "A C♯ E♯"]);
    expect(inside[1].written.map((w) => `${notePretty(w.chord)}=${notePretty(w.scale)}`)).toEqual(["E♯=F"]);
  });
  it("the tonic's triangle always comes first and starts on the tonic, in every key", () => {
    for (const k of KEYS) for (const fam of ["aug", "whole"]) {
      const s = buildScale(k, fam);
      const first = augTriangles(s.notes).find((t) => t.order === 0)!;
      expect(pc(first.notes[0]), `${k} ${fam}`).toBe(pc(s.notes[0]));
      expect(first.notes.some((n) => Math.abs(n.alt) === 2), `${k} ${fam}`).toBe(false);
    }
  });
  it("augTriad spells in thirds", () => {
    expect(names(augTriad(parseNoteName("Ab"))!)).toBe("A♭ C E");
  });
});

describe("interval labels", () => {
  it("names each step from the spelling: the board's G A♯ B D E♭ F♯ alternates aug2 and m2", () => {
    const board = ["G", "A#", "B", "D", "Eb", "F#"].map((n) => parseNoteName(n));
    expect(steps(board).map((x) => x.name)).toEqual(["aug2", "m2", "m3", "m2", "aug2"]);
    expect(steps(board).map((x) => x.semis)).toEqual([3, 1, 3, 1, 3]);
  });
  it("a step written as a minor 3rd is labelled m3, never aug2", () => {
    const flat = ["G", "Bb", "B"].map((n) => parseNoteName(n));
    expect(steps(flat).map((x) => x.name)).toEqual(["m3", "aug1"]);
  });
  it("draws whole-tone arcs only where the spelling is a major third", () => {
    const s = buildScale("G", "whole"); // G A B C♯ D♯ F
    expect(names(s.notes)).toBe("G A B C♯ D♯ F");
    expect(majorThirdArcs(s.notes)).toEqual([{ from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 4 }]);
  });
  it("reads intervals from the tonic as on the board (G suspended: M2 P4 P5 M6 m7)", () => {
    expect(fromTonic(buildScale("G", "diatonic", 1).notes)).toEqual(["1", "M2", "P4", "P5", "M6", "m7"]);
  });
  it("picks the right picture", () => {
    expect(boardStyle(buildScale("G", "whole").notes)).toBe("thirds");
    expect(boardStyle(buildScale("G", "aug").notes)).toBe("steps");
    expect(boardStyle(buildScale("G", "diatonic", 0).notes)).toBe("degrees");
    for (const k of KEYS) expect(boardStyle(buildScale(k, "aug").notes), k).toBe("steps");
  });
});
