/**
 * Meters and talas. The drill was hard-wired to 4/4 from the first prototype;
 * these lock the arithmetic now that it is not.
 */
import { describe, it, expect } from "vitest";
import {
  METERS, meterById, pulsesPerBar, pulseDuration, beamGroups,
  SAPTA_TALAS, JATIS, aksharas, talaAsMeter, allTalaMeters, saptaTalaMeters,
} from "../src/lib/theory/meters";
import { solveResolution } from "../src/lib/theory/resolution";

describe("meter arithmetic", () => {
  it("counts pulses per bar for quarter- and eighth-based meters alike", () => {
    expect(pulsesPerBar(meterById("4-4"), 4)).toBe(16);   // 16ths in 4/4
    expect(pulsesPerBar(meterById("7-8"), 2)).toBe(14);   // 16ths in 7/8
    expect(pulsesPerBar(meterById("6-8"), 1)).toBe(6);    // eighths in 6/8
    expect(pulsesPerBar(meterById("5-4"), 3)).toBe(15);
  });
  it("gives the same note value when the maths agrees", () => {
    // 4/4 at 4-per-quarter and 7/8 at 2-per-eighth are both sixteenths
    expect(pulseDuration(meterById("4-4"), 4).duration).toBe("16");
    expect(pulseDuration(meterById("7-8"), 2).duration).toBe("16");
    expect(pulseDuration(meterById("4-4"), 2).duration).toBe("8");
    expect(pulseDuration(meterById("6-8"), 1).duration).toBe("8");
  });
  it("flags triplet subdivisions as tuplets", () => {
    expect(pulseDuration(meterById("4-4"), 3).tuplet).toBe(3);
    expect(pulseDuration(meterById("4-4"), 4).tuplet).toBeNull();
  });
  it("beams compound and odd meters by their real grouping", () => {
    expect(beamGroups(meterById("7-8"))).toEqual([
      { num: 2, den: 8 }, { num: 2, den: 8 }, { num: 3, den: 8 },
    ]);
    expect(beamGroups(meterById("4-4"))).toEqual([{ num: 1, den: 4 }]);
  });
  it("every declared meter produces a whole number of resolved bars", () => {
    for (const m of [...METERS, ...allTalaMeters()])
      for (const sub of [2, 3, 4])
        for (const g of [3, 4, 5, 7]) {
          const r = solveResolution(6, sub, m.top, g, "full");
          expect(Number.isInteger(r.bars), `${m.id} sub${sub} grp${g}`).toBe(true);
        }
  });
});

describe("the sapta talas", () => {
  it("computes Adi tala as 8 — the case that validates the method", () => {
    const triputa = SAPTA_TALAS.find((t) => t.id === "triputa")!;
    expect(aksharas(triputa, 4)).toBe(8);           // chatusra-jati Triputa = Adi
    expect(talaAsMeter(triputa, 4).label).toContain("Adi");
  });
  it("computes each tala from its anga structure", () => {
    const by = (id: string) => SAPTA_TALAS.find((t) => t.id === id)!;
    expect(aksharas(by("dhruva"), 4)).toBe(14);     // L D L L = 4+2+4+4
    expect(aksharas(by("matya"), 4)).toBe(10);      // L D L   = 4+2+4
    expect(aksharas(by("rupaka"), 4)).toBe(6);      // D L     = 2+4
    expect(aksharas(by("jhampa"), 7)).toBe(10);     // L U D   = 7+1+2
    expect(aksharas(by("ata"), 5)).toBe(14);        // L L D D = 5+5+2+2
    expect(aksharas(by("eka"), 4)).toBe(4);         // L
  });
  it("there are 35 talas — seven talas in five jatis", () => {
    expect(SAPTA_TALAS).toHaveLength(7);
    expect(JATIS).toHaveLength(5);
    expect(allTalaMeters()).toHaveLength(35);
    expect(saptaTalaMeters()).toHaveLength(7);
  });
  it("beams a tala by its angas", () => {
    const adi = talaAsMeter(SAPTA_TALAS.find((t) => t.id === "triputa")!, 4);
    expect(adi.grouping).toEqual([4, 2, 2]);        // laghu, drutam, drutam
  });
});
