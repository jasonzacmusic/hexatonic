/**
 * Locks for the Harmony and Improvise rebuild (25 Sep 2026).
 *
 * Every sentence those pages print is computed from these functions, so each
 * claim is checked here the way a musician would check it on paper.
 */
import { describe, it, expect } from "vitest";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import {
  buildSixthDim, closeVoicing, drop2, fitSixthDim, harmoniseMelody, SIXTH_DIMINISHED,
} from "../src/lib/theory/barryharris";
import {
  chordsUnderEachNote, lostTriads, stackInThirds, triadPairsCovering,
} from "../src/lib/theory/chords";
import { buildVamp, nextChange, vampById, vampsFor, VAMPS } from "../src/lib/theory/vamps";
import { chordsInsideScale, twelveBar } from "../src/lib/theory/blues";
import { midi, noteName, pc } from "../src/lib/theory/note";

const J = (ns: { letter: string; alt: number }[]) => ns.map((n: any) => noteName(n)).join(" ");
const letters = "CDEFGAB";
const letterGap = (a: string, b: string) => (letters.indexOf(b) - letters.indexOf(a) + 7) % 7;

/* ── sixth–diminished ─────────────────────────────────────────────────── */

describe("the four eight-note scales spell properly in all 12 keys", () => {
  it("no double accidentals anywhere, and no sharps in a flat key", () => {
    for (const k of KEYS)
      for (const f of SIXTH_DIMINISHED) {
        const s = buildSixthDim(k, f.id);
        expect(s.some((n) => Math.abs(n.alt) === 2), `${k} ${f.id}: ${J(s)}`).toBe(false);
        if (k === "F" || k.endsWith("b"))
          expect(s.some((n) => n.alt > 0), `${k} ${f.id}: ${J(s)}`).toBe(false);
      }
  });
  it("D♭ major 6 diminished is D♭ E♭ F G♭ A♭ A B♭ C (no B𝄫)", () => {
    expect(J(buildSixthDim("Db", "major6"))).toBe("Db Eb F Gb Ab A Bb C");
  });
  it("C keeps the textbook spellings", () => {
    expect(J(buildSixthDim("C", "major6"))).toBe("C D E F G Ab A B");
    expect(J(buildSixthDim("C", "dominant7"))).toBe("C D E F G Ab Bb B");
  });
});

describe("major without 4 in all 12 keys: the 6th chord, the diminished, the two added notes", () => {
  /* Checked by hand: the parent is the major 6th on the tonic, the diminished
     sits a semitone below the tonic, and the scale adds the 4th and the ♭6. */
  const EXPECT: Record<string, [string, string, string, string, string]> = {
    C:  ["C6",  "C E G A",     "Bdim7",  "B D F Ab",    "F Ab"],
    G:  ["G6",  "G B D E",     "F#dim7", "F# A C Eb",   "C Eb"],
    D:  ["D6",  "D F# A B",    "C#dim7", "C# E G Bb",   "G Bb"],
    A:  ["A6",  "A C# E F#",   "G#dim7", "G# B D F",    "D F"],
    E:  ["E6",  "E G# B C#",   "D#dim7", "D# F# A C",   "A C"],
    B:  ["B6",  "B D# F# G#",  "A#dim7", "A# C# E G",   "E G"],
    "F#": ["F#6", "F# A# C# D#", "E#dim7", "E# G# B D", "B D"],
    Db: ["Db6", "Db F Ab Bb",  "Adim7",  "A C Eb Gb",   "Gb A"],
    Ab: ["Ab6", "Ab C Eb F",   "Edim7",  "E G Bb Db",   "Db E"],
    Eb: ["Eb6", "Eb G Bb C",   "Bdim7",  "B D F Ab",    "Ab B"],
    Bb: ["Bb6", "Bb D F G",    "Adim7",  "A C Eb Gb",   "Eb Gb"],
    F:  ["F6",  "F A C D",     "Edim7",  "E G Bb Db",   "Bb Db"],
  };
  for (const k of KEYS) {
    it(`${k}`, () => {
      const fit = fitSixthDim(buildScale(k, "diatonic", 0).notes)[0];
      const [sym, chord, dimSym, dim, added] = EXPECT[k];
      expect(fit.chordSymbol).toBe(sym);
      expect(J(fit.chord)).toBe(chord);
      expect(fit.dimSymbol).toBe(dimSym);
      expect(J(fit.dim)).toBe(dim);
      expect(J(fit.added)).toBe(added);
      // the 6th chord reads as a chord on paper: root, 3rd, 5th, 6th by letter
      expect(fit.chord.map((n, i) => letterGap(fit.chord[0].letter, n.letter))).toEqual([0, 2, 4, 5]);
      // the diminished reads as stacked thirds by letter
      expect(fit.dim.map((n) => letterGap(fit.dim[0].letter, n.letter))).toEqual([0, 2, 4, 6]);
      // and it really is a diminished 7th: minor thirds all the way
      const d = fit.dim.map(pc);
      expect([1, 2, 3].map((i) => (d[i] - d[i - 1] + 12) % 12)).toEqual([3, 3, 3]);
    });
  }
});

