/**
 * MIDI grading. The design decision worth locking: we grade PITCH CLASS, not
 * octave, because a student on a 61-key controller plays the drill wherever it
 * sits under their hands. Octave differences are reported, not punished.
 */
import { describe, it, expect } from "vitest";
import { grade, MidiEvent } from "../src/lib/midi";
import { buildScale } from "../src/lib/theory/scales";
import { buildPattern } from "../src/lib/theory/patterns";
import { midi } from "../src/lib/theory/note";

const scale = buildScale("C", "diatonic", 0);
const expected = buildPattern("aroha", scale.notes, 1, 4, false);   // C D E G A B
const STEP = 0.25;
const T0 = 10;
const perfect = (): MidiEvent[] =>
  expected.map((n, i) => ({ midi: midi(n), velocity: 100, at: T0 + i * STEP }));

describe("grading", () => {
  it("gives a perfect performance 100%", () => {
    const r = grade(expected, 4, perfect(), T0, STEP);
    expect(r.correct).toBe(expected.length);
    expect(r.accuracy).toBe(1);
    expect(r.missed).toBe(0);
    expect(r.wrong).toBe(0);
    expect(r.timingMs).toBeCloseTo(0, 5);
  });
  it("accepts the right note in the wrong octave, and says so", () => {
    const ev = perfect().map((e) => ({ ...e, midi: e.midi + 12 }));
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.accuracy).toBe(1);
    expect(r.steps.every((s) => s.octaveOff)).toBe(true);
  });
  it("marks a wrong pitch class wrong, not missed", () => {
    const ev = perfect();
    ev[2].midi = midi(expected[2]) + 1;           // a semitone out
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.wrong).toBe(1);
    expect(r.missed).toBe(0);
    expect(r.steps[2].verdict).toBe("wrong");
  });
  it("marks a skipped note missed", () => {
    const ev = perfect().filter((_, i) => i !== 3);
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.missed).toBe(1);
    expect(r.steps[3].verdict).toBe("missed");
  });
  it("counts notes outside every window as extra", () => {
    const ev = [...perfect(), { midi: 61, velocity: 90, at: T0 + 100 }];
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.extra).toBe(1);
  });
  it("measures timing error and lateness bias", () => {
    const late = perfect().map((e) => ({ ...e, at: e.at + 0.04 }));   // 40ms late
    const r = grade(expected, 4, late, T0, STEP);
    expect(r.accuracy).toBe(1);
    expect(r.timingMs).toBeCloseTo(40, 0);
    expect(r.biasMs).toBeGreaterThan(30);
  });
  it("scores accents separately from everything else", () => {
    const ev = perfect();
    ev[0].midi = midi(expected[0]) + 1;    // fluff the accent only
    const r = grade(expected, 6, ev, T0, STEP);
    expect(r.accentAccuracy).toBe(0);      // the one accent was wrong
    expect(r.accuracy).toBeGreaterThan(0.8);
  });
  it("names the notes most often missed", () => {
    const ev = perfect().filter((_, i) => i !== 2);
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.worstNotes[0].note).toBe("E");
  });
  it("rejects a note more than half a step from its slot", () => {
    const ev = perfect();
    ev[1].at = T0 + 1 * STEP + STEP * 0.7;
    const r = grade(expected, 4, ev, T0, STEP);
    expect(r.steps[1].verdict).toBe("missed");
  });
});

describe("wrong-note reporting", () => {
  it("names the note the student actually played, not the expected one", () => {
    const events = perfect();
    events[1] = { ...events[1], midi: events[1].midi + 1 };   // D becomes Eb
    const r = grade(expected, 4, events, T0, STEP);
    expect(r.steps[1].verdict).toBe("wrong");
    expect(r.steps[1].expectedNote).toBe("D");
    expect(r.steps[1].playedNote).toBe("Eb");
  });
});
