/**
 * For the price of one: a symmetrical scale started on another of its own
 * notes gives back the same notes. The families are recomputed here by
 * transposition alone (move the shape by 0–11 half steps and see which moves
 * give the same notes), never from a typed-in list, and checked against what
 * the app shows, in all twelve keys.
 */
import { describe, it, expect } from "vitest";
import { KEYS, buildScale } from "../src/lib/theory/scales";
import { noteName, pc } from "../src/lib/theory/note";
import {
  PRICE_FAMILIES, PriceFamilyId, chordsLine, keyPc, learnRoute, priceFamily, routeLine, sameNotesLine,
  setOfKey, sharedTriads, startScales,
} from "../src/lib/theory/priceOfOne";

const mod12 = (x: number) => ((x % 12) + 12) % 12;
const setId = (pcs: number[]) => [...new Set(pcs.map(mod12))].sort((a, b) => a - b).join(",");

/** Brute force: the shape moved to each of the 12 roots, grouped by the notes it gives. */
function byTransposition(familyId: string): number[][] {
  const shape = buildScale("C", familyId, 0).pcs.map((p) => mod12(p - pc(buildScale("C", familyId, 0).notes[0])));
  const groups = new Map<string, number[]>();
  for (let t = 0; t < 12; t++) {
    const id = setId(shape.map((p) => p + t));
    groups.set(id, [...(groups.get(id) ?? []), t]);
  }
  return [...groups.values()];
}

const EXPECT: Record<PriceFamilyId, { sets: number; each: number; size: number }> = {
  whole: { sets: 2, each: 6, size: 6 },
  aug: { sets: 4, each: 3, size: 6 },
  petrushka: { sets: 6, each: 2, size: 6 },
  messiaen5: { sets: 6, each: 2, size: 6 },
  "tritone-minor": { sets: 6, each: 2, size: 6 },
  "dim-hw": { sets: 3, each: 4, size: 8 },
  "dim-wh": { sets: 3, each: 4, size: 8 },
};

