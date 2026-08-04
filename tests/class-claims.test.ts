/**
 * THE PUBLIC-CLASS CLAIM GATE.
 *
 * Every factual claim printed on the Aug 2026 public-class material — the
 * carousel, the posters, the ad copy, the portal description and the promo
 * script — is asserted here against the engine that the app itself runs on.
 *
 * The point is that marketing cannot drift from the product. If a slide says
 * the major blues scale is 1 2 b3 3 5 6, this file fails the build the day the
 * engine stops agreeing. Source of the claims:
 *   ~/Documents/Claude/public-classes-launch/aug-2026-season/hexatonic/copy/CONTENT.md
 *
 * A claim that cannot be stated as an assertion here does not go on a slide.
 */
import { describe, it, expect } from "vitest";
import { noteName, pc } from "../src/lib/theory/note";
import { buildScale, buildDiatonic, omissionSurvey, MAJOR } from "../src/lib/theory/scales";
import { triadPair, findChords, tertianOnly } from "../src/lib/theory/chords";

const spellOf = (id: string, key: string, mode = 0) =>
  buildScale(key, id, mode)!.notes.map(noteName).join(" ");

describe("the headline claim — one tritone, two legal removals", () => {
  it("C major holds exactly one tritone", () => {
    const full = buildDiatonic("C", MAJOR)!;
    expect(full.map(noteName).join(" ")).toBe("C D E F G A B");
    /* The survey removes one degree at a time; the parent scale's own tritone
       count is one more than the best removal can leave. */
    const rows = omissionSurvey("C");
    expect(rows.filter((r) => r.tritones === 0)).toHaveLength(2);
  });

  it("the only two removals that kill it are the 4th and the 7th", () => {
    const zero = omissionSurvey("C").filter((r) => r.tritones === 0);
    expect(zero.map((r) => r.removedNote).sort()).toEqual(["B", "F"]);
    expect(zero.map((r) => r.removedDegree).sort()).toEqual([4, 7]);
  });

  it("every other removal leaves the tritone in — the slide's table, row for row", () => {
    const rows = omissionSurvey("C");
    expect(rows.map((r) => `${r.removedNote}:${r.tritones}`)).toEqual([
      "C:1", "D:1", "E:1", "F:0", "G:1", "A:1", "B:0",
    ]);
  });

  it("holds in every key, not just the one on the slide", () => {
    for (const k of ["G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"]) {
      const zero = omissionSurvey(k).filter((r) => r.tritones === 0);
      expect(zero.map((r) => r.removedDegree).sort()).toEqual([4, 7]);
    }
  });
});

describe("slide 4 — the two major hexatonics", () => {
  it("drop the 4th gives C D E G A B", () => {
    expect(spellOf("diatonic", "C", 0)).toBe("C D E G A B");
  });
  it("drop the 7th gives C D E F G A", () => {
    expect(spellOf("diatonic", "C", 3)).toBe("C D E F G A");
  });
  it("both are the same set class — one note apart, 6-32 either way", () => {
    const a = buildScale("C", "diatonic", 0)!;
    const b = buildScale("C", "diatonic", 3)!;
    /* forte carries its plain-English gloss too — "6-32 · Guidonian / major /
       diatonic hexachord" — so match the set-class name at the front. */
    expect(a.forte.startsWith("6-32")).toBe(true);
    expect(b.forte.startsWith("6-32")).toBe(true);
    expect(a.tritones).toBe(0);
    expect(b.tritones).toBe(0);
  });
});

