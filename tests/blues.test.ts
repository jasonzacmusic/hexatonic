/**
 * The 12-bar form and the tihai arithmetic — both checked against what a
 * musician would write on a napkin, not against the implementation.
 */
import { describe, it, expect } from "vitest";
import { twelveBar, BLUES_RULE, bluesTip } from "../src/lib/theory/blues";
import { KEYS } from "../src/lib/theory/scales";
import { solveTihai, tihaiTable, tihaiGrid } from "../src/lib/theory/tihai";

describe("twelve bar blues", () => {
  it("builds the standard form in C", () => {
    const bars = twelveBar("C", false);
    expect(bars.map((b) => b.symbol)).toEqual([
      "C7", "C7", "C7", "C7", "F7", "F7", "C7", "C7", "G7", "F7", "C7", "G7",
    ]);
  });
  it("quick change swaps bar 2 to the IV", () => {
    expect(twelveBar("C", true)[1].symbol).toBe("F7");
  });
  it("spells the IV by letter — Bb7 in F, never A#7", () => {
    const bars = twelveBar("F", false);
    expect(bars[4].symbol).toBe("Bb7");
    expect(twelveBar("E", false)[4].symbol).toBe("A7");
    expect(twelveBar("Bb", false)[8].symbol).toBe("F7");
  });
  it("keeps every voicing inside the comping range", () => {
    for (const k of ["C", "F#", "Db", "B"])
      for (const b of twelveBar(k, true)) {
        for (const v of b.voicing) { expect(v).toBeGreaterThanOrEqual(55); expect(v).toBeLessThanOrEqual(84); }
        expect(b.bass).toBeGreaterThanOrEqual(36);
        expect(b.bass).toBeLessThan(55);
      }
  });
  it("voice-leads the chords: the 3rd, 5th and ♭7, every note within a major 3rd of the bar before", () => {
    for (const k of KEYS)
      for (const quick of [false, true]) {
        const bars = twelveBar(k, quick);
        bars.forEach((b, i) => {
          expect(new Set(b.voicing.map((m) => m % 12))).toEqual(new Set(b.chordPcs.slice(1)));
          if (i === 0) return;
          for (const m of b.voicing)
            expect(Math.min(...bars[i - 1].voicing.map((x) => Math.abs(x - m))), `${k} bar ${i + 1}`).toBeLessThanOrEqual(4);
        });
      }
  });
  it("walks the bass 1-3-5-6, and into every change by a half step", () => {
    const c = twelveBar("C", false);
    expect(c[0].walk).toEqual([36, 40, 43, 45]);              // C E G A
    expect(c[3].walk).toEqual([36, 40, 43, 42]);              // C E G F♯ → F
    for (const k of KEYS)
      for (const quick of [false, true]) {
        const bars = twelveBar(k, quick);
        bars.forEach((b, i) => {
          const next = bars[(i + 1) % 12];
          expect(b.walk[0]).toBe(b.bass);
          for (const m of b.walk) { expect(m).toBeGreaterThanOrEqual(28); expect(m).toBeLessThan(60); }
          if (next.symbol !== b.symbol) expect(Math.abs(b.walk[3] - next.bass), `${k} bar ${i + 1}`).toBe(1);
        });
      }
  });
  it("says plainly that the chords step outside the scale on purpose", () => {
    expect(BLUES_RULE).toBe(
      "The blues uses I7, IV7 and V7, which step outside the scale on purpose; that rub is the blues sound.");
    expect(bluesTip("G", [7, 10, 0, 1, 2, 5])).toMatch(/Lean on B♭ against the G7's B/);
  });
  it("carries dominant-7 pitch classes for the display", () => {
    const c7 = twelveBar("C", false)[0];
    expect(new Set(c7.chordPcs)).toEqual(new Set([0, 4, 7, 10]));
  });
});

describe("tihai", () => {
  it("solves the classic: phrase of 11 in Adi tala 16ths needs no karvai", () => {
    const t = solveTihai(11, 32)!;                       // Adi = 8 beats × 4 pulses
    expect(t.gap).toBe(0);
    expect(t.total).toBe(33);
    expect(t.cycles).toBe(1);                            // lands on the next sam
  });
  it("last stroke always sits on a cycle boundary", () => {
    for (const ppc of [12, 16, 20, 28, 32])
      for (const t of tihaiTable(ppc, 20))
        expect((t.total - 1) % ppc).toBe(0);
  });
  it("grid length equals the span and ends with the third repetition", () => {
    const t = solveTihai(5, 16)!;
    const g = tihaiGrid(t);
    expect(g.length).toBe(t.total);
    expect(g[g.length - 1]).toBe(3);
    expect(g.filter((x) => x === 0).length).toBe(2 * t.gap);
  });
});
