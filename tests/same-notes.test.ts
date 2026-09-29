import { describe, expect, it } from "vitest";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { ownSpellingFirst } from "../src/app/harmony/scaleOptions";
import { buildScale, FAMILIES, KEYS } from "../src/lib/theory/scales";
import { sameNotes, sameNotesLine } from "../src/lib/theory/sameNotes";

/* Chords that share their notes are shown as ONE chord: "C6 = Am7/C". */
const lines = (k: string, f: string, m = 0, sizes: (3 | 4)[] = [3, 4]) => {
  const s = buildScale(k, f, m);
  return tertianOnly(ownSpellingFirst(findChords(s.notes, sizes), s.notes).chords)
    .filter((c) => c.names.length > 1).map((c) => sameNotesLine(c, s.notes));
};

describe("same notes, one chord", () => {
  it("C major (no 4): C6 = Am7/C", () => {
    expect(lines("C", "diatonic", 0, [4])).toContain("C6 = Am7/C");
  });
  it("G major (no 4): Em7 = G6/E and D6 = Bm7/D", () => {
    expect(lines("G", "diatonic", 0, [4])).toEqual(["Em7 = G6/E", "D6 = Bm7/D"]);
  });
  it("G whole tone: G+ = B+/G = D♯+/G, and the other one led by A+", () => {
    const l = lines("G", "whole", 0, [3]);
    expect(l).toContain("G+ = B+/G = D♯+/G");
    expect(l.some((x) => x.startsWith("A+ = "))).toBe(true);
  });
  it("G augmented scale: G+ = B+/G = E♭+/G (the scale writes E♭), B♭+ leads the other", () => {
    const l = lines("G", "aug", 0, [3]);
    expect(l).toContain("G+ = B+/G = E♭+/G");
    expect(l.some((x) => x.startsWith("B♭+ = "))).toBe(true);
  });
  it("every six-note scale, every mode, every key: the aliases are the same notes, rooted on the scale's own notes, with no double accidentals", () => {
    for (const f of FAMILIES) {
      if (f.id === "custom") continue;
      for (let m = 0; m < (f.modes?.length ?? 1); m++) for (const k of KEYS) {
        const s = buildScale(k, f.id, m);
        /* seven known seven-note modes need a double accidental in the scale itself (e.g. C ultralocrian's B𝄫); their chords may too */
        if (s.error || s.notes.some((n) => Math.abs(n.alt) > 1)) continue;
        const own = new Set(s.notes.map((n) => n.letter + ({ "-1": "b", "0": "", "1": "#", "-2": "bb", "2": "##" } as any)[String(n.alt)]));
        for (const c of tertianOnly(ownSpellingFirst(findChords(s.notes, [3, 4]), s.notes).chords)) {
          const x = sameNotes(c, s.notes);
          expect(x.others.length).toBeLessThanOrEqual(c.names.filter((n) => n.family === c.names[0].family).length - 1);
          for (const o of x.others) {
            expect(o.endsWith(`/${c.names[0].root}`)).toBe(true);
            const root = /^[A-G](##|#|bb|b)?/.exec(o)![0];
            expect(own.has(root), `${k} ${f.id}/${m}: ${o}`).toBe(true);
            expect(o).not.toMatch(/##|bb/);
          }
        }
      }
    }
  });
});
