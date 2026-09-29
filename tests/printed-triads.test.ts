import { describe, expect, it } from "vitest";
import { findChords, tertianOnly } from "../src/lib/theory/chords";
import { ownSpellingFirst } from "../src/app/harmony/scaleOptions";
import { buildScale } from "../src/lib/theory/scales";
import { printedTriadNotes } from "../src/lib/theory/priceOfOne";

describe("triads print in stacked thirds", () => {
  it("G half-whole: G° reads G B♭ D♭, never G B♭ C♯", () => {
    const s = buildScale("G", "dim-hw", 0);
    const g = tertianOnly(ownSpellingFirst(findChords(s.notes, [3]), s.notes).chords).find((c) => c.names[0].symbol === "Gdim")!;
    expect(printedTriadNotes(g.names[0].symbol, g.names[0].root, g.names[0].notes, s.notes)).toEqual(["G", "Bb", "Db"]);
  });
  it("major and minor triads in G major (no 4) are unchanged", () => {
    const s = buildScale("G", "diatonic", 0);
    for (const c of tertianOnly(findChords(s.notes, [3]))) {
      const n = c.names[0];
      expect(printedTriadNotes(n.symbol, n.root, n.notes, s.notes)).toEqual(n.notes);
    }
  });
});
