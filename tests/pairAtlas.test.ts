/**
 * Two-triad pairs: every pair the Harmony tab lists comes from a real scale,
 * shares no note, and makes exactly six notes. Checked in all twelve keys.
 */
import { describe, expect, it } from "vitest";
import {
  buildParent, ladderEvents, PAIR_BEATS, pairLadder, parentPairs, PARENTS, provePair,
  scaleEvents, sixNoteScales, TwoChordPair,
} from "../src/lib/theory/pairAtlas";
import { KEYS } from "../src/lib/theory/scales";
import { Letter, LETTERS, letterIndex, noteName, notePretty, pc } from "../src/lib/theory/note";

const stepL = (l: Letter, k: number) => LETTERS[(letterIndex(l) + k) % 7] as Letter;
const pcs = (ns: { letter: Letter; alt: number; octave: number }[]) =>
  [...new Set(ns.map((n) => pc(n as any)))].sort((a, b) => a - b);
const names = (ns: any[]) => ns.map(notePretty).join(" ");

/** A triad on paper: root, root + 2 letters, root + 4 letters. */
function spelledInThirds(p: TwoChordPair) {
  return p.shapes.every((s) =>
    s.notes.every((n, i) => n.letter === stepL(s.root.letter, i * 2)) && s.notes[0] === s.root);
}

