/**
 * Improvise: every backing loop, in every key, on every scale the page offers.
 *
 * The rule these tests hold: a loop is built ONLY from the chosen scale's own
 * notes (the 12-bar blues is the one deliberate exception, locked in
 * blues.test.ts). That covers every chord note, every bass note of the walking
 * line and every note of the "Hear an example" phrase. A loop the scale cannot
 * carry is not offered, and the page has a plain sentence saying why.
 *
 * The older bug these tests still guard: building chords by taking "every
 * other scale degree". In a six-note scale that is NOT thirds — C D E G A B
 * gives C–E–A, which is A minor, not C.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { buildScale, FAMILIES, KEYS } from "../src/lib/theory/scales";
import {
  buildVamp, vampById, vampsFor, guideTones, VAMPS, whyNot, bassWalk, examplePhrase,
  tryThis, voiceLead, PROGRESSIONS, scaleKey, BedId, VampStep,
} from "../src/lib/theory/vamps";
import { noteName, pc } from "../src/lib/theory/note";
import { AudioEngine, type VampOptions } from "../src/lib/audio/engine";

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Every scale the Improvise menu offers: all families except Custom, every mode. */
const OFFERED: [string, number][] = FAMILIES.filter((f) => f.kind !== "custom").flatMap((f) =>
  f.kind === "rotation" ? f.modes!.map((m) => [f.id, m.index] as [string, number]) : [[f.id, 0] as [string, number]]);
const LOOPS = VAMPS.filter((v) => v.id !== "blues");
const feelOf = (id: BedId) => (vampById(id).feel === "swing" ? "swing" : "straight") as "swing" | "straight";
const barsOf = (steps: VampStep[]) => steps.flatMap((s) => Array.from({ length: s.bars }, () => s.chord.chordTones));

describe("the menu", () => {
  it("offers every scale, the Sunday Scale and the world scales included", () => {
    const ids = OFFERED.map(([f]) => f);
    for (const id of ["diatonic", "mixo", "blues", "blues-major", "whole", "aug", "prometheus", "petrushka",
      "messiaen5", "dim-wh", "dim-hw", "penta", "hepta", "hirajoshi", "insen", "iwato", "kumoi", "yo", "hijaz"])
      expect(ids, id).toContain(id);
    expect(OFFERED.filter(([f]) => f === "diatonic")).toHaveLength(6);
  });
  it("has a written progression table for every offered scale", () => {
    for (const [f, m] of OFFERED) expect(PROGRESSIONS[scaleKey(buildScale("G", f, m))], `${f}:${m}`).toBeDefined();
  });
});

