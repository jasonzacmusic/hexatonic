/**
 * Ragas and the symmetric diminished scales.
 *
 * The data-model point: every other scale in the app has ONE note list, because
 * a Western scale ascends and descends through the same notes. A raga does not.
 */
import { describe, it, expect } from "vitest";
import { RAGAS, buildRaga, ragaLine, spellSwaras } from "../src/lib/theory/ragas";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import { noteName, pc, primeForm } from "../src/lib/theory/note";

const names = (ns: any[]) => ns.map(noteName).join(" ");

describe("ragas — ascent and descent can differ", () => {
  it("Pushpalathika on C is the minor hexatonic, both directions", () => {
    const r = buildRaga("C", "pushpalathika");
    expect(names(r.arohana)).toBe("C D Eb F G Bb");
    expect(names(r.avarohana)).toBe("Bb G F Eb D C");
    expect(r.ascentOnly).toHaveLength(0);
    expect(r.descentOnly).toHaveLength(0);
  });
  it("Sriranjani is panchama-varjya — it has the A and lacks the G", () => {
    const r = buildRaga("C", "sriranjani");
    const pcs = r.notes.map(pc);
    expect(pcs).toContain(9);        // A present
    expect(pcs).not.toContain(7);    // G absent
    expect(names(r.arohana)).not.toBe(names(buildRaga("C", "pushpalathika").arohana));
  });
  it("Kambhoji is shadava-sampurna — six up, seven down", () => {
    const r = buildRaga("C", "kambhoji");
    expect(r.arohana).toHaveLength(6);
    expect(r.avarohana).toHaveLength(7);
    expect(r.descentOnly.map(noteName)).toEqual(["Bb"]);   // Ni only in the descent
  });
  it("Bahudari is shadava-audava — six up, five down", () => {
    const r = buildRaga("C", "bahudari");
    expect(r.arohana).toHaveLength(6);
    expect(r.avarohana).toHaveLength(5);
    expect(r.ascentOnly.map(noteName)).toEqual(["A"]);     // Dha only in the ascent
  });
  it("vakra ragas repeat a swara inside the line", () => {
    const dev = buildRaga("C", "devamanohari");
    expect(dev.raga.vakra).toBe(true);
    const desc = dev.raga.avarohana;
    expect(new Set(desc).size).toBeLessThan(desc.length);  // a swara repeats
  });
  it("every raga spells without error from every Sa", () => {
    for (const r of RAGAS)
      for (const sa of KEYS) {
        const inst = buildRaga(sa, r.id);
        expect(inst.error, `${r.name} on ${sa}`).toBeUndefined();
        expect(inst.notes.length).toBeGreaterThan(4);
      }
  });
  it("the playable line goes up the arohana and down the avarohana", () => {
    const line = ragaLine(buildRaga("C", "bahudari"), 1);
    expect(noteName(line[0])).toBe("C");
    expect(noteName(line[line.length - 1])).toBe("C");
    expect(line.length).toBe(6 + 1 + 5);
  });
  it("the jati label matches the actual note counts", () => {
    const size: Record<string, number> = { audava: 5, shadava: 6, sampurna: 7 };
    for (const r of RAGAS) {
      const [up, down] = r.jati.split("-");
      const inst = buildRaga("C", r.id);
      expect(new Set(inst.arohana.map(pc)).size, `${r.name} ascent`).toBe(size[up]);
      expect(new Set(inst.avarohana.map(pc)).size, `${r.name} descent`).toBe(size[down]);
    }
  });
});

describe("symmetric diminished — spelled by search, not by template", () => {
  it("C whole-half and half-whole spell cleanly", () => {
    expect(names(buildScale("C", "dim-wh").notes)).toBe("C D Eb F Gb Ab A B");
    expect(names(buildScale("C", "dim-hw").notes)).toBe("C C# D# E F# G A Bb");
  });
  it("prefers consistent accidentals where consistency is possible", () => {
    // A symmetric scale cannot always be spelled with one accidental type in
    // seven letters — that is a property of the scale, not a defect. But the
    // search should still find the consistent spelling wherever one exists.
    // C, A and Eb all have one; before the octave-wrap fix, A did not get it.
    for (const k of ["C", "A", "Eb"]) {
      const ns = buildScale(k, "dim-wh").notes;
      const sharp = ns.some((n) => n.alt > 0), flat = ns.some((n) => n.alt < 0);
      expect(sharp && flat, `${k} -> ${names(ns)}`).toBe(false);
    }
    expect(names(buildScale("A", "dim-wh").notes)).toBe("A B C D Eb F Gb Ab");
  });
  it("no root in any key needs a double accidental", () => {
    for (const k of KEYS)
      for (const id of ["dim-wh", "dim-hw"]) {
        const s = buildScale(k, id);
        expect(s.error, `${k} ${id}`).toBeUndefined();
        expect(s.notes.every((n) => Math.abs(n.alt) <= 1), `${k} ${id} -> ${names(s.notes)}`).toBe(true);
      }
  });
  it("really is symmetric — only three distinct transpositions", () => {
    const s = buildScale("C", "dim-wh");
    const seen = new Set<string>();
    for (let t = 0; t < 12; t++)
      seen.add(s.pcs.map((p) => (p + t) % 12).sort((a, b) => a - b).join(","));
    expect(seen.size).toBe(3);
  });
  it("is NOT any of Barry Harris's scales", () => {
    const dim = primeForm(buildScale("C", "dim-wh").pcs).join(",");
    for (const bh of [[0,2,4,5,7,8,9,11],[0,2,3,5,7,8,9,11],[0,2,4,5,7,8,10,11],[0,2,4,5,6,8,10,11]])
      expect(primeForm(bh).join(",")).not.toBe(dim);
  });
});