describe("slide 5 — the blues hexatonics", () => {
  it("the minor blues is C Eb F Gb G Bb", () => {
    expect(spellOf("blues", "C")).toBe("C Eb F Gb G Bb");
  });
  it("the major blues — the gospel scale — is C D Eb E G A", () => {
    expect(spellOf("blues-major", "C")).toBe("C D Eb E G A");
  });
  it("that major blues really is 1 2 b3 3 5 6", () => {
    expect(buildScale("C", "blues-major", 0)!.degrees).toEqual(["1", "2", "b3", "3", "5", "6"]);
  });

  /* Slide 6 claims they are not two scales at all: the C major blues is the
     A minor blues, the same six pitches read from a different home. */
  it("C major blues and A minor blues are the same six notes", () => {
    const cMajorBlues = buildScale("C", "blues-major", 0)!.notes.map(pc).sort((a, b) => a - b);
    const aMinorBlues = buildScale("A", "blues", 0)!.notes.map(pc).sort((a, b) => a - b);
    expect(cMajorBlues).toEqual(aMinorBlues);
  });

  it("and that relationship is a minor third, in every key", () => {
    for (const [maj, min] of [["C", "A"], ["G", "E"], ["F", "D"], ["Eb", "C"], ["B", "Ab"]]) {
      const a = buildScale(maj, "blues-major", 0)!.notes.map(pc).sort((x, y) => x - y);
      const b = buildScale(min, "blues", 0)!.notes.map(pc).sort((x, y) => x - y);
      expect(a).toEqual(b);
    }
  });
});

describe("slide 4 — the consequence the deck now leads with", () => {
  /* "Six notes leave you four triads, and the two that vanish are the ii and
     the vii°." Both halves have to hold, or the slide is wrong. */
  it("the diatonic hexachord contains exactly four tertian triads", () => {
    const scale = buildScale("C", "diatonic", 0)!.notes;
    const triads = tertianOnly(findChords(scale, [3]));
    expect(triads).toHaveLength(4);
  });

  it("and they are C, Am, G, Em — no Dm, no B diminished", () => {
    const scale = buildScale("C", "diatonic", 0)!.notes;
    const sets = tertianOnly(findChords(scale, [3])).map((c) =>
      [...c.pcs].sort((a, b) => a - b).join(","));
    expect(sets).toContain([0, 4, 7].join(","));   // C
    expect(sets).toContain([0, 4, 9].join(","));   // Am
    expect(sets).toContain([2, 7, 11].join(","));  // G
    expect(sets).toContain([4, 7, 11].join(","));  // Em
    expect(sets).not.toContain([2, 5, 9].join(",")); // Dm needed the F
    expect(sets).not.toContain([5, 11, 2].join(",")); // B dim needed the F
  });
});

describe("slide 6 — whole tone, and the triad pair drawn on the slide", () => {
  it("the whole-tone set is C D E F# G# A#", () => {
    expect(spellOf("whole", "C")).toBe("C D E F# G# A#");
  });

  /* The slide engraves G major over A minor and claims the two of them hand
     you the whole six-note set. Both halves of that have to be true: no shared
     note, and the union is exactly the hexachord. */
  it("G major + A minor share no note and generate the hexachord", () => {
    const pcs = triadPair(7, "maj", 9, "min");
    expect(pcs).not.toBeNull();
    expect(pcs).toHaveLength(6);
    /* The union, sorted, is exactly the note set of C major with the 4th out —
       the scale the app draws on the very first screen. */
    const hexachord = [...buildScale("C", "diatonic", 0)!.notes.map(pc)].sort((a, b) => a - b);
    expect(pcs).toEqual(hexachord);
  });

  it("the pair the promo is filmed in — D major + E minor over G — also works", () => {
    const pcs = triadPair(2, "maj", 4, "min");
    expect(pcs).toEqual([2, 4, 6, 7, 9, 11]);
  });

  it("a pair that shares a note is rejected, so the slide can never claim one", () => {
    /* C major and Eb major share G — five notes, not six. */
    expect(triadPair(0, "maj", 3, "maj")).toBeNull();
  });
});

describe("the promo script is filmed in G, and G behaves", () => {
  it("G major's one tritone is C against F#", () => {
    expect(buildDiatonic("G", MAJOR)!.map(noteName).join(" ")).toBe("G A B C D E F#");
    const zero = omissionSurvey("G").filter((r) => r.tritones === 0);
    expect(zero.map((r) => r.removedNote).sort()).toEqual(["C", "F#"]);
  });
  it("dropping G's 4th leaves G A B D E F#", () => {
    expect(spellOf("diatonic", "G", 0)).toBe("G A B D E F#");
  });
  it("dropping G's 7th leaves G A B C D E", () => {
    expect(spellOf("diatonic", "G", 3)).toBe("G A B C D E");
  });
});
