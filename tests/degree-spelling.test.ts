/**
 * Degree labels follow the spelling. The letter gives the number, the distance
 * from the tonic gives the ♭ or ♯, so a sharped note can never wear a flat
 * label (whole tone in G showed C♯ as "♭5" and D♯ as "♭6" before this).
 */
import { describe, it, expect } from "vitest";
import { buildScale, degreesFromSpelling, FAMILIES, KEYS, prettyDegree } from "../src/lib/theory/scales";
import { noteName, pc, letterIndex } from "../src/lib/theory/note";

const row = (key: string, fam: string) => buildScale(key, fam, 0).degrees.map(prettyDegree).join(" ");
const notes = (key: string, fam: string) => buildScale(key, fam, 0).notes.map(noteName).join(" ");

const COMBOS = FAMILIES.flatMap((f) =>
  f.kind === "rotation" ? f.modes!.map((m) => ({ f, m: m.index })) : [{ f, m: 0 }],
).filter(({ f }) => f.kind !== "custom");

describe("degree labels follow the spelling", () => {
  it("whole tone in G reads 1 2 3 ♯4 ♯5 ♭7 (G A B C♯ D♯ F)", () => {
    expect(notes("G", "whole")).toBe("G A B C# D# F");
    expect(row("G", "whole")).toBe("1 2 3 ♯4 ♯5 ♭7");
  });

  it("Prometheus reads 1 2 3 ♯4 6 ♭7 in every key", () => {
    expect(notes("G", "prometheus")).toBe("G A B C# E F");
    for (const k of KEYS) expect(row(k, "prometheus"), k).toBe("1 2 3 ♯4 6 ♭7");
  });

  it("the blues keeps its ♭5 in every key, even where the ♭5 is written as a white key", () => {
    for (const k of KEYS) expect(row(k, "blues"), k).toBe("1 ♭3 4 ♭5 5 ♭7");
    expect(notes("Ab", "blues")).toBe("Ab B Db D Eb Gb");
  });

  it("the augmented scale reads 1 ♯2 3 5 ♭6 7 in G", () => {
    expect(notes("G", "aug")).toBe("G A# B D Eb F#");
    expect(row("G", "aug")).toBe("1 ♯2 3 5 ♭6 7");
  });

  it("the octatonics read from their letters: G half–whole has C♯ as ♯4, never ♭5", () => {
    expect(notes("G", "dim-hw")).toBe("G Ab Bb B C# D E F");
    expect(row("G", "dim-hw")).toBe("1 ♭2 ♭3 3 ♯4 5 6 ♭7");
    expect(notes("G", "dim-wh")).toBe("G A Bb C C# D# E F#");
    expect(row("G", "dim-wh")).toBe("1 2 ♭3 4 ♯4 ♯5 6 7");
  });

  /** Sharped notes with a flat label from another letter, or the reverse. A
   *  flat label on a sharped note is right only on its own letter: F♯ is the
   *  ♭7 of G♯. Borrowing the next letter's name (C♯ over G as "♭5") is not. */
  const crossed = (ns: ReturnType<typeof buildScale>["notes"], ds: string[]) => ns.flatMap((n, i) => {
    const own = (letterIndex(n.letter) - letterIndex(ns[0].letter) + 7) % 7 + 1;
    const num = Number(/\d+$/.exec(ds[i])![0]);
    const sameLetter = num === own || (num === 8 && own === 1);
    const wrong = (n.alt > 0 && ds[i].startsWith("b")) || (n.alt < 0 && ds[i].startsWith("#"));
    return wrong && !sameLetter ? [`${noteName(n)} labelled ${ds[i]}`] : [];
  });

  it("the check bites: the old semitone labels on G whole tone fail it", () => {
    const g = buildScale("G", "whole", 0).notes;
    expect(crossed(g, ["1", "2", "3", "b5", "b6", "b7"])).toEqual(["C# labelled b5", "D# labelled b6"]);
  });

  it("NEVER: a sharped note with a flat label from another letter (or the reverse), in any scale or key", () => {
    const bad: string[] = [];
    for (const { f, m } of COMBOS)
      for (const k of KEYS) {
        const s = buildScale(k, f.id, m);
        bad.push(...crossed(s.notes, s.degrees).map((x) => `${k} ${f.id}/${m}: ${x}`));
      }
    expect(bad).toEqual([]);
  });

  it("every label names the note's own letter, except a white key standing in for a template flat", () => {
    const bad: string[] = [];
    for (const { f, m } of COMBOS)
      for (const k of KEYS) {
        const s = buildScale(k, f.id, m);
        const t = s.notes[0];
        s.notes.forEach((n, i) => {
          const step = (letterIndex(n.letter) - letterIndex(t.letter) + 7) % 7;
          const num = Number(/\d+$/.exec(s.degrees[i])![0]);
          const byLetter = num === step + 1 || (num === 8 && step === 0);
          if (!byLetter && !(n.alt === 0 && s.degrees[i].startsWith("b")))
            bad.push(`${k} ${f.id}/${m}: ${noteName(n)} labelled ${s.degrees[i]}`);
        });
      }
    expect(bad).toEqual([]);
  });

  it("the label always names the pitch that sounds", () => {
    const semi = (d: string) => {
      const x = /^(b*|#*)(\d)$/.exec(d)!;
      const base = [0, 2, 4, 5, 7, 9, 11, 12][Number(x[2]) - 1];
      return (((base + (x[1].startsWith("b") ? -x[1].length : x[1].length)) % 12) + 12) % 12;
    };
    for (const { f, m } of COMBOS)
      for (const k of KEYS) {
        const s = buildScale(k, f.id, m);
        s.notes.forEach((n, i) =>
          expect(semi(s.degrees[i]), `${k} ${f.id}: ${noteName(n)} ${s.degrees[i]}`).toBe(((pc(n) - pc(s.notes[0])) % 12 + 12) % 12));
      }
  });

  it("a custom scale is read by letter too: C D E G♭ A♭ B♭ is 1 2 3 ♭5 ♭6 ♭7, C D E F♯ G♯ A♯ is 1 2 3 ♯4 ♯5 ♯6", () => {
    const s = buildScale("C", "custom", 0, [0, 2, 4, 6, 8, 10]);
    expect(s.notes.map(noteName).join(" ")).toBe("C D E Gb Ab Bb");
    expect(s.degrees.map(prettyDegree).join(" ")).toBe("1 2 3 ♭5 ♭6 ♭7");
    expect(degreesFromSpelling(buildScale("C", "whole", 0).notes).map(prettyDegree).join(" ")).toBe("1 2 3 ♯4 ♯5 ♯6");
  });
});
