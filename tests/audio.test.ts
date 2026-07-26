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
    await engine.waitForSampleLoading();
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

  it("keeps playing offline and retries failed samples on the next gesture", async () => {
    const engine = new AudioEngine();
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    await expect(engine.start(opts({ click: false, countInBeats: 0 }))).resolves.toBe(true);
    await engine.waitForSampleLoading();
    expect(engine.ready).toBe(true);
    expect(engine.loading).toBe(false);
    expect(engine.loadedSamples).toBe(0);
    expect(engine.sampleFailures).toBe(engine.totalSamples);
    expect(engine.fallbackNoteCount).toBeGreaterThan(0);
    engine.stop(true);

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1),
    })));
    await expect(engine.init()).resolves.toBeUndefined();
    await engine.waitForSampleLoading();
    expect(engine.loadedSamples).toBe(engine.totalSamples);
    expect(engine.sampleFailures).toBe(0);
  });

  it("does not let one failed piano file break the other sixteen", async () => {
    const engine = new AudioEngine();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/C2.mp3")) throw new Error("blocked");
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1) };
    }));
    await expect(engine.start(opts({ click: false, countInBeats: 0 }))).resolves.toBe(true);
    await engine.waitForSampleLoading();
    expect(engine.loadedSamples).toBe(engine.totalSamples - 1);
    expect(engine.sampleFailures).toBe(1);
    expect(engine.playing).toBe(true);
    engine.stop(true);
  });

  it("starts on its pitched fallback without waiting for a slow network", async () => {
    const engine = new AudioEngine();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await expect(engine.start(opts({ click: false, countInBeats: 0 }))).resolves.toBe(true);
    const context = engine.context as unknown as FakeAudioContext;
    const fallback = context.oscillators.filter((source) => source.type === "triangle");
    expect(engine.loading).toBe(true);
    expect(engine.loadedSamples).toBe(0);
    expect(engine.fallbackNoteCount).toBeGreaterThan(0);
    expect(fallback.length).toBeGreaterThan(0);
    engine.stop(true);
    expect(fallback.every((source) => source.stops.length > 1)).toBe(true);
  });

  it("reports browser-blocked audio instead of pretending to play", async () => {
    class BlockedAudioContext extends FakeAudioContext {
      state = "suspended";
      resume() { return Promise.reject(new Error("gesture required")); }
    }
    vi.stubGlobal("window", { AudioContext: BlockedAudioContext });
    const engine = new AudioEngine();
    await expect(engine.start(opts())).rejects.toThrow("Audio is blocked by the browser");
    expect(engine.playing).toBe(false);
  });

  it("schedules a 420-note drill without overrunning its finite sequence", async () => {
    const engine = new AudioEngine();
    const notes = Array.from({ length: 420 }, (_, index) =>
      note((["C", "D", "E", "G", "A", "B"] as const)[index % 6])
    );
    await engine.init();
    await engine.waitForSampleLoading();
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