describe("every loop, every key, every scale: only the scale's own notes", () => {
  for (const [fam, mode] of OFFERED) {
    it(`${fam}${fam === "diatonic" ? ` mode ${mode}` : ""}`, () => {
      for (const k of KEYS) {
        const s = buildScale(k, fam, mode);
        expect(s.error, `${k} ${fam}`).toBeUndefined();
        const have = new Set(s.pcs);
        const where = (v: string) => `${k} ${s.label} · ${v}`;
        for (const v of LOOPS) {
          const steps = buildVamp(s, v);
          if (!steps.length) {
            // not offered, and the page can say why in plain words
            expect(v.id, where(v.id)).not.toBe("drone");
            expect(whyNot(s, v.id)!.length, where(v.id)).toBeGreaterThan(20);
            continue;
          }
          expect(whyNot(s, v.id)).toBeNull();
          for (const st of steps) {
            const c = st.chord;
            for (const m of [c.bass, ...c.voicing]) expect(have.has(mod(m, 12)), where(`${v.id} ${c.label} plays ${m}`)).toBe(true);
            for (const p of c.chordTones) expect(have.has(p), where(`${v.id} ${c.label} lights ${p}`)).toBe(true);
            // the chord is rooted where it says: the root is a scale note and a chord tone
            expect(c.chordTones, where(c.label)).toContain(pc(s.notes[c.degreeRoot]));
            expect(pc(c.root)).toBe(pc(s.notes[c.degreeRoot]));
            if (!c.label.includes("/")) expect(c.label.startsWith(noteName(c.root)), where(c.label)).toBe(true);
            // registers: bass low, chords mid-range
            expect(c.bass, where(`${c.label} bass`)).toBeGreaterThanOrEqual(36);
            expect(c.bass, where(`${c.label} bass`)).toBeLessThanOrEqual(47);
            for (const m of c.voicing) {
              expect(m, where(`${c.label} voicing`)).toBeGreaterThanOrEqual(48);
              expect(m, where(`${c.label} voicing`)).toBeLessThanOrEqual(81);
            }
            if (!c.pad) expect(c.voicing[c.voicing.length - 1] - c.voicing[0], where(c.label)).toBeLessThanOrEqual(16);
          }
          // the bass line, in the loop's own feel and in 6/8
          for (const feel of [feelOf(v.id), ...(v.feel === "straight" ? ["68" as const] : [])]) {
            const walk = bassWalk(s.pcs, steps.map((x) => ({ bass: x.chord.bass, chordTones: x.chord.chordTones, bars: x.bars })), feel);
            walk.forEach((bars, i) => bars.forEach((line) => {
              expect(line[0], where(`${feel} bass starts on the root`)).toBe(steps[i].chord.bass);
              for (const m of line) {
                expect(have.has(mod(m, 12)), where(`${feel} bass ${m}`)).toBe(true);
                expect(m).toBeGreaterThanOrEqual(28);
                expect(m).toBeLessThanOrEqual(60);
              }
            }));
          }
          // the example phrase
          const beats = 4;
          const phrase = examplePhrase(s.pcs, barsOf(steps), feelOf(v.id), beats);
          for (const n of phrase) {
            expect(have.has(mod(n.midi, 12)), where(`example ${n.midi}`)).toBe(true);
            expect(n.midi).toBeGreaterThanOrEqual(64);
            expect(n.midi).toBeLessThanOrEqual(81);
          }
        }
      }
    });
  }
});

describe("every scale gets something to play over", () => {
  it("the drone, the 12-bar blues and at least one loop of its own chords or a pad", () => {
    for (const [fam, mode] of OFFERED)
      for (const k of KEYS) {
        const s = buildScale(k, fam, mode);
        const ids = vampsFor(s).map((v) => v.id);
        expect(ids).toContain("drone");
        expect(ids).toContain("blues");
        expect(ids.length, `${k} ${s.label}`).toBeGreaterThanOrEqual(3);
      }
  });
  it("a scale with no triads at all still gets a pad from its own notes: Messiaen mode 5, iwato", () => {
    for (const fam of ["messiaen5", "iwato"]) {
      const s = buildScale("G", fam, 0);
      expect(buildVamp(s, vampById("two"))).toEqual([]);
      expect(whyNot(s, "two")).toMatch(/chord/);
      expect(buildVamp(s, vampById("sus")).length).toBeGreaterThan(0);
    }
  });
});

