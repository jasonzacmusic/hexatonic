import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine, type PlaybackOptions } from "../src/lib/audio/engine";
import { note } from "../src/lib/theory/note";

class FakeParam {
  value = 1;
  cancelScheduledValues() {}
  setValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
}

class FakeNode {
  connect() { return this; }
}

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

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = new FakeNode();
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  oscillators: FakeOscillator[] = [];
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createOscillator() {
    const source = new FakeOscillator();
    this.oscillators.push(source);
    return source;
  }
  decodeAudioData() { return Promise.resolve({}); }
  resume() { this.state = "running"; return Promise.resolve(); }
}

const opts = (overrides: Partial<PlaybackOptions> = {}): PlaybackOptions => ({
  notes: [note("C"), note("D"), note("E"), note("G")],
  stepDur: 0.2,
  grouping: 4,
  subdivision: 4,
  beatsPerBar: 4,
  loop: false,
  click: true,
  countInBeats: 4,
  beatDur: 0.5,
  ...overrides,
});

describe("audio transport", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shares one sample load across overlapping starts and keeps the master audible", async () => {
    const engine = new AudioEngine();
    const [first, second] = await Promise.all([engine.start(opts()), engine.start(opts())]);
    expect(first).toBe(false);
    expect(second).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(engine.totalSamples);
    expect(engine.loadedSamples).toBe(engine.totalSamples);
    expect((engine.context as unknown as FakeAudioContext).gains[0].gain.value).toBe(0.85);
    engine.stop(true);
  });

  it("cancels both piano and click sources immediately on stop", async () => {
    const engine = new AudioEngine();
    await engine.start(opts());
    const context = engine.context as unknown as FakeAudioContext;
    const allSources = [...context.sources, ...context.oscillators];
    expect(engine.liveNodeCount).toBeGreaterThan(0);
    engine.stop(true);
    expect(engine.liveNodeCount).toBe(0);
    expect(allSources.every((source) => source.stops.length > 0)).toBe(true);
  });

  it("clears a failed load so the next user gesture can retry", async () => {
    const engine = new AudioEngine();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    await expect(engine.init()).rejects.toThrow("offline");
    expect(engine.ready).toBe(false);
    expect(engine.loading).toBe(false);

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1),
    })));
    await expect(engine.init()).resolves.toBeUndefined();
    expect(engine.loadedSamples).toBe(engine.totalSamples);
  });

  it("schedules a 420-note drill without overrunning its finite sequence", async () => {
    const engine = new AudioEngine();
    const notes = Array.from({ length: 420 }, (_, index) =>
      note((["C", "D", "E", "G", "A", "B"] as const)[index % 6])
    );
    await engine.start(opts({ notes, stepDur: 0.01, countInBeats: 0, click: false }));
    const context = engine.context as unknown as FakeAudioContext;
    for (const time of [1, 2, 3, 4]) {
      context.currentTime = time;
      (engine as unknown as { pump(): void }).pump();
    }
    expect((engine as unknown as { queued: number }).queued).toBe(420);
    expect(context.sources).toHaveLength(420);
    engine.stop(true);
  });

  it("fires the natural-stop callback once", async () => {
    const onStop = vi.fn();
    const engine = new AudioEngine();
    await engine.start(opts({ notes: [note("C")], stepDur: 0.1, countInBeats: 0, click: false, onStop }));
    const context = engine.context as unknown as FakeAudioContext;
    context.currentTime = engine.startTime + 0.3;
    (engine as unknown as { pump(): void }).pump();
    (engine as unknown as { pump(): void }).pump();
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
