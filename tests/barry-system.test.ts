/**
 * The sixth–diminished SYSTEM of Barry Harris, as the Harmony tab teaches it.
 * Every chord and name on that tab comes from src/lib/theory/barrySystem.ts;
 * each claim is checked here the way a musician would check it on paper.
 */
import { describe, it, expect } from "vitest";
import {
  barryRoots, barryScale, barrySplit, BORROWINGS, borrowedChord, diminishedFamily, FAMILY_INFO,
  FAMILY_ORDER, harmonisedScale, harmonisedWithBorrowing, inversionLadder, keySignatureFor,
  bebopDominant, rootsByFourths, sameRoot, tetradName, tetradPairsCovering, voice, VoicingKind,
} from "../src/lib/theory/barrySystem";
import { buildScale } from "../src/lib/theory/scales";
import { midi, Note, noteName, pc } from "../src/lib/theory/note";

const N = (ns: Note[]) => ns.map(noteName).join(" ");
const mod = (n: number) => ((n % 12) + 12) % 12;
const WHITE_ACC = /^(Cb|Fb|E#|B#)$/;

/* ── a. the scale, in all twelve roots ─────────────────────────────────── */

const SPELLED: Record<string, Record<string, string>> = {
  major6: {
    C: "C D E F G Ab A B", Db: "Db Eb F Gb Ab A Bb C", D: "D E F# G A Bb B C#",
    Eb: "Eb F G Ab Bb B C D", E: "E F# G# A B C C# D#", F: "F G A Bb C Db D E",
    "F#": "F# G# A# B C# D D# E#", G: "G A B C D Eb E F#", Ab: "Ab Bb C Db Eb E F G",
    A: "A B C# D E F F# G#", Bb: "Bb C D Eb F Gb G A", B: "B C# D# E F# G G# A#",
  },
  minor6: {
    C: "C D Eb F G Ab A B", "C#": "C# D# E F# G# A A# B#", D: "D E F G A Bb B C#",
    Eb: "Eb F Gb Ab Bb B C D", E: "E F# G A B C C# D#", F: "F G Ab Bb C Db D E",
    "F#": "F# G# A B C# D D# E#", G: "G A Bb C D Eb E F#", "G#": "G# A# B C# D# E E# G",
    A: "A B C D E F F# G#", Bb: "Bb C Db Eb F Gb G A", B: "B C# D E F# G G# A#",
  },
  dominant7: {
    C: "C D E F G Ab Bb B", Db: "Db Eb F Gb Ab A Cb C", D: "D E F# G A Bb C C#",
    Eb: "Eb F G Ab Bb B Db D", E: "E F# G# A B C D D#", F: "F G A Bb C Db Eb E",
    "F#": "F# G# A# B C# D E E#", G: "G A B C D Eb F F#", Ab: "Ab Bb C Db Eb E Gb G",
    A: "A B C# D E F G G#", Bb: "Bb C D Eb F Gb Ab A", B: "B C# D# E F# G A A#",
  },
  dominant7b5: {
    C: "C D E F Gb Ab Bb B", Db: "Db Eb F Gb G A Cb C", D: "D E F# G Ab Bb C C#",
    Eb: "Eb F G Ab A B Db D", E: "E F# G# A Bb C D D#", F: "F G A Bb Cb Db Eb E",
    "F#": "F# G# A# B C D E E#", G: "G A B C Db Eb F F#", Ab: "Ab Bb C Db D E Gb G",
    A: "A B C# D Eb F G G#", Bb: "Bb C D Eb Fb Gb Ab A", B: "B C# D# E F G A A#",
  },
};

describe("a. the four scales, spelled in all twelve roots", () => {
  it("the degree formulas are the ones Barry teaches", () => {
    expect(FAMILY_INFO.major6.degrees.join(" ")).toBe("1 2 3 4 5 b6 6 7");
    expect(FAMILY_INFO.minor6.degrees.join(" ")).toBe("1 2 b3 4 5 b6 6 7");
    expect(FAMILY_INFO.dominant7.degrees.join(" ")).toBe("1 2 3 4 5 b6 b7 7");
    expect(FAMILY_INFO.dominant7b5.degrees.join(" ")).toBe("1 2 3 4 b5 b6 b7 7");
  });

  it("every root is spelled exactly as a player would write it", () => {
    for (const f of FAMILY_ORDER) {
      expect(barryRoots(f)).toHaveLength(12);
      for (const r of barryRoots(f)) expect(N(barryScale(r, f).notes), `${r} ${f}`).toBe(SPELLED[f][r]);
    }
  });

  it("the spelling matches the degree formula, semitone for semitone", () => {
    const SEMI: Record<string, number> = { "1": 0, "2": 2, b3: 3, "3": 4, "4": 5, b5: 6, "5": 7, b6: 8, "6": 9, b7: 10, "7": 11 };
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const s = barryScale(r, f).notes;
        s.forEach((n, i) =>
          expect(mod(pc(n) - pc(s[0])), `${r} ${f} ${i}`).toBe(SEMI[FAMILY_INFO[f].degrees[i]]));
        for (let i = 1; i < 8; i++) expect(midi(s[i])).toBeGreaterThan(midi(s[i - 1]));
      }
  });

  it("no double accidentals; C♭ F♭ E♯ B♯ only where the chord or the leading note needs them", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const bs = barryScale(r, f);
        const keep = new Set([...bs.chord, bs.notes[7]].map(noteName));
        for (const n of bs.notes) {
          expect(Math.abs(n.alt), `${r} ${f}`).toBeLessThan(2);
          if (WHITE_ACC.test(noteName(n))) expect(keep.has(noteName(n)), `${r} ${f}: ${noteName(n)}`).toBe(true);
        }
        if (r.endsWith("b") || r === "F")
          expect(bs.notes.some((n) => n.alt > 0), `${r} ${f} mixes in sharps`).toBe(false);
      }
  });

  it("the minor family reads C♯ and G♯, never D♭ minor with its F♭", () => {
    expect(barryRoots("minor6")).toContain("C#");
    expect(barryRoots("minor6")).toContain("G#");
    expect(barryRoots("minor6")).not.toContain("Db");
    expect(sameRoot("Db", "minor6")).toBe("C#");
    expect(sameRoot("C#", "major6")).toBe("Db");
  });

  it("the parent chord and the diminished, and the same-notes line from Jason's class", () => {
    const g = barryScale("G", "major6");
    expect([g.chordSymbol, N(g.chord), g.dimSymbol, N(g.dim), g.relative])
      .toEqual(["G6", "G B D E", "F#dim7", "F# A C Eb", "Em7"]);
    expect(barryScale("C", "major6").relative).toBe("Am7");       // C6 = Am7
    expect(barryScale("C", "minor6").relative).toBe("Am7b5");     // Cm6 = Am7♭5
    expect(barryScale("G", "dominant7").relative).toBeNull();
    expect(barryScale("Ab", "major6").dimSymbol).toBe("Gdim7");    // the 7th degree, always
  });

  it("the diminished is always built on the 7th, a semitone below the root", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const bs = barryScale(r, f);
        expect(mod(pc(bs.root) - pc(bs.dim[0]))).toBe(1);
        const d = bs.dim.map(pc);
        for (let i = 1; i < 4; i++) expect(mod(d[i] - d[i - 1])).toBe(3);
      }
  });

  it("round the keys climbs in fourths and visits all twelve", () => {
    const ks = rootsByFourths("G", "major6");
    expect(ks.join(" ")).toBe("G C F Bb Eb Ab Db F# B E A D");
    expect(rootsByFourths("G", "minor6").join(" ")).toBe("G C F Bb Eb G# C# F# B E A D");
    expect(new Set(ks.map((k) => pc(barryScale(k, "major6").root))).size).toBe(12);
  });

  it("key signatures: the root's major key; the relative major for the minor family", () => {
    expect(keySignatureFor("G", "major6")).toBe("G");
    expect(keySignatureFor("G", "minor6")).toBe("Bb");
    expect(keySignatureFor("C#", "minor6")).toBe("E");
    expect(keySignatureFor("F#", "dominant7")).toBe("F#");
  });
});

