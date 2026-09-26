import { describe, expect, it } from "vitest";
import {
  chordRole, degreeLabels, optionById, ownSpellingFirst, prettyDegrees, SCALE_OPTIONS, stackLine,
} from "../src/app/harmony/scaleOptions";
import { DIATONIC_MODES, FAMILIES, KEYS } from "../src/lib/theory/scales";
import {
  chordsUnderEachNote, findChords, lostTriads, stackInThirds, susQuartal, tertianOnly,
} from "../src/lib/theory/chords";
import { midi, noteName, pc } from "../src/lib/theory/note";
import { harmonicFunction } from "../src/lib/theory/functions";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** "♭3" → 3 semitones: read a degree label back into a distance from the tonic. */
const semisOf = (d: string) => {
  const m = /^([♭♯]*)([1-7])$/.exec(d);
  if (!m) throw new Error(`not a degree: ${d}`);
  const shift = [...m[1]].reduce((a, ch) => a + (ch === "♭" ? -1 : 1), 0);
  return (((MAJOR[+m[2] - 1] + shift) % 12) + 12) % 12;
};
const degreesOf = (label: string) => label.split(" · ").pop()!.split(" ");

describe("Harmony scale menu", () => {
  it("every option shows its degrees in the same 'Name · 1 2 ♭3' format, with ♭ and ♯", () => {
    for (const o of SCALE_OPTIONS) {
      expect(o.label, o.id).toMatch(/^.+ · ([♭♯]*[1-7])( [♭♯]*[1-7])+$/);
      expect(o.label.split(" · ").pop(), o.id).not.toMatch(/[b#]/);
    }
  });

  it("the scales that used to show no degrees now show them", () => {
    const label = (id: string) => optionById(id).label;
    expect(label("mixo")).toBe("Dominant (no 4) · 1 2 3 5 6 ♭7");
    expect(label("blues")).toBe("Blues · 1 ♭3 4 ♭5 5 ♭7");
    expect(label("blues-major")).toBe("Major blues · 1 2 ♭3 3 5 6");
    expect(label("whole")).toBe("Whole tone · 1 2 3 ♯4 ♯5 ♭7");
    expect(label("aug")).toBe("Augmented · 1 ♭3 3 5 ♭6 7");
    expect(label("prometheus")).toBe("Prometheus · 1 2 3 ♯4 6 ♭7");
    expect(label("petrushka")).toBe("Petrushka (tritone pair) · 1 ♭2 3 ♭5 5 ♭7");
    expect(label("messiaen5")).toBe("Messiaen mode 5 · 1 ♭2 4 ♭5 5 7");
    expect(label("hirajoshi")).toBe("Hirajoshi · 1 2 ♭3 5 ♭6");
    expect(label("hijaz")).toBe("Hijaz · 1 ♭2 3 4 5 ♭6 ♭7");
    expect(label("d3")).toBe("Sunday Scale (no 7) · 1 2 3 4 5 6");
  });

  it("the six diatonic rotations read exactly as the library defines them", () => {
    for (const m of DIATONIC_MODES)
      expect(optionById(`d${m.index}`).label).toBe(`${m.name} · ${prettyDegrees(m.degrees)}`);
  });

  it("the degrees on the label are the notes you get, in every key", () => {
    for (const o of SCALE_OPTIONS) {
      const want = degreesOf(o.label).map(semisOf).sort((a, b) => a - b).join(",");
      for (const key of KEYS) {
        const s = o.build(key);
        if (s.error) continue;
        const t = pc(s.notes[0]);
        const got = s.notes.map((n) => (((pc(n) - t) % 12) + 12) % 12).sort((a, b) => a - b).join(",");
        expect(got, `${o.id} in ${key}`).toBe(want);
      }
    }
  });

  it("reads degrees by letter: C D E F♯ G♯ B♭ is 1 2 3 ♯4 ♯5 ♭7", () => {
    const s = optionById("whole").build("G");
    expect(degreeLabels(s.notes)).toBe("1 2 3 ♯4 ♯5 ♭7");
  });

  it("groups the menu: remove one, pentatonic plus one, symmetric, colour, world", () => {
    const groups = [...new Set(SCALE_OPTIONS.map((o) => o.group))];
    expect(groups).toEqual([
      "Remove one note", "Pentatonic plus one", "Symmetric", "Colour scales", "World scales (5 and 7 notes)",
    ]);
    const ids = new Set(SCALE_OPTIONS.map((o) => o.id));
    for (const f of FAMILIES.filter((x) => ["remove", "pentatonic", "symmetric", "colour", "beyond"].includes(x.group)))
      if (f.id !== "diatonic") expect(ids.has(f.id), f.id).toBe(true);
    for (const id of ["prometheus", "petrushka", "messiaen5", "hirajoshi", "insen", "iwato", "kumoi", "yo", "hijaz"])
      expect(ids.has(id), id).toBe(true);
  });
});

describe("Chords in the scale works for five, six and seven notes", () => {
  it("every option, every key: chords, trees, lost triads and the stack line all compute", () => {
    for (const o of SCALE_OPTIONS) {
      for (const key of KEYS) {
        const s = o.build(key);
        if (s.error) continue;
        const notes = s.notes;
        const chords = findChords(notes, [3, 4]);
        tertianOnly(chords); susQuartal(chords);
        const under = chordsUnderEachNote(notes);
        expect(under.length).toBe(notes.length);
        for (const u of under) for (const b of u.under) {
          expect(b.voicing.every(Number.isFinite), `${o.id} ${key}`).toBe(true);
          expect(b.voicing[b.voicing.length - 1]).toBe(midi(u.note));
        }
        if (s.removed) {
          const parent = [...notes, s.removed].sort((a, b) => midi(a) - midi(b));
          lostTriads(parent, notes);
        }
        for (const c of chords) harmonicFunction(notes[0], c.names[0].voicing[0]);
        const line = stackLine(stackInThirds(notes), notes, s.removed);
        expect(line, `${o.id} in ${key}`).not.toMatch(/undefined|NaN|null/);
        expect(line.length).toBeGreaterThan(20);
      }
    }
  });

  it("the stack line for a five-note and a seven-note scale", () => {
    const hira = optionById("hirajoshi").build("G");
    expect(stackLine(stackInThirds(hira.notes), hira.notes, hira.removed)).toMatch(/^Stacked in thirds from G|^This scale uses one letter twice/);
    const hijaz = optionById("hijaz").build("G");
    expect(stackLine(stackInThirds(hijaz.notes), hijaz.notes, hijaz.removed)).toContain("from G");
  });
});

describe("chord names and roles on the Chords tab", () => {
  it("a symmetric chord leads with the name in the scale's own notes", () => {
    const s = optionById("whole").build("G");
    const own = new Set(s.notes.map(noteName));
    const { chords } = ownSpellingFirst(findChords(s.notes, [3]), s.notes);
    expect(chords.map((c) => c.names[0].symbol)).toContain("Gaug");
    for (const c of chords)
      if (c.names.some((n) => n.notes.every((x) => own.has(x))))
        expect(c.names[0].notes.every((x) => own.has(x)), c.names[0].symbol).toBe(true);
  });

  it("never changes which notes a chord has, only which name leads", () => {
    for (const o of SCALE_OPTIONS) {
      const s = o.build("G");
      if (s.error) continue;
      const found = findChords(s.notes, [3, 4]);
      const { chords } = ownSpellingFirst(found, s.notes);
      chords.forEach((c, i) => {
        expect(c.pcs).toEqual(found[i].pcs);
        expect(new Set(c.names.map((n) => n.symbol))).toEqual(new Set(found[i].names.map((n) => n.symbol)));
        expect(c.names[0].family).toBe(found[i].names[0].family);
      });
    }
  });

  it("reads a note's job by letter: A♭ is the 7th of B°7, E is the 6th of G6", () => {
    expect(chordRole(["B", "D", "F", "Ab"], 8)).toBe("7th");
    expect(chordRole(["G", "B", "D", "E"], 4)).toBe("6th");
    expect(chordRole(["G", "B", "D", "F#"], 2)).toBe("5th");
    expect(chordRole(["Ab", "Cb", "Eb"], 11)).toBe("3rd");
  });

  it("agrees with the chord-tree roles wherever the lead name is unchanged and the chord is not a °7", () => {
    for (const o of SCALE_OPTIONS) {
      const s = o.build("G");
      if (s.error) continue;
      const { bySymbol } = ownSpellingFirst(findChords(s.notes, [3, 4]), s.notes);
      for (const u of chordsUnderEachNote(s.notes)) for (const b of u.under) {
        const c = bySymbol.get(b.symbol);
        expect(c, b.symbol).toBeDefined();
        if (!c || c.names[0].symbol !== b.symbol.split(" = ")[0] || /dim7/.test(c.names[0].symbol)) continue;
        expect(chordRole(c.names[0].notes, pc(u.note)), `${o.id} ${b.symbol}`).toBe(b.role);
      }
    }
  });
});
