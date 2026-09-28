import { describe, expect, it } from "vitest";
import { FAMILIES, KEYS, buildScale, isUnisonLabel } from "../src/lib/theory/scales";
import { noteName } from "../src/lib/theory/note";

/*
 * "♯1" and "♭1" are not degrees anyone reads. The note a semitone above the
 * tonic is the ♭2, whatever letter it sits on (MUSICAL_AUDIT.md, 28 Sep 2026).
 * Every six- and eight-note scale, every mode, all twelve keys.
 */
const SIX_OR_EIGHT = FAMILIES.filter((f) => (f.size === 6 || f.size === 8) && f.id !== "custom");

describe("no degree reads ♯1 or ♭1", () => {
  it("holds for every six- and eight-note scale in every key", () => {
    let checked = 0;
    for (const f of SIX_OR_EIGHT) {
      for (let m = 0; m < (f.modes?.length ?? 1); m++) {
        for (const k of KEYS) {
          const s = buildScale(k, f.id, m);
          expect(s.error, `${k} ${f.id}/${m}`).toBeUndefined();
          const bad = s.degrees.filter(isUnisonLabel);
          expect(bad, `${k} ${f.id}/${m}: ${s.notes.map(noteName).join(" ")} = ${s.degrees.join(" ")}`).toEqual([]);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
  });

  it("both octatonics are covered, in all twelve keys", () => {
    expect(SIX_OR_EIGHT.map((f) => f.id)).toEqual(expect.arrayContaining(["dim-wh", "dim-hw", "petrushka"]));
  });

  it("D♭ and A♭ half–whole keep their tonic and read the plain dominant formula", () => {
    const row = (k: string) => buildScale(k, "dim-hw").degrees.join(" ");
    const notes = (k: string) => buildScale(k, "dim-hw").notes.map(noteName).join(" ");
    expect(notes("Db")).toBe("Db D E F G Ab Bb Cb");
    expect(row("Db")).toBe("1 b2 #2 3 #4 5 6 b7");
    expect(notes("Ab")).toBe("Ab A B C D Eb F Gb");
    expect(row("Ab")).toBe("1 b2 #2 3 #4 5 6 b7");
  });

  it("every half–whole reads 1 ♭2 ♭3/♯2 3 ♯4 5 6 ♭7, every whole–half 1 2 ♭3 4 ♭5/♯4 ♭6/♯5 6/𝄫7 7", () => {
    for (const k of KEYS) {
      expect(buildScale(k, "dim-hw").degrees.join(" "), k).toMatch(/^1 b2 (b3|#2) 3 #4 5 6 b7$/);
      expect(buildScale(k, "dim-wh").degrees.join(" "), k).toMatch(/^1 2 b3 4 (b5|#4) (b6|#5) (6|bb7) (7|b8)$/);
    }
  });

  it("the ♭2 rule is the blues rule: a white key standing in for a double flat", () => {
    // D over D♭ reads ♭2 (it stands in for E𝄫); a sharped C♯ over C is never allowed.
    expect(buildScale("Db", "petrushka").degrees[1]).toBe("b2");
    expect(buildScale("C", "petrushka").notes.map(noteName).join(" ")).toBe("C Db E Gb G Bb");
    expect(buildScale("C", "dim-hw").notes.map(noteName).join(" ")).toBe("C Db Eb E F# G A Bb");
  });
});
