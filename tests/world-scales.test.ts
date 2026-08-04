/**
 * The scales added from other traditions, and the Balkan metres.
 *
 * Two rules govern this file. Everything here must be exactly representable in
 * twelve-tone equal temperament — no rounding a quarter tone to the nearest
 * semitone and calling it a maqam. And every spelling is checked in awkward
 * keys as well as easy ones, because a scale that only works in C is a demo.
 */
import { describe, it, expect } from "vitest";
import { noteName, pc } from "../src/lib/theory/note";
import { buildScale, KEYS, familyById } from "../src/lib/theory/scales";
import { METERS, meterById } from "../src/lib/theory/meters";

const spell = (key: string, id: string) =>
  buildScale(key, id, 0).notes.map(noteName).join(" ");

describe("the two hexatonic gaps we filled", () => {
  it("Petrushka is C major and F# major stacked, with nothing shared", () => {
    expect(spell("C", "petrushka")).toBe("C Db E F# G Bb");
    const set = buildScale("C", "petrushka", 0)!.notes.map(pc).sort((a, b) => a - b);
    const cMaj = [0, 4, 7], fsMaj = [6, 10, 1];
    expect(cMaj.every((n) => set.includes(n))).toBe(true);
    expect(fsMaj.every((n) => set.includes(n))).toBe(true);
    expect(cMaj.some((n) => fsMaj.includes(n))).toBe(false);
  });

  it("and it is set class 6-30, which the engine already knew", () => {
    expect(buildScale("C", "petrushka", 0)!.forte.startsWith("6-30")).toBe(true);
  });

  /* The app's /harmony page states the rule; this proves the scale obeys it. */
  it("the tritone is genuinely the third legal distance for two major triads", () => {
    const majAt = (r: number) => [r, (r + 4) % 12, (r + 7) % 12];
    const disjoint = (a: number[], b: number[]) => !a.some((x) => b.includes(x));
    const legal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      .filter((d) => disjoint(majAt(0), majAt(d)));
    expect(legal.sort((a, b) => a - b)).toEqual([1, 2, 6, 10, 11]);
    expect(legal).toContain(6); // the tritone — Petrushka's case
  });

  it("Messiaen mode 5 is six notes and reports 6-7", () => {
    expect(spell("C", "messiaen5")).toBe("C Db F Gb G B");
    expect(buildScale("C", "messiaen5", 0)!.forte.startsWith("6-7")).toBe(true);
  });

  it("mode 5 really is of limited transposition — fewer than 12 distinct sets", () => {
    const seen = new Set<string>();
    for (let t = 0; t < 12; t++) {
      seen.add([0, 1, 5, 6, 7, 11].map((n) => (n + t) % 12).sort((a, b) => a - b).join(","));
    }
    expect(seen.size).toBe(6);
  });
});

describe("the Japanese pentatonics", () => {
  const expected: Record<string, string> = {
    hirajoshi: "C D Eb G Ab",
    insen: "C Db F G Bb",
    iwato: "C Db F Gb Bb",
    kumoi: "C D Eb G A",
    yo: "C D F G A",
  };
  for (const [id, notes] of Object.entries(expected)) {
    it(`${id} is ${notes}`, () => {
      expect(spell("C", id)).toBe(notes);
      expect(familyById(id).size).toBe(5);
    });
  }

  it("kumoi is hirajoshi with a natural 6th — one note apart, as the note claims", () => {
    const h = buildScale("C", "hirajoshi", 0)!.notes.map(pc);
    const k = buildScale("C", "kumoi", 0)!.notes.map(pc);
    const diff = h.filter((n) => !k.includes(n)).concat(k.filter((n) => !h.includes(n)));
    expect(diff.sort((a, b) => a - b)).toEqual([8, 9]); // Ab out, A in
  });

  it("yo is anhemitonic — no semitones anywhere, which is its whole character", () => {
    const s = buildScale("C", "yo", 0)!.notes.map(pc).sort((a, b) => a - b);
    for (let i = 0; i < s.length; i++) {
      for (let j = i + 1; j < s.length; j++) {
        const d = Math.min(Math.abs(s[i] - s[j]), 12 - Math.abs(s[i] - s[j]));
        expect(d).not.toBe(1);
      }
    }
  });
});

describe("Hijaz — one scale, several traditions", () => {
  it("is C Db E F G Ab Bb", () => {
    expect(spell("C", "hijaz")).toBe("C Db E F G Ab Bb");
  });
  it("carries the augmented second between the b2 and the 3 that defines it", () => {
    const n = buildScale("C", "hijaz", 0)!.notes.map(pc);
    expect(n[2] - n[1]).toBe(3); // Db to E — three semitones, spelled as a 2nd
  });
});

describe("every added scale survives all twelve keys", () => {
  const added = ["petrushka", "messiaen5", "hirajoshi", "insen", "iwato", "kumoi", "yo", "hijaz"];
  for (const id of added) {
    it(`${id} builds in every key with no triple accidental`, () => {
      for (const k of KEYS) {
        const s = buildScale(k, id, 0);
        expect(s.error, `${id} in ${k}: ${s.error}`).toBeUndefined();
        expect(s.notes).toHaveLength(familyById(id).size);
        for (const n of s.notes) expect(Math.abs(n.alt)).toBeLessThanOrEqual(2);
      }
    });
  }
});

describe("the Balkan metres", () => {
  it("a ruchenitsa and a misra gati are counting the same seven", () => {
    const r = meterById("7-8-ruchenitsa");
    expect(r.top).toBe(7);
    expect(r.grouping).toEqual([2, 2, 3]);
    expect(r.grouping!.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("daichovo is a different nine from the compound 9/8, not a duplicate", () => {
    const bg = meterById("9-8-daichovo");
    const western = meterById("9-8");
    expect(bg.top).toBe(western.top);
    expect(bg.grouping).toEqual([2, 2, 2, 3]);
    expect(western.grouping).toEqual([3, 3, 3]);
    expect(bg.grouping).not.toEqual(western.grouping);
  });

  it("paidushko leans the opposite way to the plain 5/8 we already had", () => {
    expect(meterById("5-8-paidushko").grouping).toEqual([2, 3]);
    expect(meterById("5-8").grouping).toEqual([3, 2]);
  });

  it("kopanitsa is eleven, and its grouping adds up", () => {
    const k = meterById("11-8-kopanitsa");
    expect(k.top).toBe(11);
    expect(k.grouping!.reduce((a, b) => a + b, 0)).toBe(11);
  });

  it("every meter's grouping sums to its top number", () => {
    for (const m of METERS) {
      if (m.grouping) expect(m.grouping.reduce((a, b) => a + b, 0), m.label).toBe(m.top);
    }
  });

  it("no duplicate meter ids", () => {
    const ids = METERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
