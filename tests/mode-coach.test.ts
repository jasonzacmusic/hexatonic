/**
 * "How to practise this mode": every line of the card, for every family, every
 * mode and every key, checked against the scale's own notes.
 */
import { describe, expect, it } from "vitest";
import { FAMILIES, KEYS, modeCount } from "../src/lib/theory/scales";
import { COLOUR, colourKey, earLevelFor, practiseCard } from "../src/lib/modeCoach";
import { notePretty, pc } from "../src/lib/theory/note";
import { buildParent, findPair, parentPairs, sixNoteScales } from "../src/lib/theory/pairAtlas";
import { FAMILY_LEVELS, MODE_LEVELS } from "../src/lib/ear/games";
import { soundById } from "../src/lib/ear/sounds";
import { decodeState } from "../src/lib/useDrill";

const EVERY = FAMILIES.flatMap((f) => Array.from({ length: modeCount(f) }, (_, m) => [f.id, m] as const));
const P = (ns: { note: Parameters<typeof notePretty>[0] }[]) => ns.map((x) => notePretty(x.note)).join(" ");

describe("every scale, every mode, every key", () => {
  it("has a colour entry, and every colour note is one of the scale's own notes", () => {
    for (const [f, m] of EVERY) {
      const want = COLOUR[colourKey(f, m)];
      expect(want, `${f}:${m}`).toBeDefined();
      for (const k of KEYS) {
        const c = practiseCard(k, f, m);
        expect(c.colour.length, `${k} ${c.title}`).toBe(want.length);
        const have = new Set(c.scale.pcs);
        for (const x of c.colour) expect(have.has(pc(x.note))).toBe(true);
      }
    }
  });

  it("the pair's two chords are the scale's notes; the red notes are not; the drone holds a real 5th", () => {
    for (const [f, m] of EVERY) for (const k of KEYS) {
      const c = practiseCard(k, f, m);
      const have = new Set(c.scale.pcs);
      const tonic = c.scale.notes[0];
      if (c.pair) {
        const chord = c.pair.pair.shapes.flatMap((s) => s.notes.map(pc));
        for (const p of chord) expect(have.has(p), `${k} ${c.title} ${c.pair.pair.symbol}`).toBe(true);
        expect(new Set(chord).size).toBe(6);
        if (c.scale.notes.length === 6) expect(c.pair.leavesOut).toBeNull();
        else expect(have.has(pc(c.pair.leavesOut!))).toBe(true);
        /* never the tonic left out */
        expect(new Set(chord).has(pc(tonic)), `${k} ${c.title}`).toBe(true);
      } else expect(c.pairWhy === null || c.pairWhy.length > 20, `${k} ${c.title}`).toBe(true);
      for (const a of c.avoid) expect(have.has(pc(a.note)), `${k} ${c.title} avoid`).toBe(false);
      expect(c.drone[0]).toEqual(tonic);
      if (c.drone.length === 2) expect((pc(c.drone[1]) - pc(tonic) + 12) % 12).toBe(7);
      else expect(have.has((pc(tonic) + 7) % 12)).toBe(false);
    }
  });

  it("every link opens the drill it names", () => {
    for (const [f, m] of EVERY) for (const k of KEYS) {
      const c = practiseCard(k, f, m);
      const st = decodeState(c.practiceHref.split("?")[1]);
      expect([st.key, st.family, st.mode, st.pattern]).toEqual([k, f, m, "thirds"]);
      if (!c.pair) continue;
      const q = new URLSearchParams(c.pair.href.split("?")[1]);
      expect(q.get("tab")).toBe("pairs");
      const list = q.get("src") === "six"
        ? sixNoteScales(q.get("k")!).find((s) => s.id === q.get("s"))!.pairs
        : parentPairs(buildParent(q.get("k")!, q.get("s")!));
      expect(findPair(list, q.get("pair"))?.symbol, `${k} ${c.title}`).toBe(c.pair.pair.symbol);
    }
  });
});

describe("the cards say what Jason teaches", () => {
  it("G Major (no 4): B and F♯, D + Em, hold G and D, leave out C", () => {
    const c = practiseCard("G", "diatonic", 0);
    expect(P(c.colour)).toBe("B F♯");
    expect(c.pair!.pair.shapes.map((s) => s.symbol).sort()).toEqual(["D", "Em"]);
    expect(c.drone.map(notePretty)).toEqual(["G", "D"]);
    expect(P(c.avoid)).toBe("C");
  });
  it("the Sunday Scale is G + Am, and Phrygian (no 5th) has no 5th to hold", () => {
    expect(practiseCard("G", "diatonic", 3).pair!.pair.symbol).toBe("G + Am");
    const ph = practiseCard("G", "diatonic", 5);
    expect(ph.drone.map(notePretty)).toEqual(["G"]);
    expect(ph.droneLine).toContain("no perfect 5th");
    expect(P(ph.avoid)).toBe("D");
  });
  it("seven-note modes keep their colour: D Dorian Dm + Em (no C), G Mixolydian F + G (no E)", () => {
    const dor = practiseCard("D", "hepta", 1);
    expect(dor.pair!.pair.shapes.map((s) => s.symbol).sort()).toEqual(["Dm", "Em"]);
    expect(notePretty(dor.pair!.leavesOut!)).toBe("C");
    const mix = practiseCard("G", "hepta", 4);
    expect(mix.pair!.pair.shapes.map((s) => s.symbol).sort()).toEqual(["F", "G"]);
    expect(notePretty(mix.pair!.leavesOut!)).toBe("E");
    expect(practiseCard("G", "hepta", 0).pair!.pair.shapes.map((s) => s.symbol).sort()).toEqual(["D", "Em"]);
  });
  it("the pentatonic's red notes are the two it leaves out", () => {
    expect(P(practiseCard("C", "penta", 0).avoid)).toBe("F B");
    expect(P(practiseCard("A", "penta", 4).avoid)).toBe("B F");
  });
});

describe("the Ear level link", () => {
  it("points at a level whose choices include the scale", () => {
    for (const [f, m] of EVERY) {
      const e = earLevelFor(f, m);
      if (!e) continue;
      const ids = (e.game === "mode" ? MODE_LEVELS : FAMILY_LEVELS)[e.level - 1];
      const hit = ids.some((id) => {
        if (id === f && f !== "diatonic") return true;
        try { const s = soundById(id); return s.family === f && (f !== "diatonic" || practiseCard("C", f, m).scale.pcs.map((p) => p).join() === s.semis.join()); }
        catch { return false; }
      });
      expect(hit, `${f}:${m} → ${e.game} ${e.level}`).toBe(true);
    }
    for (let m = 0; m < 6; m++) expect(earLevelFor("diatonic", m)?.game).toBe("mode");
    expect(earLevelFor("diatonic", 5)).toEqual({ game: "mode", level: 3 });
  });
});
