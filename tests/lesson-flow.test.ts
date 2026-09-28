/**
 * Lesson flow (filming the Hexatonic series): Rhythm cell 1, the pair ladder
 * laid on it, the deep links, the key signatures and the timing of the lights.
 */
import { describe, it, expect } from "vitest";
import { cellHits, layOnCell, RHYTHM_CELL_1 } from "../src/lib/theory/rhythmCell";
import {
  buildParent, findPair, pairKeySignature, pairLadder, pairSlug, parentKeySignature, sixNoteScales,
  signatureOfSeven,
} from "../src/lib/theory/pairAtlas";
import { labMaterial, labFromLink } from "../src/lib/theory/pairLab";
import { upAndBack } from "../src/lib/theory/rhythmCell";
import { LiveTimeline } from "../src/lib/audio/timeline";
import { midi, notePretty } from "../src/lib/theory/note";
import { decodeState } from "../src/lib/useDrill";

const pairIn = (key: string, scale: string, slug: string) => {
  const s = sixNoteScales(key).find((x) => x.id === scale)!;
  return findPair(s.pairs, slug)!;
};

describe("Rhythm cell 1 (Jason's board, page 2)", () => {
  it("is one bar of 4/4: 2 eighths | dotted eighth + sixteenth | eighth rest + eighth | quarter", () => {
    const slots = RHYTHM_CELL_1.slots;
    expect(slots.map((s) => `${s.vex}${s.rest ? "r" : ""}`)).toEqual(["8", "8", "8d", "16", "8r", "8", "q"]);
    expect(slots.reduce((a, s) => a + s.len, 0)).toBe(16);
    // contiguous: each slot starts where the last ended
    slots.forEach((s, i) => { if (i) expect(s.at).toBe(slots[i - 1].at + slots[i - 1].len); });
    // six hits, on these sixteenths
    expect(cellHits(RHYTHM_CELL_1).map((s) => s.at)).toEqual([0, 2, 4, 7, 10, 12]);
  });

  it("the gap variant plays a bar, then leaves a silent bar", () => {
    const lay = layOnCell([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "cell1-gap");
    expect(lay.bars).toBe(4);
    expect(lay.engraving.map((b) => b.gap)).toEqual([false, true, false, true]);
    expect(lay.steps.slice(16, 32).every((s) => !s.hit && s.gap)).toBe(true);
    expect(lay.steps.filter((s) => s.hit !== null).length).toBe(12);
  });
});

describe("the pair ladder on the rhythm", () => {
  const GAm = pairIn("G", "diatonic-3", "G-Am");
  const EmD = pairIn("G", "diatonic-0", "Em-D");

  it("is G, Am, G/B, Am/C, G/D, Am/E, G in G", () => {
    expect(pairLadder(GAm).map((s) => s.label)).toEqual(["G", "Am", "G/B", "Am/C", "G/D", "Am/E", "G"]);
  });

  it("up and back is twelve chords: two bars of Rhythm cell 1, one chord per hit", () => {
    const m = labMaterial(EmD, { dir: "up-down", material: "ladder", rhythm: "cell1", lh: false });
    expect(m.layout.bars).toBe(2);
    const struck = m.layout.steps.filter((s) => s.hit).map((s) => s.hit!.label);
    expect(struck).toEqual(["Em", "D/F♯", "Em/G", "D/A", "Em/B", "D", "Em", "D", "Em/B", "D/A", "Em/G", "D/F♯"]);
  });

  it("one per beat is three bars, a chord on every beat", () => {
    const m = labMaterial(GAm, { dir: "up-down", material: "ladder", rhythm: "straight", lh: false });
    expect(m.layout.bars).toBe(3);
    m.layout.steps.forEach((s, i) => expect(!!s.hit).toBe(i % 4 === 0));
  });

  it("the left hand walks the scale under the ladder, never above its lowest note", () => {
    const m = labMaterial(GAm, { dir: "up-down", material: "ladder", rhythm: "straight", lh: true });
    const lh = m.items.map((it) => it!.lh.map(notePretty).join());
    expect(lh).toEqual(["G", "A", "B", "C", "D", "E", "G", "E", "D", "C", "B", "A"]);
    const lowestChord = Math.min(...m.steps.flatMap((s) => s.voicing));
    m.items.forEach((it) => it!.lh.forEach((n) => expect(midi(n)).toBeLessThanOrEqual(lowestChord)));
  });

  it("lights exactly on the beat at 60 and 120 bpm: every hit is found at its own time", () => {
    for (const bpm of [60, 120]) {
      const m = labMaterial(EmD, { dir: "up-down", material: "ladder", rhythm: "cell1", lh: false });
      const stepDur = 60 / bpm / 4;
      const tl = new LiveTimeline<number>(
        () => ({ stepDur, beatSteps: 4, barSteps: 16, length: m.layout.steps.length, loop: true }),
        () => true, 0, 10);
      m.layout.steps.forEach((s, i) => {
        if (!s.hit) return;
        const t = 10 + i * stepDur;                 // when the engine strikes it
        expect(tl.locate(t)!.index).toBe(i);        // lit at that very moment
        if (i > 0) expect(tl.locate(t - 0.002)!.index).toBe(i - 1); // and not a moment before
      });
      // beat 2's sixteenth lands three quarters of the way through the beat
      expect(7 * stepDur).toBeCloseTo((60 / bpm) * 1.75, 9);
    }
  });
});

describe("links and signatures", () => {
  it("pairs are named in links by their chords, either order", () => {
    const aug = pairIn("G", "aug-0", "Gaug-Bbaug");
    expect(aug.symbol).toBe("G+ + B♭+");
    expect(pairSlug(pairIn("Ab", "diatonic-3", "Ab-Bbm"))).toBe("Ab-Bbm");
    expect(pairIn("G", "diatonic-0", "D-Em").symbol).toBe("Em + D");
  });

  it("reads the lab settings from a link", () => {
    expect(labFromLink(new URLSearchParams("bpm=76&v=block&rh=gap&lh=1&dir=up&m=ladder")))
      .toEqual({ bpm: 76, voicing: "block", rhythm: "cell1-gap", lh: true, dir: "up", material: "ladder" });
    expect(labFromLink(new URLSearchParams("bpm=999&v=x&rh=abc"))).toEqual({});
  });

  it("writes a pair in the key its name promises", () => {
    expect(pairKeySignature(pairIn("G", "diatonic-3", "G-Am"), "C")).toBe("G");   // no 7: F♯ is the removed note
    expect(pairKeySignature(pairIn("G", "diatonic-0", "Em-D"), null)).toBe("G");
    expect(pairKeySignature(pairIn("Ab", "diatonic-3", "Ab-Bbm"), null)).toBe("Ab");
    expect(pairKeySignature(pairIn("G", "diatonic-4", "Gm-F"), null)).toBe("Bb");  // G minor: two flats
    expect(pairKeySignature(pairIn("G", "diatonic-2", "Cm-Bb"), null)).toBe("Bb");
    expect(pairKeySignature(pairIn("G", "mixo-0", "Em-Dm"), null)).toBe("C");     // G Mixolydian (no 4)
    expect(signatureOfSeven(sixNoteScales("G")[0].notes)).toBeNull();
    expect(parentKeySignature(buildParent("D", "dorian"))).toBe("C");
    expect(parentKeySignature(buildParent("A", "harmonic"))).toBe("C");
    expect(parentKeySignature(buildParent("A", "melodic"))).toBe("C");
    expect(parentKeySignature(buildParent("E", "phrygian"))).toBe("C");
  });

  it("a filming link on Practice is never read as an old link", () => {
    expect(decodeState("k=G&stage=1").mode).toBe(0);
    expect(decodeState("k=G").mode).toBe(4); // pre-September links still open as they did
  });

  it("Practice's rhythm cell plays the scale up and back: twelve notes, two bars", () => {
    const s = sixNoteScales("G").find((x) => x.id === "diatonic-0")!;
    const line = upAndBack(s.notes);
    expect(line.map(notePretty)).toEqual(["G", "A", "B", "D", "E", "F♯", "G", "F♯", "E", "D", "B", "A"]);
    expect(layOnCell(line, "cell1").bars).toBe(2);
  });
});

import { arrivalScale } from "../src/lib/sharedScale";

describe("a link beats what was remembered", () => {
  const hirajoshi = { key: "Eb", family: "hirajoshi", mode: 0 };
  it("a linked scale is never replaced by the remembered one", () => {
    for (const q of ["?tab=pairs&src=six&k=G&s=diatonic-0&pair=Em-D", "?k=G&f=whole", "?k=G&scale=diatonic:0", "?pair=Em-D&k=G"])
      expect(arrivalScale(q, hirajoshi)).toEqual({ key: "G", family: "", mode: 0 });
  });
  it("a key alone keeps the remembered scale", () => {
    expect(arrivalScale("?k=G", hirajoshi)).toEqual({ key: "G", family: "hirajoshi", mode: 0 });
    expect(arrivalScale("", hirajoshi)).toEqual(hirajoshi);
    expect(arrivalScale("?k=Q", null)).toBeNull();
  });
});