describe("the progressions, as a musician would write them (G)", () => {
  const G = (fam: string, mode = 0) => buildScale("G", fam, mode);
  const read = (fam: string, mode: number, id: BedId) =>
    buildVamp(G(fam, mode), vampById(id)).map((s) => `${s.chord.label} ${s.numeral}`).join(" | ");
  it("Major (no 4): no ii and no IV, so I–vi, and I–V–vi–iii", () => {
    expect(read("diatonic", 0, "two")).toBe("Gmaj7 Imaj7 | Em7 vi7");
    expect(read("diatonic", 0, "four")).toBe("Gmaj7 Imaj7 | D V | Em7 vi7 | Bm7 iii7");
    expect(read("diatonic", 0, "swing")).toBe("Gmaj7 Imaj7 | Bm7 iii7 | Em7 vi7 | D6 V6");
  });
  it("Suspended (no 3rd): the 7sus4 is home", () => {
    expect(read("diatonic", 1, "two")).toBe("G7sus4 I7sus4 | Fmaj7 ♭VIImaj7");
    expect(read("diatonic", 1, "four")).toBe("G7sus4 I7sus4 | Fmaj7 ♭VIImaj7 | C IV | Dm7 v7");
  });
  it("Dark minor (no 2): i–♭VI, and the minor pop loop with iv for the missing ♭VII", () => {
    expect(read("diatonic", 2, "two")).toBe("Gm7 i7 | Ebmaj7 ♭VImaj7");
    expect(read("diatonic", 2, "four")).toBe("Gm7 i7 | Ebmaj7 ♭VImaj7 | Bb ♭III | Cm7 iv7");
  });
  it("Sunday Scale (no 7): no leading note, so no V until the sus turnaround", () => {
    expect(read("diatonic", 3, "two")).toBe("G I | Cmaj7 IVmaj7");
    expect(read("diatonic", 3, "four")).toBe("G I | Em7 vi7 | Cmaj7 IVmaj7 | Am7 ii7");
    expect(read("diatonic", 3, "swing")).toBe("G6 I6 | Em7 vi7 | Am7 ii7 | D7sus4 V7sus4");
  });
  it("Minor (no 6): i–♭VII", () => {
    expect(read("diatonic", 4, "two")).toBe("Gm7 i7 | F ♭VII");
    expect(read("diatonic", 4, "four")).toBe("Gm7 i7 | Bbmaj7 ♭IIImaj7 | F ♭VII | Dm7 v7");
  });
  it("Phrygian (no 5th): no chord on G, so the chords sit over a G pedal", () => {
    expect(read("diatonic", 5, "two")).toBe("Ab/G ♭II/I | Fm7/G ♭vii7/I");
    for (const st of buildVamp(G("diatonic", 5), vampById("four"))) expect(st.chord.bass % 12).toBe(7);
    expect(whyNot(G("diatonic", 5), "swing")).toMatch(/home note/);
  });
  it("the colour, symmetric and world scales", () => {
    expect(read("mixo", 0, "two")).toBe("G7 I7 | Dm v");
    expect(read("blues", 0, "two")).toBe("Gm7 i7 | C7sus4 IV7sus4");
    expect(read("whole", 0, "two")).toBe("G7#5 I+7 | A7#5 II+7");
    expect(read("aug", 0, "four")).toBe("Gmaj7 Imaj7 | Ebmaj7 ♭VImaj7 | Bmaj7 IIImaj7 | Ebmaj7 ♭VImaj7");
    expect(read("prometheus", 0, "two")).toBe("G9#11 I9♯11 | A7 II7");
    expect(read("petrushka", 0, "two")).toBe("G7 I7 | Db7 ♭V7");
    expect(read("dim-hw", 0, "four")).toBe("G7 I7 | Bb7 ♭III7 | C#7 ♯IV7 | E7 VI7");
    expect(read("hepta", 0, "four")).toBe("G I | D V | Em vi | C IV");
    expect(read("hepta", 0, "swing")).toBe("Gmaj7 Imaj7 | Em7 vi7 | Am7 ii7 | D7 V7");
    expect(read("hijaz", 0, "two")).toBe("G I | Ab ♭II");
    expect(read("hirajoshi", 0, "two")).toBe("Gm i | Ebmaj7 ♭VImaj7");
    expect(read("yo", 0, "four")).toBe("Gsus2 Isus2 | Am7 ii7 | C IV | D7sus4 V7sus4");
  });
  it("the function labels come from the scale degree", () => {
    const four = buildVamp(G("hepta"), vampById("four"));
    expect(four.map((s) => s.fnLabel)).toEqual(["Tonic", "Dominant", "Tonic", "Pre-dominant"]);
  });
  it("spells chords per key: F Major (no 4) two-chord is Fmaj7–Dm7; Db Minor (no 6) is D♭m7–C♭", () => {
    expect(buildVamp(buildScale("F", "diatonic", 0), vampById("two")).map((s) => s.chord.label)).toEqual(["Fmaj7", "Dm7"]);
    const db = buildScale("Db", "diatonic", 4);
    const labels = buildVamp(db, vampById("two")).map((s) => s.chord.label);
    expect(labels[0]).toBe(`${noteName(db.notes[0])}m7`);
  });
});

