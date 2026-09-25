/**
 * THE PLAYBACK RULE, locked.
 *
 *   Changing any setting while playing must never stop the music. Tempo
 *   changes land on the next beat; everything else lands on the next bar or
 *   cycle. The sounding note and the beat count are always visible.
 *
 * The timeline is tested directly (it is pure), then the engine end to end
 * against a fake AudioContext, counting the sources that will actually sound.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveTimeline, Grid, Step } from "../src/lib/audio/timeline";
import { AudioEngine, type DrillPlan, type PlaybackOptions, type VampOptions } from "../src/lib/audio/engine";
import { note } from "../src/lib/theory/note";

/* ── the timeline ─────────────────────────────────────────────────────── */

interface P { stepDur: number; notes: string; sub: number; bpb: number; loop?: boolean }
const grid = (p: P): Grid => ({
  stepDur: p.stepDur, beatSteps: p.sub, barSteps: p.sub * p.bpb,
  length: p.notes.length, loop: p.loop ?? true,
});
const same = (a: P, b: P) => a.notes === b.notes && a.sub === b.sub && a.bpb === b.bpb;
const tl = (p: P, start = 1) => new LiveTimeline<P>(grid, same, p, start);

/** What actually sounds: steps scheduled before a seam, then everything after it. */
function run(t: LiveTimeline<P>, until: number, changes: { at: number; plan: P }[]) {
  let heard: Step<P>[] = [];
  let clock = 0;
  for (const c of changes) {
    heard.push(...t.take(c.at + 3));          // the engine looks 3 s ahead
    clock = c.at;
    const { at } = t.change(c.plan, clock);
    heard = heard.filter((s) => s.when < at - 1e-9);   // what the engine cancels
  }
  heard.push(...t.take(until));
  return heard;
}

const A: P = { stepDur: 0.125, notes: "CDEGAB" + "CDEGAB", sub: 4, bpb: 4 };   // 12 notes, 3 beats

describe("live timeline: tempo lands on the next beat", () => {
  it("no step is dropped or doubled across the seam", () => {
    const t = tl(A);
    const faster = { ...A, stepDur: 0.1 };
    const heard = run(t, 12, [{ at: 2.02, plan: faster }]);
    // positions run 0,1,2,3… with no gap and no repeat
    heard.forEach((s, i) => expect(s.pos).toBe(i));
    // time strictly increases
    for (let i = 1; i < heard.length; i++) expect(heard[i].when).toBeGreaterThan(heard[i - 1].when);
  });

  it("the seam is the first beat after the change, and the spacing changes there", () => {
    const t = tl(A);
    const { at, restart, seg } = t.change({ ...A, stepDur: 0.1 }, 2.02);
    expect(restart).toBe(false);
    expect(seg.firstPos % A.sub).toBe(0);            // lands on a beat
    expect(at).toBeGreaterThanOrEqual(2.02 + 0.05);  // never in the past
    expect(at - 2.07).toBeLessThan(A.stepDur * A.sub); // and within one beat
    const heard = t.take(10);
    const seam = heard.findIndex((s) => s.when >= at - 1e-9);
    expect(heard[seam].pos).toBe(seg.firstPos);       // carries on, no restart
    expect(heard[seam + 1].when - heard[seam].when).toBeCloseTo(0.1, 9);
  });

  it("a slider drag (many changes inside one beat) only ever keeps the newest", () => {
    const t = tl(A);
    for (const [i, d] of [0.12, 0.115, 0.11, 0.105].entries())
      t.change({ ...A, stepDur: d }, 2.0 + i * 0.01);
    expect(t.segments).toHaveLength(2);
    expect(t.latest.plan.stepDur).toBe(0.105);
  });
});