describe("the families, found by transposition", () => {
  it("whole tone 2 × 6, augmented 4 × 3, the three tritone scales 6 × 2, octatonics 3 × 4", () => {
    for (const f of PRICE_FAMILIES) {
      const groups = byTransposition(f);
      expect(groups.length, f).toBe(EXPECT[f].sets);
      expect(groups.every((g) => g.length === EXPECT[f].each), f).toBe(true);
      // the starting notes in a set are evenly spaced: every period half steps
      const period = 12 / EXPECT[f].each;
      for (const g of groups) expect(g.map((t) => mod12(t - g[0])).sort((a, b) => a - b), f)
        .toEqual(Array.from({ length: EXPECT[f].each }, (_, i) => i * period));
    }
  });

  it("what the app shows is the same grouping, from every one of the twelve keys", () => {
    for (const f of PRICE_FAMILIES) for (const from of KEYS) {
      const fam = priceFamily(f, from);
      const brute = byTransposition(f).map((g) => g.map((t) => t).sort((a, b) => a - b).join(",")).sort();
      const shown = fam.sets.map((s) => s.keys.map(keyPc).sort((a, b) => a - b).join(",")).sort();
      expect(shown, `${f} from ${from}`).toEqual(brute);
      expect(fam.sets.length).toBe(EXPECT[f].sets);
      expect(fam.perSet).toBe(EXPECT[f].each);
      expect(fam.size).toBe(EXPECT[f].size);
      expect(fam.period).toBe(12 / EXPECT[f].each);
      // every key is in exactly one set
      expect(fam.sets.flatMap((s) => s.keys).sort()).toEqual([...KEYS].sort());
      // and every key's own scale really has its set's notes
      for (const s of fam.sets) for (const k of s.keys)
        expect(setId(buildScale(k, f, 0).pcs), `${k} ${f}`).toBe(s.pcs.join(","));
    }
  });

  it("the route: one key per set, the chosen key and the next half steps up", () => {
    for (const f of PRICE_FAMILIES) for (const from of KEYS) {
      const fam = priceFamily(f, from);
      const route = learnRoute(fam);
      expect(route.length).toBe(EXPECT[f].sets);
      expect(route.map((k) => mod12(keyPc(k) - keyPc(from)))).toEqual(route.map((_, i) => i));
      // the route covers all twelve
      expect(new Set(route.flatMap((k) => setOfKey(fam, k).keys)).size).toBe(12);
    }
    expect(learnRoute(priceFamily("aug", "G"))).toEqual(["G", "Ab", "A", "Bb"]);
    expect(learnRoute(priceFamily("whole", "G"))).toEqual(["G", "Ab"]);
    expect(learnRoute(priceFamily("dim-hw", "G"))).toEqual(["G", "Ab", "A"]);
    expect(routeLine(priceFamily("aug", "G"))).toBe("Learn these 4 and you know all 12 augmented scales.");
    expect(routeLine(priceFamily("whole", "G"))).toBe("Learn these 2 and you know all 12 whole-tone scales.");
    expect(routeLine(priceFamily("dim-wh", "G"))).toBe("Learn these 3 and you know all 12 whole–half octatonics.");
  });

  it("in G: G, B and E♭ augmented; the G whole-tone set and the A♭ set", () => {
    const aug = priceFamily("aug", "G");
    expect(aug.sets.map((s) => s.keys)).toEqual([["G", "B", "Eb"], ["Ab", "C", "E"], ["A", "Db", "F"], ["Bb", "D", "F#"]]);
    expect(sameNotesLine(aug, aug.sets[0])).toBe("G, B and E♭ augmented are the same six notes.");
    const whole = priceFamily("whole", "G");
    expect(whole.sets.map((s) => s.keys)).toEqual([["G", "A", "B", "Db", "Eb", "F"], ["Ab", "Bb", "C", "D", "E", "F#"]]);
    expect(priceFamily("petrushka", "G").sets[0].keys).toEqual(["G", "Db"]);
    expect(priceFamily("dim-hw", "G").sets[0].keys).toEqual(["G", "Bb", "Db", "E"]);
  });
});