describe("pairs inside a parent scale", () => {
  it("lists exactly the disjoint triad pairs of the parent, in all 12 keys and 9 parents", () => {
    for (const key of KEYS) for (const parent of PARENTS) {
      const ps = buildParent(key, parent.id);
      const where = `${key} ${parent.name}`;
      expect(ps.notes, where).toHaveLength(7);
      expect(new Set(ps.notes.map((n) => n.letter)).size, where).toBe(7);
      expect(ps.notes.some((n) => Math.abs(n.alt) > 1), `${where} double accidental`).toBe(false);

      /* The exhaustive search: every one of the 21 pairs of the parent's own
         triads that shares no note — and nothing else — is listed. */
      const expected = new Set<string>();
      for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) {
        const a = pcs(ps.triads[i].notes);
        const b = pcs(ps.triads[j].notes);
        if (a.every((x) => !b.includes(x))) expected.add([ps.triads[i].symbol, ps.triads[j].symbol].sort().join("|"));
      }
      const pairs = parentPairs(ps);
      expect(new Set(pairs.map((p) => p.shapes.map((s) => s.symbol).sort().join("|"))), where).toEqual(expected);
      expect(pairs, where).toHaveLength(7);

      const parentPcs = ps.notes.map(pc);
      for (const p of pairs) {
        const proof = provePair(p, parentPcs);
        expect(proof, `${where} ${p.symbol}`).toEqual({ disjoint: true, covers: true, inside: true });
        expect(spelledInThirds(p), `${where} ${p.symbol} spelling`).toBe(true);
        /* The one note left out is the parent note not in the six. */
        expect(p.removed && !pcs(p.notes).includes(pc(p.removed)), `${where} ${p.symbol} removed`).toBe(true);
        expect(pcs([...p.notes, p.removed!]), where).toEqual([...parentPcs].sort((a, b) => a - b));
        /* Neighbouring triads interleave, so Jason's stepwise ladder always works. */
        expect(p.stepwise, `${where} ${p.symbol} stepwise`).toBe(true);
        /* Every parent it fits really holds the six notes plus that one note. */
        expect(p.rootless || p.fits[0]?.parent.id === parent.id, `${where} ${p.symbol} fits`).toBe(true);
        for (const f of p.fits)
          expect(f.parent.semis.map((s) => (s + pc(ps.tonic)) % 12).sort((a, b) => a - b))
            .toEqual(pcs([...p.notes, f.add]));
      }
    }
  });

  it("spells every pair note exactly as its parent does: one letter per note, in all keys", () => {
    for (const key of KEYS) for (const parent of PARENTS) {
      const ps = buildParent(key, parent.id);
      const own = new Map(ps.notes.map((n) => [pc(n), noteName(n)]));
      for (const p of parentPairs(ps)) {
        const where = `${key} ${parent.name} ${p.symbol}`;
        expect(new Set(p.notes.map((n) => n.letter)).size, where).toBe(6);
        for (const n of [...p.notes, ...p.shapes.flatMap((s) => s.notes)])
          expect(noteName(n), where).toBe(own.get(pc(n)));
      }
    }
    const bLyd = parentPairs(buildParent("B", "lydian")).find((p) => p.roman === "I + II")!;
    expect(names(bLyd.notes)).toBe("B C♯ D♯ E♯ F♯ G♯");
    const dbPhr = buildParent("Db", "phrygian");
    expect(names(dbPhr.notes)).toBe("C♯ D E F♯ G♯ A B");
    expect(parentPairs(dbPhr).find((p) => p.roman === "i + ♭II")!.symbol).toBe("C♯m + D");
  });

  it("reads G major the way the brief does: G + Am = G A B C D E, no F♯, the Sunday Scale", () => {
    const ps = buildParent("G", "ionian");
    const [first] = parentPairs(ps);
    expect(first.symbol).toBe("G + Am");
    expect(first.roman).toBe("I + ii");
    expect(names(first.notes)).toBe("G A B C D E");
    expect(notePretty(first.removed!)).toBe("F♯");
    expect(first.name).toBe("Sunday Scale (no 7)");
    expect(first.modal).toBe("Ionian/Mixolydian hexatonic");
    expect(first.fits.map((f) => `${f.parent.name} +${notePretty(f.add)}`)).toEqual(["Major +F♯", "Mixolydian +F"]);
  });

  it("orders G major by usefulness: home chord, IV + V, the rest, rootless last, diminished after", () => {
    expect(parentPairs(buildParent("G", "ionian")).map((p) => `${p.roman} ${p.symbol} no ${notePretty(p.removed!)}`))
      .toEqual([
        "I + ii G + Am no F♯",
        "IV + V C + D no B",
        "iii + IV Bm + C no A",
        "V + vi D + Em no C",
        "ii + iii Am + Bm no G",
        "I + vii° G + F♯° no E",
        "vi + vii° Em + F♯° no D",
      ]);
  });

  it("names IV + V as major without its 3rd, found only in major and melodic minor", () => {
    const p = parentPairs(buildParent("C", "ionian")).find((x) => x.roman === "IV + V")!;
    expect(names(p.notes)).toBe("C D F G A B");
    expect(p.name).toBe("Major (no 3)");
    expect(p.fits.map((f) => `${f.parent.name} +${notePretty(f.add)}`)).toEqual(["Major +E", "Melodic minor +E♭"]);
  });

  it("finds every pair Jason's 2025 lesson played, each in its own mode", () => {
    const find = (key: string, id: string, roman: string) =>
      parentPairs(buildParent(key, id)).find((p) => p.roman === roman)!;
    expect(find("Bb", "ionian", "I + ii").symbol).toBe("B♭ + Cm");
    expect(find("A", "aeolian", "i + ♭VII").symbol).toBe("Am + G");
    expect(find("G", "dorian", "i + ii").symbol).toBe("Gm + Am");
    expect(find("G", "lydian", "I + II").symbol).toBe("G + A");
    expect(find("G", "phrygian", "i + ♭II").symbol).toBe("Gm + A♭");
    expect(find("G", "mixolydian", "I + ♭VII").symbol).toBe("G + F");
    expect(find("A", "aeolian", "i + ♭VII").name).toBe("Minor (no 6)");
    expect(find("G", "lydian", "I + II").name).toBe("Lydian (no 7)");
  });

  it("writes Roman numerals from the parent key", () => {
    const romans = (id: string) => buildParent("G", id).triads.map((t) => t.roman).join(" ");
    expect(romans("ionian")).toBe("I ii iii IV V vi vii°");
    expect(romans("dorian")).toBe("i ii ♭III IV v vi° ♭VII");
    expect(romans("aeolian")).toBe("i ii° ♭III iv v ♭VI ♭VII");
    expect(romans("harmonic")).toBe("i ii° ♭III+ iv V ♭VI vii°");
    expect(romans("melodic")).toBe("i ii ♭III+ IV V vi° vii°");
    expect(romans("lydian")).toBe("I II iii ♯iv° V vi vii");
    expect(romans("locrian")).toBe("i° ♭II ♭iii iv ♭V ♭VI ♭vii");
  });

  it("respells a parent from the enharmonic tonic when that reads with fewer accidentals", () => {
    const db = buildParent("Db", "dorian");
    expect(noteName(db.tonic)).toBe("C#");
    expect(db.notes.map(noteName)).toEqual(["C#", "D#", "E", "F#", "G#", "A#", "B"]);
    expect(buildParent("Db", "ionian").notes.map(noteName)[0]).toBe("Db");
    expect(buildParent("Eb", "locrian").notes.map(noteName)[0]).toBe("D#");
  });
});