/* ── b. the harmonised scale ───────────────────────────────────────────── */

describe("b. the harmonised scale alternates the two chords", () => {
  it("G major 6: G6 under 1 3 5 6, F♯°7 under 2 4 ♭6 7, melody on top", () => {
    const h = harmonisedScale("G", "major6");
    expect(h).toHaveLength(9);
    expect(h.map((c) => c.symbol).join(" ")).toBe("G6 F#dim7 G6 F#dim7 G6 F#dim7 G6 F#dim7 G6");
    expect(h.map((c) => noteName(c.top)).join(" ")).toBe("G A B C D Eb E F# G");
    expect(N(h[0].notes)).toBe("B D E G");
    expect(N(h[1].notes)).toBe("C Eb F# A");
  });

  it("in every key and family: strict alternation, close position, every voice one step up", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const bs = barryScale(r, f);
        const chordPcs = new Set(bs.chord.map(pc));
        const dimPcs = new Set(bs.dim.map(pc));
        const h = harmonisedScale(r, f);
        h.forEach((c, i) => {
          expect(c.isDiminished).toBe(i % 2 === 1);
          const want = c.isDiminished ? dimPcs : chordPcs;
          expect(c.notes.every((n) => want.has(pc(n))), `${r} ${f} ${i}`).toBe(true);
          expect(new Set(c.notes.map(pc)).size).toBe(4);
          expect(midi(c.notes[3]) - midi(c.notes[0])).toBeLessThan(12);
          expect(noteName(c.top)).toBe(noteName(bs.notes[i % 8]));
        });
        for (let i = 1; i < h.length; i++)
          for (let v = 0; v < 4; v++) {
            const gap = midi(h[i].notes[v]) - midi(h[i - 1].notes[v]);
            expect(gap, `${r} ${f} step ${i} voice ${v}`).toBeGreaterThanOrEqual(1);
            expect(gap).toBeLessThanOrEqual(2);
          }
      }
  });
});