describe("live timeline: everything else lands on the next bar", () => {
  it("a new pattern starts from its own bar 1 on the next downbeat", () => {
    const t = tl(A);
    const B: P = { ...A, notes: "DEF#ABC#DEF#ABC#DEF#A" };
    const { at, restart, seg } = t.change(B, 2.3);
    expect(restart).toBe(true);
    expect(seg.firstPos).toBe(0);
    // the old grid's bar is 16 steps × 0.125 = 2 s, from t=1: bars at 1, 3, 5…
    expect(at).toBeCloseTo(3, 9);
    const heard = run(tl(A), 8, [{ at: 2.3, plan: B }]);
    const first = heard.find((s) => s.seg.plan === B)!;
    expect(first.when).toBeCloseTo(3, 9);
    expect(first.pos).toBe(0);
    // bar 2 of the old drill played in full, nothing of it after the seam
    expect(heard.filter((s) => s.seg.plan === A).every((s) => s.when < 3)).toBe(true);
    expect(heard.filter((s) => s.seg.plan === A)).toHaveLength(16);
  });

  it("the sounding plan stays the old one until the downbeat, and says a change is pending", () => {
    const t = tl(A);
    const B: P = { ...A, notes: "ABCDEF" };
    t.change(B, 2.3);
    const before = t.locate(2.9)!;
    expect(before.seg.plan).toBe(A);
    expect(before.pending).toBe(true);
    expect(before.next).toBe("bar");
    const after = t.locate(3.01)!;
    expect(after.seg.plan).toBe(B);
    expect(after.pending).toBe(false);
    expect(after.bar).toBe(1);
    expect(after.beat).toBe(1);
  });

  it("a change during the count-in replaces the drill on the same downbeat", () => {
    const t = tl(A, 5);          // count-in until t=5
    const B: P = { ...A, notes: "EFGABC" };
    const { at } = t.change(B, 2);
    expect(at).toBe(5);
    expect(t.segments).toHaveLength(1);
    expect(t.take(6)[0].seg.plan).toBe(B);
  });

  it("reports bar and beat from the clock", () => {
    const t = tl({ ...A, notes: "C".repeat(32) });   // 2 bars of 16ths in 4/4
    const at = t.locate(1 + 0.125 * 21)!;             // step 21 = bar 2, beat 2
    expect([at.bar, at.bars, at.beat, at.beats]).toEqual([2, 2, 2, 4]);
  });

  it("a non-looping pass still ends where it should after a tempo change", () => {
    const once = { ...A, notes: "C".repeat(16), loop: false };
    const t = tl(once);
    t.change({ ...once, stepDur: 0.25 }, 1.4);
    // first beat boundary at or after 1.45 is pos 4 (t=1.5); 12 steps remain at 0.25
    expect(t.endTime()).toBeCloseTo(1.5 + 12 * 0.25, 9);
    const heard = t.take(100);
    expect(heard).toHaveLength(16);
  });
});

/* ── the engine, end to end ──────────────────────────────────────────── */

class FakeParam {
  value = 1;
  cancelScheduledValues() {}
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
}
class FakeNode { connect() { return this; } disconnect() {} }
class FakeSource extends FakeNode {
  buffer: unknown = null;
  playbackRate = new FakeParam();
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops: number[] = [];
  start(when = 0) { this.starts.push(when); }
  stop(when = 0) { this.stops.push(when); }
  /** would this ever make a sound? A source stopped before it starts never does. */
  get audible() { return this.stops[this.stops.length - 1] > this.starts[0]; }
}
class FakeOscillator extends FakeSource { type = "sine"; frequency = new FakeParam(); }
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = new FakeNode();
  sources: FakeSource[] = [];
  oscillators: FakeOscillator[] = [];
  createGain() { return new FakeGain(); }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o; }
  decodeAudioData() { return Promise.resolve({}); }
  resume() { this.state = "running"; return Promise.resolve(); }
}

type Internals = { pump(): void; pumpVamp(): void };
const ctxOf = (e: AudioEngine) => e.context as unknown as FakeAudioContext;
const clicks = (c: FakeAudioContext) =>
  c.oscillators.filter((o) => o.type === "square" && o.audible).map((o) => o.starts[0])
    .sort((a, b) => a - b);
const pianoNotes = (c: FakeAudioContext) =>
  [...c.sources, ...c.oscillators.filter((o) => o.type === "triangle")]
    .filter((s) => s.audible)
    .map((s) => ({ at: s.starts[0], s }))
    .sort((a, b) => a.at - b.at);

const drill = (over: Partial<PlaybackOptions> = {}): PlaybackOptions => ({
  notes: ["C", "D", "E", "G", "A", "B", "C", "D"].map((n) => note(n as "C")),
  stepDur: 0.25, grouping: 4, subdivision: 2, beatsPerBar: 4,
  loop: true, click: true, countInBeats: 0, beatDur: 0.5,
  ...over,
});