describe("every six-note scale the app has, split into two triads", () => {
  const G = sixNoteScales("G");
  const byName = (n: string) => G.find((s) => s.name === n)!;
  const splits = (n: string) => byName(n).pairs.map((p) => p.symbol);

  it("Sunday Scale splits into I + ii and nothing else (C + Em share E and G)", () => {
    expect(splits("Sunday Scale (no 7)")).toEqual(["G + Am"]);
    expect(byName("Sunday Scale (no 7)").pairs[0].roman).toBe("I + ii");
  });

  it("whole tone is two augmented triads a whole step apart", () => {
    const p = byName("Whole tone").pairs;
    expect(p).toHaveLength(1);
    expect(p[0].shapes.map((s) => s.quality)).toEqual(["aug", "aug"]);
    /* A whole step either way: F+ (F A C♯) reads better than A+ (A C♯ E♯). */
    expect([2, 10]).toContain((pc(p[0].shapes[1].root) - pc(p[0].shapes[0].root) + 12) % 12);
    expect(p[0].symbol).toBe("G+ + F+");
    expect(names(p[0].notes)).toBe("G A B C♯ D♯ F");
  });

  it("augmented scale: two augmented triads a semitone apart, and three major + minor splits", () => {
    const p = byName("Augmented").pairs;
    const aug = p.find((x) => x.shapes.every((s) => s.quality === "aug"))!;
    const iv = (pc(aug.shapes[1].root) - pc(aug.shapes[0].root) + 12) % 12;
    expect([1, 3, 5, 7, 9, 11]).toContain(iv);           // odd distance: a semitone (or a minor 3rd) apart
    expect(aug.shapes.map((s) => pcs(s.notes).join()).sort())
      .toEqual([[2, 6, 10].join(), [3, 7, 11].join()].sort());
    expect(p.filter((x) => x.plain)).toHaveLength(3);
    expect(p).toHaveLength(4);
  });

  it("Petrushka is two major triads a tritone apart", () => {
    const p = byName("Petrushka (tritone pair)").pairs;
    expect(p).toHaveLength(1);
    expect(p[0].shapes.map((s) => s.quality)).toEqual(["maj", "maj"]);
    expect((pc(p[0].shapes[1].root) - pc(p[0].shapes[0].root) + 12) % 12).toBe(6);
  });

  it("names the scales two triads cannot make, with the sus chord they need", () => {
    const none = G.filter((s) => !s.pairs.length).map((s) => s.name);
    expect(none).toEqual(["Blues", "Major blues", "Messiaen mode 5"]);
    expect(byName("Blues").susSplits).toContain("Gsus4 + B♭m");
    for (const s of G.filter((x) => !x.pairs.length)) expect(s.susSplits.length, s.name).toBeGreaterThan(0);
  });

  it("holds in all twelve keys: same splits, every note inside the scale, spelled as chords", () => {
    const shape = (k: string) => sixNoteScales(k).map((s) => `${s.id}:${s.pairs.length}`).join(" ");
    for (const key of KEYS) {
      expect(shape(key), key).toBe(shape("G"));
      for (const s of sixNoteScales(key)) {
        for (const p of s.pairs) {
          expect(provePair(p, s.notes.map(pc)), `${key} ${s.name} ${p.symbol}`)
            .toEqual({ disjoint: true, covers: true, inside: true });
          expect(spelledInThirds(p), `${key} ${s.name} ${p.symbol}`).toBe(true);
          expect(pc(p.shapes[0].notes[0]) === pc(s.tonic) || p.shapes[0].notes.some((n) => pc(n) === pc(s.tonic)),
            `${key} ${s.name} shape A holds the tonic`).toBe(true);
        }
      }
    }
  });
});