/* ── c. drop voicings ─────────────────────────────────────────────────── */

describe("c. drop 2, drop 3, drop 2 & 4", () => {
  const close = harmonisedScale("C", "major6")[6].notes; // melody A: C E G A
  const at = (ns: Note[]) => ns.map((n) => noteName(n) + n.octave).join(" ");

  it("close C6 with A on top is C E G A", () => {
    expect(at(close)).toBe("C4 E4 G4 A4");
  });
  it("drop 2 drops the SECOND NOTE FROM THE TOP (G) an octave", () => {
    expect(at(voice(close, "drop2"))).toBe("G3 C4 E4 A4");
  });
  it("drop 3 drops the third from the top (E)", () => {
    expect(at(voice(close, "drop3"))).toBe("E3 C4 G4 A4");
  });
  it("drop 2 & 4 drops the second and the fourth from the top (G and C)", () => {
    expect(at(voice(close, "drop24"))).toBe("C3 G3 E4 A4");
  });

  it("everywhere: same four notes, melody unmoved, the dropped voice exactly an octave down", () => {
    const kinds: VoicingKind[] = ["drop2", "drop3", "drop24"];
    const fromTop: Record<string, number[]> = { drop2: [2], drop3: [3], drop24: [2, 4] };
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f))
        for (const c of harmonisedScale(r, f)) {
          const desc = [...c.notes].sort((a, b) => midi(b) - midi(a)).map(midi);
          for (const k of kinds) {
            const v = voice(c.notes, k).map(midi);
            expect(v.map(mod).sort()).toEqual(c.notes.map((n) => mod(midi(n))).sort());
            expect(Math.max(...v)).toBe(desc[0]);
            const dropped = fromTop[k].map((i) => desc[i - 1] - 12);
            for (const d of dropped) expect(v).toContain(d);
            expect(v.filter((m) => m < Math.min(...desc)).sort()).toEqual([...dropped].sort());
          }
        }
  });
});

/* ── d. the inversion ladder ──────────────────────────────────────────── */