describe("engine: live changes never stop the drill", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    // no samples: every note uses the synthesized fallback, which is fine here
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("a tempo change mid-play neither drops nor doubles a click, and lands on a beat", async () => {
    const e = new AudioEngine();
    const opts = drill();
    await e.start(opts);
    const c = ctxOf(e);
    c.currentTime = 1.1;
    (e as unknown as Internals).pump();
    expect(e.update({ ...opts, stepDur: 0.2 })).toBe(true);   // 0.5 s beat → 0.4 s beat
    for (const t of [2, 3, 4, 5, 6]) { c.currentTime = t; (e as unknown as Internals).pump(); }
    expect(e.playing).toBe(true);

    const ts = clicks(c).filter((t) => t < 7);
    const gaps = ts.slice(1).map((t, i) => +(t - ts[i]).toFixed(6));
    // every gap is exactly one old beat, then exactly one new beat — nothing else
    expect(gaps.every((g) => g === 0.5 || g === 0.4), `gaps ${gaps.join(",")}`).toBe(true);
    const seam = gaps.indexOf(0.4);
    expect(seam).toBeGreaterThan(0);
    expect(gaps.slice(0, seam).every((g) => g === 0.5)).toBe(true);
    expect(gaps.slice(seam).every((g) => g === 0.4)).toBe(true);
    // the seam comes within a beat of the change
    expect(ts[seam] - 1.1).toBeLessThanOrEqual(0.5 + 1e-9);
    e.stop(true);
  });

  it("a new key lands on the next bar line, from the new drill's first note", async () => {
    const e = new AudioEngine();
    const opts = drill({ click: false });
    await e.start(opts);
    const c = ctxOf(e);
    const start = e.startTime;             // 0.3
    c.currentTime = start + 0.6;            // inside bar 1 (a bar is 2 s)
    (e as unknown as Internals).pump();
    const inD: DrillPlan = { ...opts, notes: ["D", "E", "F#", "A", "B", "C#", "D", "E"].map((n) => note(n as "D")) };
    e.update(inD);
    expect(e.position()?.plan).toBe(opts);   // still hearing C
    expect(e.position()?.pending).toBe(true);
    for (const t of [2, 3, 4, 5]) { c.currentTime = t; (e as unknown as Internals).pump(); }

    const heard = pianoNotes(c);
    const barLine = start + 2;
    // the whole of bar 1 in C, nothing of C after the bar line
    expect(heard.filter((h) => h.at < barLine - 1e-6)).toHaveLength(8);
    const firstNew = heard.find((h) => h.at >= barLine - 1e-6)!;
    expect(firstNew.at).toBeCloseTo(barLine, 9);
    // the first note after the seam is the new drill's D (MIDI 62 → ~293.66 Hz)
    const f = (firstNew.s as FakeOscillator).frequency.value;
    expect(f).toBeCloseTo(440 * Math.pow(2, (62 - 69) / 12), 3);

    c.currentTime = barLine + 0.01;
    const now = e.position()!;
    expect(now.plan).toBe(inD);
    expect([now.bar, now.beat, now.index, now.pending]).toEqual([1, 1, 0, false]);
    e.stop(true);
  });

  it("toggling the click mid-play silences it from the next beat, with the drill still running", async () => {
    const e = new AudioEngine();
    const opts = drill();
    await e.start(opts);
    const c = ctxOf(e);
    c.currentTime = 0.8;
    e.update({ ...opts, click: false });
    for (const t of [2, 3]) { c.currentTime = t; (e as unknown as Internals).pump(); }
    const ts = clicks(c);
    expect(ts.length).toBeGreaterThan(0);
    expect(Math.max(...ts)).toBeLessThanOrEqual(0.8 + 0.06 + 0.5);
    expect(pianoNotes(c).some((h) => h.at > 2)).toBe(true);
    expect(e.playing).toBe(true);
    e.stop(true);
  });
});

describe("engine: live changes never stop the vamp", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  const vamp = (over: Partial<VampOptions> = {}): VampOptions => ({
    chords: [{ bass: 36, voicing: [60, 64, 67], bars: 1 }, { bass: 41, voicing: [60, 65, 69], bars: 1 }],
    beatDur: 0.5, beatsPerBar: 4, feel: "straight",
    click: true, countInBeats: 0, bassOn: true, compOn: true,
    ...over,
  });

  it("a tempo change keeps the click contiguous", async () => {
    const e = new AudioEngine();
    const o = vamp();
    await e.startVamp(o);
    const c = ctxOf(e);
    c.currentTime = 1.0;
    e.updateVamp({ ...o, beatDur: 0.4 });
    for (const t of [2, 3, 4, 5]) { c.currentTime = t; (e as unknown as Internals).pumpVamp(); }
    const ts = clicks(c).filter((t) => t < 6);
    const gaps = ts.slice(1).map((t, i) => +(t - ts[i]).toFixed(6));
    expect(gaps.every((g) => g === 0.5 || g === 0.4), `gaps ${gaps.join(",")}`).toBe(true);
    expect(gaps).toContain(0.4);
    expect(e.vamping).toBe(true);
    e.stopVamp();
  });

  it("a new progression lands on the next bar, from its first chord", async () => {
    const e = new AudioEngine();
    const o = vamp({ click: false });
    await e.startVamp(o);
    const c = ctxOf(e);
    c.currentTime = 0.9;                       // inside bar 1 (0.3 → 2.3)
    const next = vamp({ click: false, chords: [{ bass: 38, voicing: [62, 66, 69], bars: 2 }] });
    e.updateVamp(next);
    expect(e.vampPosition()?.plan).toBe(o);
    c.currentTime = 2.31;
    (e as unknown as Internals).pumpVamp();
    const at = e.vampPosition()!;
    expect(at.plan).toBe(next);
    expect([at.chordIndex, at.bar, at.beat]).toEqual([0, 1, 1]);
    // the bass on that downbeat is the new root, D2 — and only that
    const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const onDownbeat = c.oscillators.filter((s) => s.type === "triangle" && s.audible &&
      Math.abs(s.starts[0] - 2.3) < 1e-6);
    expect(onDownbeat.filter((s) => Math.abs(s.frequency.value - hz(38)) < 0.01)).toHaveLength(1);
    // the old progression's second chord (bass F2) would have been here: it must not sound
    expect(onDownbeat.filter((s) => Math.abs(s.frequency.value - hz(41)) < 0.01)).toHaveLength(0);
    e.stopVamp();
  });
});