describe("the ladder, as Jason plays it", () => {
  const pairOf = (key: string, id: string, roman: string) =>
    parentPairs(buildParent(key, id)).find((p) => p.roman === roman)!;

  it("B♭ Sunday Scale: B♭, Cm, B♭/D, Cm/E♭, B♭/F, Cm/G, B♭", () => {
    const steps = pairLadder(pairOf("Bb", "ionian", "I + ii"));
    expect(steps.map((s) => s.label)).toEqual(["B♭", "Cm", "B♭/D", "Cm/E♭", "B♭/F", "Cm/G", "B♭"]);
    expect(steps.map((s) => s.inversion)).toEqual([0, 0, 1, 1, 2, 2, 0]);
  });

  it("A minor (no 6): Am, then G enters in first inversion", () => {
    expect(pairLadder(pairOf("A", "aeolian", "i + ♭VII")).map((s) => s.label))
      .toEqual(["Am", "G/B", "Am/C", "G/D", "Am/E", "G", "Am"]);
  });

  it("every voice steps to the next note of the six, in every parent and key", () => {
    for (const key of KEYS) for (const parent of PARENTS) for (const p of parentPairs(buildParent(key, parent.id))) {
      const steps = pairLadder(p);
      const six = pcs(p.notes);
      for (let i = 1; i < steps.length; i++)
        for (let v = 0; v < 3; v++) {
          const from = steps[i - 1].voicing[v];
          const to = steps[i].voicing[v];
          expect(to, `${key} ${parent.name} ${p.symbol}`).toBeGreaterThan(from);
          /* nothing of the six lies strictly between: it is the next note up */
          for (let m = from + 1; m < to; m++) expect(six.includes(m % 12)).toBe(false);
        }
      expect(steps[6].voicing).toEqual(steps[0].voicing.map((m) => m + 12));
      for (const s of steps) expect(s.voicing.every((m) => six.includes(m % 12))).toBe(true);
    }
  });

  it("fills whole bars, so a change lands on a downbeat", () => {
    const p = pairOf("G", "ionian", "I + ii");
    const steps = pairLadder(p);
    expect(ladderEvents(steps, "up-down")).toHaveLength(12);
    expect(ladderEvents(steps, "up")).toHaveLength(8);
    expect(scaleEvents(p)).toHaveLength(12);
    for (const ev of [ladderEvents(steps, "up-down"), ladderEvents(steps, "up"), scaleEvents(p)])
      expect(ev.length % PAIR_BEATS).toBe(0);
    expect(scaleEvents(p).map((e) => e.label).join(" ")).toBe("G A B C D E G E D C B A");
  });

  it("walks the symmetric pairs too", () => {
    const whole = sixNoteScales("G").find((s) => s.name === "Whole tone")!.pairs[0];
    expect(pairLadder(whole).map((s) => s.label)).toEqual(["G+", "F+/A", "G+/B", "F+/C♯", "G+/D♯", "F+", "G+"]);
  });
});