describe("the drone and the pads", () => {
  it("the drone is root and fifth only, or root and octave when there is no fifth", () => {
    for (const [fam, mode] of OFFERED) {
      const s = buildScale("G", fam, mode);
      const [step] = buildVamp(s, vampById("drone"));
      const want = s.pcs.includes(2) ? [7, 2] : [7];
      expect(new Set(step.chord.voicing.map((m) => m % 12)), `${s.label}`).toEqual(new Set(want));
      expect(step.chord.bass % 12).toBe(7);
    }
  });
  it("no pad has a 3rd, in any scale", () => {
    for (const [fam, mode] of OFFERED) {
      const s = buildScale("G", fam, mode);
      for (const step of buildVamp(s, vampById("sus"))) {
        const root = pc(step.chord.root);
        expect(step.chord.chordTones, `${s.label} ${step.chord.label}`).not.toContain((root + 3) % 12);
        expect(step.chord.chordTones, `${s.label} ${step.chord.label}`).not.toContain((root + 4) % 12);
      }
    }
  });
});

describe("voice leading", () => {
  it("each chord moves as little as possible: every note within a 4th of one before it", () => {
    for (const [fam, mode] of OFFERED)
      for (const k of KEYS) {
        const s = buildScale(k, fam, mode);
        for (const id of ["two", "four", "swing"] as BedId[]) {
          const steps = buildVamp(s, vampById(id));
          for (let i = 1; i < steps.length; i++) {
            const a = steps[i - 1].chord.voicing, b = steps[i].chord.voicing;
            for (const m of b)
              expect(Math.min(...a.map((x) => Math.abs(x - m))), `${k} ${s.label} ${id} ${steps[i].chord.label}`).toBeLessThanOrEqual(5);
          }
        }
      }
  });
  it("voiceLead keeps common tones: Gmaj7 to Em7 moves only F♯ to E", () => {
    const g = voiceLead([7, 11, 2, 6], null);
    const e = voiceLead([4, 7, 11, 2], g);
    expect(g.filter((m) => !e.includes(m)).map((m) => m % 12)).toEqual([6]);
  });
});

describe("the walking bass", () => {
  it("swing: four different notes a bar, no leap over a 5th, arriving on the next root by step", () => {
    for (const [fam, mode] of OFFERED)
      for (const k of KEYS) {
        const s = buildScale(k, fam, mode);
        const steps = buildVamp(s, vampById("swing"));
        if (!steps.length) continue;
        const chords = steps.map((x) => ({ bass: x.chord.bass, chordTones: x.chord.chordTones, bars: x.bars }));
        const walk = bassWalk(s.pcs, chords, "swing");
        walk.forEach((bars, i) => bars.forEach((line, b) => {
          const where = `${k} ${s.label} ${steps[i].chord.label} bar ${b + 1}: ${line}`;
          expect(line).toHaveLength(4);
          expect(new Set(line).size, where).toBe(4);
          for (let j = 1; j < 4; j++) expect(Math.abs(line[j] - line[j - 1]), where).toBeLessThanOrEqual(7);
          const target = b === bars.length - 1 ? chords[(i + 1) % chords.length].bass : chords[i].bass;
          expect(Math.abs(line[3] - target), where).toBeLessThanOrEqual(4);
          expect(line[3]).not.toBe(target);
        }));
      }
  });
  it("straight: root then fifth, or root then octave when the chord has no fifth", () => {
    const s = buildScale("G", "diatonic", 0);
    const two = buildVamp(s, vampById("two"));
    const w = bassWalk(s.pcs, two.map((x) => ({ bass: x.chord.bass, chordTones: x.chord.chordTones, bars: x.bars })), "straight");
    expect(w[0][0]).toEqual([43, 50]);     // G2 D3
    const ph = buildScale("G", "diatonic", 5);
    const drone = buildVamp(ph, vampById("drone"));
    expect(bassWalk(ph.pcs, drone.map((x) => ({ bass: x.chord.bass, chordTones: x.chord.chordTones, bars: x.bars })), "straight")[0][0])
      .toEqual([43, 55]);                  // G2 G3: this scale has no D
  });
});