describe("d. the 6th chord through its inversions, the diminished between", () => {
  it("G6, F♯°7, G6/B, F♯°7, G6/D, F♯°7, G6/E, F♯°7, G6", () => {
    const l = inversionLadder("G", "major6");
    expect(l.map((c) => c.symbol).join(" "))
      .toBe("G6 F#dim7 G6/B F#dim7 G6/D F#dim7 G6/E F#dim7 G6");
    expect(l.filter((c) => !c.isDiminished).map((c) => c.label))
      .toEqual(["root position", "1st inversion", "2nd inversion", "3rd inversion", "root position"]);
    expect(midi(l[8].notes[0]) - midi(l[0].notes[0])).toBe(12);
  });
  it("the bass climbs the scale and every voice moves one step, in every key", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const l = inversionLadder(r, f);
        const s = barryScale(r, f).notes;
        l.forEach((c, i) => expect(pc(c.notes[0])).toBe(pc(s[i % 8])));
        for (let i = 1; i < l.length; i++)
          for (let v = 0; v < 4; v++) {
            const gap = midi(l[i].notes[v]) - midi(l[i - 1].notes[v]);
            expect(gap).toBeGreaterThanOrEqual(1);
            expect(gap).toBeLessThanOrEqual(2);
          }
      }
  });
});

/* ── e. borrowing ─────────────────────────────────────────────────────── */

describe("e. borrowing from the diminished", () => {
  it("G6 borrows F♯ for maj7, A for 6/9, both for maj9", () => {
    expect([borrowedChord("G", "major6", "maj7")].map((b) => `${b.symbol} ${N(b.notes)}`)[0]).toBe("Gmaj7 G B D F#");
    const six9 = borrowedChord("G", "major6", "6/9");
    expect(`${six9.symbol} ${N(six9.notes)} ${six9.rootless}`).toBe("G6/9 A B D E true");
    expect(borrowedChord("G", "major6", "maj9").symbol).toBe("Gmaj9");
  });
  it("the minor, dominant and 7♭5 equivalents are named for what they are", () => {
    const names = (f: any) => BORROWINGS[f as keyof typeof BORROWINGS].map((b) => borrowedChord("C", f, b.id).symbol);
    expect(names("major6")).toEqual(["Cmaj7", "C6/9", "Cmaj9"]);
    expect(names("minor6")).toEqual(["Cm(maj7)", "Cm6/9", "Cm(maj9)"]);
    expect(names("dominant7")).toEqual(["C9", "C7#5", "C9#5"]);
    expect(names("dominant7b5")).toEqual(["C9b5", "C7#5", "C9#5"]);
    expect(N(borrowedChord("C", "dominant7", "7#5").notes)).toBe("C E Ab Bb");
    expect(N(borrowedChord("C", "dominant7b5", "9b5").notes)).toBe("D E Gb Bb");
  });
  it("in all twelve roots: the name matches the notes, and the new note comes from the diminished", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const bs = barryScale(r, f);
        const dimPcs = new Set(bs.dim.map(pc));
        for (const b of BORROWINGS[f]) {
          const got = borrowedChord(r, f, b.id);
          expect(got.symbol, `${r} ${f}`).toBe(noteName(bs.root) + b.id);
          expect(tetradName(got.notes, bs.root)?.symbol).toBe(got.symbol);
          for (const [, to] of got.moves) expect(dimPcs.has(pc(to))).toBe(true);
          for (const n of got.notes) expect(Math.abs(n.alt)).toBeLessThan(2);
        }
      }
  });
  it("over the harmonised scale: the diminished stays, the melody never moves", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f))
        for (const b of BORROWINGS[f]) {
          const plain = harmonisedScale(r, f);
          const bor = harmonisedWithBorrowing(r, f, b.id);
          bor.forEach((c, i) => {
            expect(noteName(c.top) + c.top.octave).toBe(noteName(plain[i].top) + plain[i].top.octave);
            if (c.isDiminished) expect(c.symbol).toBe(plain[i].symbol);
            expect(tetradName(c.notes, barryScale(r, f).root)?.symbol ?? c.symbol).toBe(c.symbol);
          });
        }
  });
  it("G major 6 with maj7 borrowed, round the scale", () => {
    expect(harmonisedWithBorrowing("G", "major6", "maj7").map((c) => c.symbol).join(" "))
      .toBe("Gmaj7 F#dim7 Gmaj7 F#dim7 Gmaj7 F#dim7 G6 F#dim7 Gmaj7");
  });
});

/* ── f. the family ────────────────────────────────────────────────────── */