describe("drop 2 is the second note from the top, dropped an octave", () => {
  it("holds for every chord, every key, every scale that fits", () => {
    for (const k of KEYS)
      for (const mode of [0, 3, 4]) {
        const s = buildScale(k, "diatonic", mode);
        for (const fit of fitSixthDim(s.notes))
          for (const c of harmoniseMelody(s.notes, fit)) {
            const close = c.close.map(midi);
            // close position: four notes inside one octave, melody on top
            expect(close).toHaveLength(4);
            expect(close[3] - close[0]).toBeLessThan(12);
            expect(close[3]).toBe(midi(c.melody));
            // drop 2
            const d2 = c.drop2.map(midi);
            expect(d2).toEqual([close[2] - 12, close[0], close[1], close[3]]);
            expect(c.drop2[0].letter).toBe(c.close[2].letter);
          }
      }
  });
  it("G6 with G on top: close B D E G, drop 2 E B D G", () => {
    const fit = fitSixthDim(buildScale("G", "diatonic", 0).notes)[0];
    const close = closeVoicing({ letter: "G", alt: 0, octave: 4 }, fit.chord);
    expect(close.map((n) => noteName(n) + n.octave).join(" ")).toBe("B3 D4 E4 G4");
    expect(drop2(close).map((n) => noteName(n) + n.octave).join(" ")).toBe("E3 B3 D4 G4");
  });
});

describe("harmonising the melody", () => {
  it("G major without 4: the 6th chord under chord tones, the diminished under the rest", () => {
    const s = buildScale("G", "diatonic", 0);
    const fit = fitSixthDim(s.notes)[0];
    expect(harmoniseMelody(s.notes, fit).map((c) => `${noteName(c.melody)}:${c.symbol}`)).toEqual([
      "G:G6", "A:F#dim7", "B:G6", "D:G6", "E:G6", "F#:F#dim7", "G:G6",
    ]);
  });
  it("borrowing names the chord it makes, and never moves the melody", () => {
    const s = buildScale("G", "diatonic", 0);
    const fit = fitSixthDim(s.notes)[0];
    const maj7 = harmoniseMelody(s.notes, fit, "maj7");
    expect(maj7[0].symbol).toBe("Gmaj7");
    expect(J(maj7[0].close)).toBe("B D F# G");
    expect(maj7[0].change).toBe("E→F#");
    // E is the 6th: with E in the melody the chord stays G6
    expect(maj7[4].symbol).toBe("G6");
    const add9 = harmoniseMelody(s.notes, fit, "add9");
    expect(add9[1].symbol).toBe("F#dim7");                 // the diminished never borrows
    expect(add9[2].symbol).toBe("G6/9 (no root)");
    expect(new Set(add9[2].close.map(pc))).toEqual(new Set([11, 2, 4, 9]));  // B D E A
    for (const c of [...maj7, ...add9]) expect(midi(c.close[3])).toBe(midi(c.melody));
  });
  it("minor, honestly: 1 2 ♭3 4 5 ♭7 fits E♭6 (= Cm7), not Cm6; 1 2 ♭3 4 5 6 fits Cm6", () => {
    const dorAeo = fitSixthDim(buildScale("C", "diatonic", 4).notes);
    expect(dorAeo.some((f) => f.chordSymbol === "Cm6")).toBe(false);
    expect(dorAeo[0].chordSymbol).toBe("Eb6");
    expect(dorAeo[0].tonicReading).toBe("Cm7");
    const noSeven = fitSixthDim(buildScale("C", "custom", 0, [0, 2, 3, 5, 7, 9]).notes);
    expect(noSeven[0].chordSymbol).toBe("Cm6");
    expect(harmoniseMelody(buildScale("C", "custom", 0, [0, 2, 3, 5, 7, 9]).notes, noSeven[0], "maj7")[0].symbol)
      .toBe("Cm(maj7)");
  });
  it("the augmented scale fits no sixth–diminished scale", () => {
    for (const k of KEYS) expect(fitSixthDim(buildScale(k, "aug", 0).notes)).toEqual([]);
  });
});

/* ── chords in the scale ──────────────────────────────────────────────── */

