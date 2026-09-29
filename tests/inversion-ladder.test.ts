import { describe, expect, it } from "vitest";
import {
  barryRoots, barryScale, FAMILY_ORDER, prettyLadder, sameNotesLadder, tetradName,
} from "../src/lib/theory/barrySystem";
import { midi, note, noteName, notePretty, pc } from "../src/lib/theory/note";

/*
 * Jason, 28 Sep 2026: on the sixth–diminished ladder, name every chord by its
 * bass so the eight chords read as TWO chords, each in four inversions.
 * G major 6 dim: G6 · A°7 · G6/B · C°7 · G6/D · E♭°7 · Em7 · F♯°7 · G6.
 */
const names = (r: string, f: (typeof FAMILY_ORDER)[number]) =>
  sameNotesLadder(r, f).map((x) => prettyLadder(x.symbol)).join(" · ");
const set = (ns: { letter: string; alt: number }[]) =>
  [...new Set(ns.map((n) => pc(note(n.letter as any, n.alt as any, 4))))].sort((a, b) => a - b).join(",");

describe("the inversion ladder, named by the bass", () => {
  it("G major 6th diminished: Jason's own example", () => {
    expect(names("G", "major6")).toBe("G6 · A°7 · G6/B · C°7 · G6/D · E♭°7 · Em7 · F♯°7 · G6");
    const l = sameNotesLadder("G", "major6");
    expect(l.map((x) => x.notes.map(notePretty).join(" "))).toEqual([
      "G B D E", "A C E♭ F♯", "B D E G", "C E♭ F♯ A", "D E G B", "E♭ F♯ A C", "E G B D", "F♯ A C E♭", "G B D E",
    ]);
    expect(l[6].slash).toBe("G6/E");
    expect(l[6].line).toBe("G6 with E in the bass · 3rd inversion");
    expect(l[5].line).toBe("same notes as A°7 · 2nd inversion");
    expect(l[3].line).toBe("same notes as A°7 · 1st inversion");
    expect(l[2].line).toBe("same notes as G6 · 1st inversion");
  });

  it("G minor 6th diminished: Gm6, Gm6/B♭, Gm6/D, Em7♭5 (= Gm6/E)", () => {
    expect(names("G", "minor6")).toBe("Gm6 · A°7 · Gm6/B♭ · C°7 · Gm6/D · E♭°7 · Em7♭5 · F♯°7 · Gm6");
    const l = sameNotesLadder("G", "minor6");
    expect(l[6].notes.map(notePretty).join(" ")).toBe("E G B♭ D");
    expect(l[6].slash).toBe("Gm6/E");
  });

  it("G dominant 7th diminished: G7, G7/B, G7/D, G7/F", () => {
    expect(names("G", "dominant7")).toBe("G7 · A°7 · G7/B · C°7 · G7/D · E♭°7 · G7/F · F♯°7 · G7");
  });

  it("G 7♭5 diminished: G7♭5, G7♭5/B, D♭7♭5 (= G7♭5/D♭), G7♭5/F", () => {
    expect(names("G", "dominant7b5")).toBe("G7♭5 · A°7 · G7♭5/B · C°7 · D♭7♭5 · E♭°7 · G7♭5/F · F♯°7 · G7♭5");
    expect(sameNotesLadder("G", "dominant7b5")[4].slash).toBe("G7b5/Db");
    /* the tritone reading never takes a C♭ or F♭ root */
    expect(names("F", "dominant7b5")).toContain("B7♭5");
    expect(names("Bb", "dominant7b5")).toContain("E7♭5");
  });

  it("C major 6: C6 · D°7 · C6/E · F°7 · C6/G · A♭°7 · Am7 · B°7 · C6", () => {
    expect(names("C", "major6")).toBe("C6 · D°7 · C6/E · F°7 · C6/G · A♭°7 · Am7 · B°7 · C6");
  });

  it("every system, every key: two chords, each one set of four notes in four inversions", () => {
    for (const f of FAMILY_ORDER) for (const r of barryRoots(f)) {
      const l = sameNotesLadder(r, f);
      const s = barryScale(r, f).notes;
      expect(l).toHaveLength(9);
      const tonic = l.filter((x) => x.family === "tonic");
      const dim = l.filter((x) => x.family === "dim");
      expect(tonic).toHaveLength(5);
      expect(dim).toHaveLength(4);
      expect(new Set(tonic.map((x) => set(x.notes))).size, `${r} ${f}`).toBe(1);
      expect(new Set(dim.map((x) => set(x.notes))).size, `${r} ${f}`).toBe(1);
      /* the two chords share no note and between them hold all eight */
      expect(new Set([...tonic[0].notes, ...dim[0].notes].map(pc)).size).toBe(8);
      l.forEach((x, i) => {
        /* alternate, bass climbing the scale, each voice up one step */
        expect(x.family).toBe(i % 2 ? "dim" : "tonic");
        expect(pc(x.notes[0])).toBe(pc(s[i % 8]));
        expect(x.inversion).toBe(Math.floor(i / 2) % 4);
        if (i) for (let v = 0; v < 4; v++) {
          const g = midi(x.notes[v]) - midi(l[i - 1].notes[v]);
          expect(g >= 1 && g <= 2).toBe(true);
        }
        /* each rung is its home chord's notes turned round: the bass moved up */
        const home = x.family === "tonic" ? tonic[0] : dim[0];
        const rot = [...home.notes.slice(x.inversion), ...home.notes.slice(0, x.inversion)];
        expect(x.notes.map(pc)).toEqual(rot.map(pc));
        /* no double sharps or flats anywhere */
        expect(x.notes.every((n) => Math.abs(n.alt) < 2)).toBe(true);
        expect(x.symbol).not.toMatch(/bb|##/);
      });
      /* the diminished is named from its bass, and really is a diminished 7th */
      for (const x of dim) {
        expect(x.symbol).toBe(noteName(x.notes[0]) + "dim7");
        expect(tetradName(x.notes, x.notes[0])?.symbol).toBe(noteName(x.notes[0]) + "dim7");
        expect(x.home).toBe(dim[0].symbol);
      }
      /* the tonic chord: root name at the bottom and top, and every other
         name either a slash of it or a real reading from the bass */
      expect(tonic[0].symbol).toBe(barryScale(r, f).chordSymbol);
      expect(tonic[4].symbol).toBe(tonic[0].symbol);
      for (const x of tonic.slice(1, 4)) {
        const slash = `${tonic[0].symbol}/${noteName(x.notes[0])}`;
        if (x.slash) {
          expect(x.slash).toBe(slash);
          const read = tetradName(x.notes, x.notes[0]);
          expect(read && pc(x.notes[0])).toBe(pc(x.notes[0]));
          expect(x.symbol.replace(/^[A-G](#|b)?/, "")).toBe(read!.symbol.replace(/^[A-G](#|b)?/, ""));
        } else expect(x.symbol).toBe(slash);
      }
    }
  });

  it("the 6th (or ♭5) in the bass is the one with its own name: m7, m7♭5, 7♭5; the dominant 7th has none", () => {
    const suffix = { major6: "m7", minor6: "m7b5", dominant7: null, dominant7b5: "7b5" } as const;
    for (const f of FAMILY_ORDER) for (const r of barryRoots(f)) {
      const l = sameNotesLadder(r, f);
      const named = l.filter((x) => x.slash);
      const want = suffix[f];
      if (!want) { expect(named).toHaveLength(0); continue; }
      expect(named, `${r} ${f}`).toHaveLength(1);
      expect(named[0].symbol.endsWith(want)).toBe(true);
      expect(named[0].degree).toBe(f === "dominant7b5" ? 4 : 6);
    }
  });
});