describe("f. one diminished, four names, four parents", () => {
  it("F♯°7, A°7, C°7, D♯°7 resolve to G6, B♭6, D♭6, E6; as D7, F7, A♭7, B7", () => {
    const fam = diminishedFamily("G", "major6");
    expect(fam.map((m) => `${m.dimSymbol}>${m.parentSymbol}`).join(" "))
      .toBe("F#dim7>G6 Adim7>Bb6 Cdim7>Db6 D#dim7>E6");
    expect(fam.map((m) => m.dominantSymbol).join(" ")).toBe("D7 F7 Ab7 B7");
  });
  it("in every key: same four pitches, parents a minor third apart, each dominant is the dim with one note down", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const fam = diminishedFamily(r, f);
        const dimSet = fam[0].dim.map(pc).sort().join(",");
        fam.forEach((m, i) => {
          expect(m.dim.map(pc).sort().join(","), `${r} ${f}`).toBe(dimSet);
          expect(mod(pc(m.parent[0]) - pc(fam[0].parent[0]))).toBe(3 * i);
          expect(mod(pc(m.parent[0]) - pc(m.dim[0]))).toBe(1);
          const dom = m.dominant.map(pc);
          expect(dom.filter((p) => m.dim.some((d) => pc(d) === p))).toHaveLength(3);
          expect(mod(pc(m.lowered[0]) - pc(m.lowered[1]))).toBe(1);
          expect(mod(dom[0] - pc(m.parent[0]))).toBe(7);       // V7 of the parent
          const [from, to] = m.resolution;
          for (let v = 0; v < 4; v++) {
            const gap = midi(to[v]) - midi(from[v]);
            expect(gap).toBeGreaterThanOrEqual(1);
            expect(gap).toBeLessThanOrEqual(2);
          }
          for (const n of [...m.dim, ...m.parent, ...m.dominant]) expect(Math.abs(n.alt)).toBeLessThan(2);
        });
      }
  });
});

/* ── two chords, eight notes ───────────────────────────────────────────── */

describe("two chords, eight notes", () => {
  it("every Barry scale is its parent chord plus its diminished: no shared note, all eight covered", () => {
    for (const f of FAMILY_ORDER)
      for (const r of barryRoots(f)) {
        const { a, b } = barrySplit(r, f);
        const A = new Set(a.notes.map(pc)), B = new Set(b.notes.map(pc));
        expect([...A].some((p) => B.has(p))).toBe(false);
        const all = new Set([...A, ...B]);
        expect([...all].sort().join()).toBe([...new Set(barryScale(r, f).notes.map(pc))].sort().join());
        expect(all.size).toBe(8);
        const found = tetradPairsCovering(barryScale(r, f).notes)
          .some((p) => [p.a, p.b].some((x) => x.symbol.endsWith("dim7")));
        expect(found, `${r} ${f}`).toBe(true);
      }
  });
  it("G6 = G B D E plus F♯°7 = F♯ A C E♭", () => {
    const { a, b } = barrySplit("G", "major6");
    expect(`${a.symbol} ${N(a.notes)} + ${b.symbol} ${N(b.notes)}`).toBe("G6 G B D E + F#dim7 F# A C Eb");
  });
  it("the octatonic is two diminished 7ths, in all three transpositions", () => {
    for (const k of ["C", "Db", "D"]) {
      const s = buildScale(k, "dim-hw", 0);
      const pairs = tetradPairsCovering(s.notes);
      const twoDims = pairs.filter((p) => p.a.symbol.endsWith("dim7") && p.b.symbol.endsWith("dim7"));
      expect(twoDims, k).toHaveLength(1);
      expect(pairs.length).toBe(8);   // and it splits eight ways in all
    }
  });
  it("the bebop dominant splits as 7 + m6 but holds no diminished 7th, so it is not Barry's", () => {
    expect(N(bebopDominant("G"))).toBe("G A B C D E F F#");
    const pairs = tetradPairsCovering(bebopDominant("C"));
    expect(pairs.some((p) => [p.a.symbol, p.b.symbol].sort().join("+") === "C7+Dm6")).toBe(true);
    expect(pairs.some((p) => p.a.symbol.endsWith("dim7") || p.b.symbol.endsWith("dim7"))).toBe(false);
  });
  it("a scale that is not eight notes has no split", () => {
    expect(tetradPairsCovering(buildScale("C", "diatonic", 0).notes)).toEqual([]);
  });
});
