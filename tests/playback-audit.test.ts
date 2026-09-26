/**
 * Locks for the playback audit of 26 September 2026. Each block is one bug
 * that was heard (or not heard) in a real browser, fixed, and pinned here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine, COMP, type PlaybackOptions, type VampOptions } from "../src/lib/audio/engine";
import { getSession } from "../src/lib/audio/session";
import { supersededBySelf } from "../src/lib/audio/usePlayback";
import { playableStack, TOP_SAMPLE } from "../src/lib/audio/voicing";
import { stackInThirds } from "../src/lib/theory/chords";
import { buildScale, KEYS } from "../src/lib/theory/scales";
import { midi, note } from "../src/lib/theory/note";

class FakeParam {
  value = 1;
  cancelScheduledValues() {}
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
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
}
class FakeOscillator extends FakeSource {
  type = "sine";
  frequency = new FakeParam();
}
class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = new FakeNode();
  sources: FakeSource[] = [];
  oscillators: FakeOscillator[] = [];
  createGain() { return { gain: new FakeParam(), connect() {}, disconnect() {} }; }
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o; }
  decodeAudioData() { return Promise.resolve({}); }
  resume() { this.state = "running"; return Promise.resolve(); }
}

const drill = (o: Partial<PlaybackOptions> = {}): PlaybackOptions => ({
  notes: [note("G"), note("A"), note("B"), note("D")],
  stepDur: 0.25, grouping: 4, subdivision: 1, beatsPerBar: 4,
  loop: true, click: false, countInBeats: 4, beatDur: 0.5, ...o,
});
const vamp = (o: Partial<VampOptions> = {}): VampOptions => ({
  chords: [{ bass: 43, voicing: [59, 62, 66], bars: 1 }],
  beatDur: 0.5, beatsPerBar: 4, feel: "straight",
  click: false, bassOn: true, compOn: true, countInBeats: 4, ...o,
});
const ctxOf = (e: AudioEngine) => e.context as unknown as FakeAudioContext;
const clicks = (c: FakeAudioContext) => c.oscillators.filter((o) => o.type === "square");

beforeEach(() => {
  vi.stubGlobal("window", { AudioContext: FakeAudioContext });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1) })));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the count-in is always heard", () => {
  // Improvise opens with Count-in on and Click off: Play gave a whole bar of silence.
  it("a drill with the click off still counts in, one click per beat, the first strong", async () => {
    const e = new AudioEngine();
    await e.start(drill({ click: false, countInBeats: 4, beatDur: 0.5 }));
    const c = ctxOf(e);
    const ci = clicks(c).filter((o) => o.starts[0] < e.startTime - 1e-6);
    expect(ci.map((o) => +(e.startTime - o.starts[0]).toFixed(3))).toEqual([2, 1.5, 1, 0.5]);
    expect(ci[0].frequency.value).toBeGreaterThan(ci[1].frequency.value);
    // and the drill itself stays click-free, as asked
    expect(clicks(c).filter((o) => o.starts[0] >= e.startTime - 1e-6)).toHaveLength(0);
    e.stop(true);
  });

  it("a vamp with the click off still counts in, then plays without a click", async () => {
    const e = new AudioEngine();
    await e.startVamp(vamp({ click: false, countInBeats: 4 }));
    const c = ctxOf(e);
    const first = 0.3 + 4 * 0.5;
    expect(clicks(c).filter((o) => o.starts[0] < first - 1e-6)).toHaveLength(4);
    expect(clicks(c).filter((o) => o.starts[0] >= first - 1e-6)).toHaveLength(0);
    e.stopVamp();
  });

  it("no count-in asked for means no count-in clicks", async () => {
    const e = new AudioEngine();
    await e.start(drill({ click: false, countInBeats: 0 }));
    expect(clicks(ctxOf(e))).toHaveLength(0);
    e.stop(true);
  });
});

describe("the 6/8 bed fills the whole bar", () => {
  // The old pattern ([0, 1, 2], bass [0, 1.5]) left beats 4–6 of every bar silent.
  it("has a chord and a bass note in each half of the bar", () => {
    const { chord, bass } = COMP["68"];
    expect(chord.some((b) => b < 3)).toBe(true);
    expect(chord.some((b) => b >= 3 && b < 6)).toBe(true);
    expect(bass).toEqual([0, 3]);
    expect([...chord, ...bass].every((b) => b >= 0 && b < 6)).toBe(true);
  });

  it("sounds in beats 4–6 when played", async () => {
    const e = new AudioEngine();
    await e.startVamp(vamp({ feel: "68", beatsPerBar: 6, countInBeats: 0 }));
    const c = ctxOf(e);
    const bar = 0.3;
    const beats = [...c.sources, ...c.oscillators.filter((o) => o.type !== "square")]
      .flatMap((s) => s.starts).map((t) => (t - bar) / 0.5).filter((b) => b >= 0 && b < 6);
    expect(beats.some((b) => b >= 3)).toBe(true);
    e.stopVamp();
  });
});

describe("two players never sound together", () => {
  it("starting a drill ends a running vamp, scheduler and all", async () => {
    const e = new AudioEngine();
    await e.startVamp(vamp({ countInBeats: 0 }));
    const c = ctxOf(e);
    const vampNodes = [...c.sources, ...c.oscillators];
    expect(e.vamping).toBe(true);
    await e.start(drill({ countInBeats: 0 }));
    expect(e.vamping).toBe(false);
    expect(e.vampPosition()).toBeNull();
    expect(vampNodes.filter((n) => n.starts.length).every((n) => n.stops.length > 0)).toBe(true);
    e.stop(true);
  });

  it("a stale run of the same player never clears the newer run's playing flag", () => {
    const s = getSession();
    s.register("ear", "drill", () => {});
    const first = s.claim("ear");     // the prompt, still loading the piano
    const second = s.claim("ear");    // the answer, tapped before it loaded
    expect(s.valid(first)).toBe(false);
    expect(supersededBySelf(second, first)).toBe(true);   // first must leave `playing` alone
    expect(supersededBySelf(-1, first)).toBe(false);      // after a real stop it may clear it
    expect(supersededBySelf(first, first)).toBe(false);   // a failed start clears it
    s.stopAll("test");
  });
});

describe("a written stack is played in its written order", () => {
  it("keeps every stack in thirds ascending, in every key, inside the sampled range", () => {
    for (const k of KEYS) {
      const s = buildScale(k, "diatonic", 0);
      const played = playableStack(stackInThirds(s.notes).notes.map(midi));
      for (let i = 1; i < played.length; i++) expect(played[i]).toBeGreaterThan(played[i - 1]);
      expect(Math.max(...played)).toBeLessThanOrEqual(TOP_SAMPLE);
    }
  });

  it("G major (no 4): G B D F♯ A E, the E on top", () => {
    const s = buildScale("G", "diatonic", 0);
    const played = playableStack(stackInThirds(s.notes).notes.map(midi));
    expect(played.map((m) => m % 12)).toEqual([7, 11, 2, 6, 9, 4]);
    expect(played[5]).toBe(Math.max(...played));
  });

  it("leaves a stack that already fits alone", () => {
    expect(playableStack([60, 64, 67])).toEqual([60, 64, 67]);
    expect(playableStack([])).toEqual([]);
  });
});