describe("Hear an example", () => {
  it("every downbeat lands on a chord tone of the chord sounding in that bar", () => {
    for (const [fam, mode] of OFFERED)
      for (const k of ["G", "C", "F#", "Bb"]) {
        const s = buildScale(k, fam, mode);
        for (const v of LOOPS) {
          const steps = buildVamp(s, v);
          if (!steps.length) continue;
          const bars = barsOf(steps);
          const phrase = examplePhrase(s.pcs, bars, feelOf(v.id), 4);
          bars.forEach((pcs, b) => {
            const down = phrase.find((n) => Math.abs(n.at - b * 4) < 1e-6);
            expect(down, `${k} ${s.label} ${v.id} bar ${b + 1}`).toBeDefined();
            const land = pcs.filter((p) => s.pcs.includes(p));
            expect(land.includes(mod(down!.midi, 12)), `${k} ${s.label} ${v.id} bar ${b + 1}`).toBe(true);
          });
          // it moves: within a bar no note repeats straight away
          for (let i = 1; i < phrase.length; i++)
            if (Math.floor(phrase[i].at / 4) === Math.floor(phrase[i - 1].at / 4))
              expect(phrase[i].midi, `${k} ${s.label} ${v.id} at ${phrase[i].at}`).not.toBe(phrase[i - 1].midi);
        }
      }
  });
  it("fills whole bars in 6/8 too, and ends each four-bar phrase on a long note", () => {
    const s = buildScale("G", "diatonic", 0);
    const bars = barsOf(buildVamp(s, vampById("four")));
    const ph = examplePhrase(s.pcs, bars, "68", 6);
    const last = ph.filter((n) => n.at >= 18);
    expect(last).toHaveLength(1);
    expect(last[0].dur).toBeGreaterThanOrEqual(3);
    for (const n of ph) expect(n.at + n.dur).toBeLessThanOrEqual(24 + 1e-6);
  });
});

describe("try this", () => {
  it("names real notes from the loop", () => {
    const s = buildScale("G", "diatonic", 0);
    expect(tryThis(s, "drone", buildVamp(s, vampById("drone")))).toMatch(/against G/);
    expect(tryThis(s, "two", buildVamp(s, vampById("two")))).toBe(
      "Aim for the note that changes: E as Em7 arrives, and F♯ as Gmaj7 comes back.");
    expect(tryThis(s, "four", buildVamp(s, vampById("four")))).toMatch(/B – F♯ – G – A/);
  });
});

describe("guide tones", () => {
  it("split the scale with nothing lost or duplicated", () => {
    const s = buildScale("C", "diatonic", 0);
    const [step] = buildVamp(s, vampById("two"));
    const { chordTones, colourTones } = guideTones(s, step.chord);
    expect(chordTones.length + colourTones.length).toBe(s.notes.length);
    expect(chordTones.filter((a) => colourTones.some((b) => pc(a) === pc(b)))).toHaveLength(0);
  });
});

/* ── the engine plays exactly what the theory wrote ───────────────────── */

class FakeParam {
  value = 1;
  cancelScheduledValues() {}
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
}
class FakeNode { connect() { return this; } disconnect() {} }
class FakeOsc extends FakeNode {
  type = "sine"; frequency = new FakeParam(); onended: (() => void) | null = null;
  starts: number[] = []; stops: number[] = [];
  start(w = 0) { this.starts.push(w); }
  stop(w = 0) { this.stops.push(w); }
}
class FakeCtx {
  currentTime = 0; state = "running"; destination = new FakeNode();
  oscs: FakeOsc[] = [];
  createGain() { return { gain: new FakeParam(), connect() {}, disconnect() {} }; }
  createBufferSource() { throw new Error("no samples in this test"); }
  createOscillator() { const o = new FakeOsc(); this.oscs.push(o); return o; }
  decodeAudioData() { return Promise.reject(new Error("no samples")); }
  resume() { return Promise.resolve(); }
}
type Pump = { pumpVamp(): void };