describe("the chords a set shares, spelled by the house rules", () => {
  const names = (f: PriceFamilyId, k: string) =>
    sharedTriads(buildScale(k, f, 0).notes).map((c) => `${c.symbol} = ${c.notes}`);

  it("G augmented: G+ = G B D♯, B♭+ = B♭ D F♯, major and minor on G, B and E♭", () => {
    expect(names("aug", "G")).toEqual([
      "G+ = G B D♯", "B♭+ = B♭ D F♯",
      "G = G B D", "B = B D♯ F♯", "E♭ = E♭ G B♭",
      "Gm = G B♭ D", "Bm = B D F♯", "E♭m = E♭ G♭ B♭",
    ]);
    const fam = priceFamily("aug", "G");
    expect(chordsLine(fam, fam.sets[0], sharedTriads(fam.sets[0].scale.notes))).toBe(
      "Two augmented chords and a major and a minor chord on each starting note (G, B and E♭). The same chords from every starting note.");
  });

  it("G whole tone: G+ = G B D♯ and A+ = A C♯ E♯, nothing else", () => {
    expect(names("whole", "G")).toEqual(["G+ = G B D♯", "A+ = A C♯ E♯"]);
  });

  it("every key: the same chords (by sound) from every starting note of a set", () => {
    for (const f of PRICE_FAMILIES) for (const from of KEYS) {
      const fam = priceFamily(f, from);
      for (const s of fam.sets) {
        const bySound = (k: string) => sharedTriads(buildScale(k, f, 0).notes)
          .map((c) => `${c.kind}:${setId(c.pcs)}`).sort().join(" ");
        const first = bySound(s.keys[0]);
        for (const k of s.keys) expect(bySound(k), `${f} ${k}`).toBe(first);
      }
    }
  });

  it("every key: augmented = 2 augmented + major and minor on the three starting notes", () => {
    for (const k of KEYS) {
      const fam = priceFamily("aug", k);
      const set = setOfKey(fam, k);
      const ch = sharedTriads(buildScale(k, "aug", 0).notes);
      const starts = set.keys.map(keyPc).sort((a, b) => a - b);
      const roots = (kind: string) => ch.filter((c) => c.kind === kind).map((c) => pc(c.voicing[0])).sort((a, b) => a - b);
      expect(ch.filter((c) => c.kind === "aug").length, k).toBe(2);
      expect(roots("maj"), k).toEqual(starts);
      expect(roots("min"), k).toEqual(starts);
      // the tonic's augmented chord is named from the tonic, unless that needs
      // a double sharp (B+ would be B D♯ F𝄪, so it is G+ = G B D♯; F♯ gives D+); never a double
      const tonicAug = ch.find((c) => c.kind === "aug" && c.pcs.includes(pc(buildScale(k, "aug", 0).notes[0])))!;
      expect(tonicAug.notes, k).not.toMatch(/𝄪|𝄫/);
      if (!["B", "F#"].includes(k)) expect(tonicAug.voicing.map(noteName)[0], k).toBe(noteName(buildScale(k, "aug", 0).notes[0]));
    }
  });

  it("every key: whole tone holds only two chords, both augmented", () => {
    for (const k of KEYS) {
      const ch = sharedTriads(buildScale(k, "whole", 0).notes);
      expect(ch.map((c) => c.kind), k).toEqual(["aug", "aug"]);
    }
  });

  it("every key: Petrushka = two major chords on its two starting notes; the no-common-name scale two minor", () => {
    for (const k of KEYS) {
      for (const [f, kind] of [["petrushka", "maj"], ["tritone-minor", "min"]] as const) {
        const set = setOfKey(priceFamily(f, k), k);
        const ch = sharedTriads(buildScale(k, f, 0).notes);
        expect(ch.filter((c) => c.kind === kind).map((c) => pc(c.voicing[0])).sort((a, b) => a - b), `${f} ${k}`)
          .toEqual(set.keys.map(keyPc).sort((a, b) => a - b));
        expect(ch.filter((c) => c.kind === "dim").length).toBe(4);
      }
      expect(sharedTriads(buildScale(k, "messiaen5", 0).notes)).toEqual([]);
    }
  });

  it("every key: each scale from a starting note is spelled from that note", () => {
    for (const f of PRICE_FAMILIES) for (const k of KEYS) {
      const fam = priceFamily(f, k);
      for (const s of startScales(fam, setOfKey(fam, k)))
        expect(pc(s.scale.notes[0]), `${f} ${s.key}`).toBe(keyPc(s.key));
    }
  });

  it("every family, every key: every chord is stacked in thirds, with no double sharp or flat", () => {
    const LET = "CDEFGAB";
    for (const f of PRICE_FAMILIES) for (const k of KEYS) {
      for (const c of sharedTriads(buildScale(k, f, 0).notes)) {
        const ns = c.notes.split(" ");
        expect(c.notes, `${f} ${k} ${c.symbol}`).not.toMatch(/𝄪|𝄫/);
        const steps = ns.map((x) => (LET.indexOf(x[0]) - LET.indexOf(ns[0][0]) + 7) % 7);
        expect(steps, `${f} ${k} ${c.symbol} = ${c.notes}`).toEqual([0, 2, 4]);
      }
    }
  });

  it("G half–whole: G° = G B♭ D♭, never G B♭ C♯", () => {
    const dims = sharedTriads(buildScale("G", "dim-hw", 0).notes).filter((c) => c.kind === "dim").map((c) => `${c.symbol} = ${c.notes}`);
    expect(dims).toContain("G° = G B♭ D♭");
    expect(dims).toContain("G♯° = G♯ B D");
    expect(dims.join()).not.toContain("G B♭ C♯");
  });
});