describe("chords in the scale are computed for the mode on screen", () => {
  it("G major without 4 loses Am, C and F♯°, all of which needed C", () => {
    const s = buildScale("G", "diatonic", 0);
    const parent = [...s.notes, s.removed!];
    expect(lostTriads(parent, s.notes).map((c) => c.names[0].symbol).sort()).toEqual(["Am", "C", "F#dim"]);
  });
  it("the no-3rd mode keeps a Dm (the old fixed text said otherwise)", () => {
    const s = buildScale("C", "diatonic", 1);    // C D F G A Bb
    const under = chordsUnderEachNote(s.notes);
    expect(under.some((d) => d.rooted.includes("Dm"))).toBe(true);
  });
  it("stacks the scale in thirds and names the missing link", () => {
    const g = stackInThirds(buildScale("G", "diatonic", 0).notes);
    expect(J(g.notes)).toBe("G B D F# A E");
    expect(g.degrees).toEqual(["1", "3", "5", "7", "9", "13"]);
    expect(g.missing).toEqual(["11"]);
    const minor = stackInThirds(buildScale("G", "diatonic", 4).notes);
    expect(minor.degrees).toEqual(["1", "♭3", "5", "♭7", "9", "11"]);
    expect(minor.missing).toEqual(["13"]);
    expect(stackInThirds(buildScale("G", "blues", 0).notes).degrees).toEqual([]);
  });
  it("D + Em is the only triad pair that makes G A B D E F♯", () => {
    const covers = triadPairsCovering(buildScale("G", "diatonic", 0).pcs);
    expect(covers).toHaveLength(1);
    expect(covers[0]).toEqual({ a: { root: 2, qual: "maj" }, b: { root: 4, qual: "min" } });
  });
});

/* ── improvise ────────────────────────────────────────────────────────── */

describe("the six beds", () => {
  it("there are six, each a different job", () => {
    expect(VAMPS.map((v) => v.id)).toEqual(["drone", "two", "four", "sus", "swing", "blues"]);
  });
  it("the drone is root and fifth only", () => {
    const s = buildScale("G", "diatonic", 0);
    const [step] = buildVamp(s, vampById("drone"), "rootless");
    expect(new Set(step.chord.voicing.map((m) => m % 12))).toEqual(new Set([7, 2]));
    expect(step.chord.bass % 12).toBe(7);
  });
  it("the four-chord loop has four different chords from the scale", () => {
    const s = buildScale("G", "diatonic", 3);   // G A B C D E
    const loop = buildVamp(s, vampById("four"), "rootless");
    expect(loop.map((x) => x.roman)).toEqual(["I", "vi", "IV", "ii"]);
  });
  it("the suspended pad has no 3rd", () => {
    for (let mode = 0; mode < 6; mode++) {
      const s = buildScale("G", "diatonic", mode);
      for (const step of buildVamp(s, vampById("sus"), "rootless")) {
        const root = pc(s.notes[step.chord.degreeRoot]);
        expect(step.chord.chordTones).not.toContain((root + 3) % 12);
        expect(step.chord.chordTones).not.toContain((root + 4) % 12);
      }
    }
  });
  it("no bed but the blues plays a note outside the scale, in any key or mode", () => {
    for (const k of KEYS)
      for (let mode = 0; mode < 6; mode++) {
        const s = buildScale(k, "diatonic", mode);
        const allowed = new Set(s.pcs);
        for (const v of vampsFor(s))
          for (const step of buildVamp(s, v, "spread"))
            for (const m of [...step.chord.voicing, step.chord.bass])
              expect(allowed.has(m % 12), `${k} m${mode} ${v.id}`).toBe(true);
      }
  });
  it("counts the beats to the next chord", () => {
    // two chords of two bars in 4/4: bar 1 beat 1 is 8 beats from chord 2
    expect(nextChange([2, 2], 1, 1, 4)).toEqual({ beats: 8, index: 1 });
    expect(nextChange([2, 2], 2, 3, 4)).toEqual({ beats: 2, index: 1 });
    expect(nextChange([2, 2], 4, 4, 4)).toEqual({ beats: 1, index: 0 });
    expect(nextChange([4], 1, 1, 4)).toBeNull();
    // the blues: from bar 1, the first NEW chord is F7 in bar 5
    const bars = twelveBar("C", false);
    expect(nextChange(bars.map(() => 1), 1, 1, 4, bars.map((b) => b.symbol))).toEqual({ beats: 16, index: 4 });
  });
});

describe("the blues line is computed, and true", () => {
  it("none of the three chords fits inside either blues scale, in any key", () => {
    for (const k of KEYS)
      for (const fam of ["blues", "blues-major"])
        for (const quick of [false, true])
          expect(chordsInsideScale(buildScale(k, fam, 0).pcs, twelveBar(k, quick))).toEqual([]);
  });
});