describe("engine: the walking bass and the example melody are what sounds", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { AudioContext: FakeCtx });
    // every sample fails, so every note is a pitched oscillator we can read back
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  const heard = (c: FakeCtx, from: number, to: number) => c.oscs
    .filter((o) => o.type === "triangle" && o.starts[0] >= from - 1e-6 && o.starts[0] < to - 1e-6 && !o.stops.some((s) => s < o.starts[0]))
    .map((o) => ({ t: +o.starts[0].toFixed(3), m: Math.round(69 + 12 * Math.log2(o.frequency.value / 440)) }));

  it("plays walk[bar][hit] in the bass and the lead notes on their beats, all inside the scale", async () => {
    const s = buildScale("G", "diatonic", 3);
    const steps = buildVamp(s, vampById("swing"));
    const walk = bassWalk(s.pcs, steps.map((x) => ({ bass: x.chord.bass, chordTones: x.chord.chordTones, bars: x.bars })), "swing");
    const lead = examplePhrase(s.pcs, barsOf(steps), "swing", 4);
    const e = new AudioEngine();
    const opts: VampOptions = {
      chords: steps.map((x, i) => ({ bass: x.chord.bass, voicing: x.chord.voicing, bars: x.bars, walk: walk[i] })),
      beatDur: 0.5, beatsPerBar: 4, feel: "swing", click: false, bassOn: true, compOn: false,
      countInBeats: 0, lead,
    };
    await e.startVamp(opts);
    const c = e.context as unknown as FakeCtx;
    const t0 = 0.3;
    for (const t of [1, 2, 3]) { c.currentTime = t; (e as unknown as Pump).pumpVamp(); }
    const notes = heard(c, t0, t0 + 4);           // two bars of 4 beats at 0.5 s
    const bassNotes = notes.filter((n) => n.m < 60).map((n) => n.m);
    expect(bassNotes).toEqual([...walk[0][0], ...walk[1][0]]);
    const leadNotes = notes.filter((n) => n.m >= 64).map((n) => n.m);
    expect(leadNotes).toEqual(lead.filter((n) => n.at < 8 - 1e-6).map((n) => n.midi));
    for (const n of notes) expect(s.pcs).toContain(n.m % 12);
    e.stopVamp();
  });

  it("switching the example on while playing keeps the loop running and lands on the next beat", async () => {
    const s = buildScale("G", "diatonic", 0);
    const steps = buildVamp(s, vampById("two"));
    const e = new AudioEngine();
    const base: VampOptions = {
      chords: steps.map((x) => ({ bass: x.chord.bass, voicing: x.chord.voicing, bars: x.bars })),
      beatDur: 0.5, beatsPerBar: 4, feel: "straight", click: false, bassOn: true, compOn: true, countInBeats: 0,
    };
    await e.startVamp(base);
    const c = e.context as unknown as FakeCtx;
    c.currentTime = 1.0;                           // bar 1, beat 2 (the loop began at 0.3)
    (e as unknown as Pump).pumpVamp();
    const lead = examplePhrase(s.pcs, barsOf(steps), "straight", 4);
    expect(e.updateVamp({ ...base, lead })).toBe(true);
    const after = e.vampPosition()!;
    expect(e.vamping).toBe(true);
    expect(after.pending).toBe(true);
    expect(after.next).toBe("beat");               // not a restart from bar 1
    c.currentTime = 2.2;
    (e as unknown as Pump).pumpVamp();
    // still counting from where it was: bar 1 beat 4, not a fresh bar 1 beat 2
    expect([e.vampPosition()!.bar, e.vampPosition()!.beat]).toEqual([1, 4]);
    e.stopVamp();
  });
});
