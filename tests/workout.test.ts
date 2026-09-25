/**
 * The Workout page makes claims out loud in class. Each one is locked here as
 * the rule it states, not as a snapshot of today's output.
 */
import { describe, expect, it } from "vitest";
import {
  knockOut, identify, neighbours, barryLens, harmonizeDegrees, maskOf, pcsOf,
  catalog, practiceQuery, PARENTS, commonTones,
} from "../src/lib/theory/workout";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import { decodeState } from "../src/lib/useDrill";
import { decodeCustom } from "../src/lib/theory/custom";
import { noteName, pc, intervalVector } from "../src/lib/theory/note";

const names = (ns: { letter: string; alt: number }[]) => ns.map((n) => noteName(n as any)).join(" ");

describe("knock one out", () => {
  it("major and natural minor each have exactly two tritone-free rows, in every key", () => {
    for (const k of KEYS) {
      expect(knockOut(k, "major").filter((r) => r.tritones === 0).map((r) => r.removedDegree))
        .toEqual(["4", "7"]);
      expect(knockOut(k, "minor").filter((r) => r.tritones === 0).map((r) => r.removedDegree))
        .toEqual(["2", "b6"]);
    }
  });

  it("harmonic and melodic minor have NO tritone-free row — two disjoint tritones", () => {
    for (const k of KEYS) for (const p of ["harmonic", "melodic"]) {
      const rows = knockOut(k, p);
      expect(rows).toHaveLength(7);
      expect(rows.every((r) => r.tritones >= 1)).toBe(true);
    }
  });

  it("every row has six notes, loses exactly the note it names, and reports its own tritones", () => {
    for (const k of KEYS) for (const p of PARENTS) for (const r of knockOut(k, p.id)) {
      expect(r.notes).toHaveLength(6);
      expect(r.notes.map(pc)).not.toContain(pc(r.removedNote));
      expect(r.tritones).toBe(intervalVector(r.notes.map(pc))[5]);
      expect(new Set(r.notes.map((n) => n.letter)).size).toBe(6);
    }
  });

  it("C major without 4 is the Ionian/Lydian hexatonic and A minor without ♭6", () => {
    const row = knockOut("C", "major")[3];
    expect(names(row.notes)).toBe("C D E G A B");
    expect(row.names).toContain("C Ionian/Lydian Hexatonic");
    expect(row.names).toContain("A natural minor without ♭6");
  });

  it("counts an augmented triad once, not once per symmetric reading", () => {
    const row = knockOut("C", "harmonic")[5]; // without b6: C D Eb F G B
    expect(row.triads.aug).toBe(1);
  });
});

describe("identity and neighbours", () => {
  it("C blues and E♭ major blues are one set", () => {
    const m = maskOf(buildScale("C", "blues").pcs);
    expect(identify(m).map((e) => e.name)).toEqual(
      expect.arrayContaining(["C Blues hexatonic", "E♭ Major blues hexatonic"]));
  });

  it("every neighbour shares exactly five notes and names the one move", () => {
    for (const k of ["C", "F#", "Bb"]) {
      const m = maskOf(buildScale(k, "diatonic", 0).pcs);
      const nb = neighbours(m);
      expect(nb.length).toBeGreaterThan(5);
      for (const n of nb) {
        expect(commonTones(m, n.mask)).toHaveLength(5);
        expect(pcsOf(m)).toContain(n.drop);
        expect(pcsOf(n.mask)).toContain(n.add);
        expect(n.move).toBeGreaterThanOrEqual(1);
        expect(n.move).toBeLessThanOrEqual(6);
      }
      for (let i = 1; i < nb.length; i++) expect(nb[i].move).toBeGreaterThanOrEqual(nb[i - 1].move);
    }
  });

  it("the diatonic hexachord's tritone-free neighbours are the other diatonic hexachords, a tritone move away", () => {
    const m = maskOf(buildScale("C", "diatonic", 0).pcs);
    const clean = neighbours(m).filter((n) => intervalVector(pcsOf(n.mask))[5] === 0);
    expect(clean.every((n) => n.move === 6)).toBe(true);
    expect(clean.length).toBe(2);
  });

  it("every catalogue practice link decodes to the same set it names", () => {
    for (const e of catalog()) {
      const s = decodeState(e.practice);
      const built = s.family === "custom"
        ? buildScale(s.key, "custom", 0, decodeCustom(s.custom))
        : buildScale(s.key, s.family, s.mode);
      expect(maskOf(built.pcs), e.name).toBe(e.mask);
    }
  });

  it("a row that loses its tonic is re-rooted on its lowest note", () => {
    const q = practiceQuery("C", [2, 4, 5, 7, 9, 11]);
    const s = decodeState(q);
    expect(s.key).toBe("D");
    expect(maskOf(buildScale(s.key, "custom", 0, decodeCustom(s.custom)).pcs))
      .toBe(maskOf([2, 4, 5, 7, 9, 11]));
  });
});

describe("harmonisation", () => {
  it("in C D E G A B only D and B carry no triad of their own", () => {
    const h = harmonizeDegrees(buildScale("C", "diatonic", 0).notes);
    expect(h.filter((d) => d.rooted.length === 0).map((d) => noteName(d.note))).toEqual(["D", "B"]);
  });

  it("every chord offered under a melody note contains it and puts it on top", () => {
    for (const fam of ["diatonic", "blues", "blues-major", "aug"]) {
      const s = buildScale("Eb", fam, 0);
      for (const d of harmonizeDegrees(s.notes)) for (const u of d.under) {
        const top = u.voicing[u.voicing.length - 1];
        expect(((top % 12) + 12) % 12).toBe(pc(d.note));
        expect(Math.max(...u.voicing)).toBe(top);
      }
    }
  });
});

describe("the Barry Harris lens", () => {
  it("C D E G A B sits inside exactly the C6 and G6 sixth-diminished scales", () => {
    const lens = barryLens(buildScale("C", "diatonic", 0).notes);
    expect(lens.map((b) => b.chordSymbol).sort()).toEqual(["C6", "G6"]);
    const c6 = lens.find((b) => b.chordSymbol === "C6")!;
    expect(c6.chordTones).toEqual(["C", "E", "G", "A"]);
    expect(c6.dimTones).toEqual(["D", "B"]);
    expect(c6.missing).toEqual(["F", "Ab"]);
  });

  it("the notes with no triad of their own are the diminished tones", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "diatonic", 0);
      const orphan = harmonizeDegrees(s.notes).filter((d) => d.rooted.length === 0).map((d) => pc(d.note)).sort();
      const home = barryLens(s.notes).find((b) => b.family === "major6" && pc(s.notes[0]) === pc(buildScale(b.root, "diatonic", 0).notes[0]))!;
      expect(home.dimTones.map((n) => pc(buildScale(n, "diatonic", 0).notes[0])).sort()).toEqual(orphan);
    }
  });

  it("every melody chord has that melody note on top, and dim steps are the dim tones", () => {
    for (const fam of ["diatonic", "blues", "blues-major"]) {
      for (const b of barryLens(buildScale("F", fam, 0).notes)) {
        for (const m of b.melody) {
          const top = Math.max(...m.voicing) % 12;
          expect(top).toBe(pc(buildScale(m.note, "diatonic", 0).notes[0]));
          expect(m.isDiminished).toBe(b.dimTones.includes(m.note));
        }
      }
    }
  });
});
