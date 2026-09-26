/**
 * iPad / iPhone sound: the unlock that runs on the first tap, the Silent
 * switch work-round, recovery after an interruption, and the hint.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AudioUnlock, HINT_TEXT, isAppleTouch, needsHint, requestPlaybackSession, silentWav,
} from "../src/lib/audio/unlock";
import { AudioEngine } from "../src/lib/audio/engine";

const IPAD = "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
const IPADOS_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

/* ── a tiny fake DOM: just what the unlock touches ─────────────────────── */

class FakeEl {
  children: FakeEl[] = [];
  attrs: Record<string, string> = {};
  dataset: Record<string, string> = {};
  textContent = "";
  id = "";
  type = "";
  paused = true;
  loop = false;
  preload = "";
  src = "";
  plays = 0;
  playResult: "ok" | "reject" = "ok";
  listeners: Record<string, () => void> = {};
  constructor(public tag: string) {}
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  appendChild(c: FakeEl) { this.children.push(c); return c; }
  append(...c: FakeEl[]) { this.children.push(...c); }
  addEventListener(t: string, fn: () => void) { this.listeners[t] = fn; }
  play() {
    this.plays++;
    if (this.playResult === "reject") return Promise.reject(new Error("NotAllowedError"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() { this.paused = true; }
}

class FakeDoc {
  created: FakeEl[] = [];
  head = new FakeEl("head");
  body = new FakeEl("body");
  audioPlay: "ok" | "reject" = "ok";
  createElement(tag: string) {
    const el = new FakeEl(tag);
    if (tag === "audio") el.playResult = this.audioPlay;
    this.created.push(el);
    return el;
  }
  getElementById(id: string) { return this.head.children.find((c) => c.id === id) ?? null; }
  get hint() { return this.body.children.find((c) => "data-audio-hint" in c.attrs) ?? null; }
  get audio() { return this.created.filter((c) => c.tag === "audio"); }
}

class FakeCtx {
  state = "suspended";
  resumes = 0;
  onState: (() => void) | null = null;
  resume() { this.resumes++; return Promise.resolve(); }
  addEventListener(_: string, fn: () => void) { this.onState = fn; }
  set(state: string) { this.state = state; this.onState?.(); }
}

function rig(o: { ios: boolean; session?: boolean; audioPlay?: "ok" | "reject" }) {
  const doc = new FakeDoc();
  doc.audioPlay = o.audioPlay ?? "ok";
  let ctx: FakeCtx | null = null;
  const wake = vi.fn(() => { ctx ??= new FakeCtx(); ctx.resume(); });
  const nav: { audioSession?: { type: string } } = o.session ? { audioSession: { type: "auto" } } : {};
  const unlock = new AudioUnlock(
    { wake, context: () => ctx },
    { ios: o.ios, nav, doc: doc as unknown as Document },
  );
  return { unlock, doc, wake, nav, ctx: () => ctx! };
}

describe("which devices get the iOS treatment", () => {
  it("knows iPad, iPhone, Chrome on iOS and iPadOS in desktop mode", () => {
    expect(isAppleTouch(IPAD, "iPad", 5)).toBe(true);
    expect(isAppleTouch(IPHONE_CHROME, "iPhone", 5)).toBe(true);
    expect(isAppleTouch(IPADOS_DESKTOP, "MacIntel", 5)).toBe(true);
  });
  it("leaves a real Mac and Android alone", () => {
    expect(isAppleTouch(IPADOS_DESKTOP, "MacIntel", 0)).toBe(false);
    expect(isAppleTouch(ANDROID, "Linux armv8l", 5)).toBe(false);
  });
});

describe("the Silent switch", () => {
  it("asks for the playback audio session where Safari has one", () => {
    const nav = { audioSession: { type: "auto" } };
    expect(requestPlaybackSession(nav)).toBe(true);
    expect(nav.audioSession.type).toBe("playback");
  });
  it("reports false when there is no audio session, or it refuses", () => {
    expect(requestPlaybackSession({})).toBe(false);
    const stubborn = { get type() { return "auto"; }, set type(_: string) { throw new Error("no"); } };
    expect(requestPlaybackSession({ audioSession: stubborn })).toBe(false);
  });
  it("the fallback sound is a real WAV of pure silence", () => {
    const uri = silentWav();
    expect(uri.startsWith("data:audio/wav;base64,")).toBe(true);
    const bytes = Buffer.from(uri.split(",")[1], "base64");
    expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
    expect(bytes.readUInt32LE(24)).toBe(8000);
    expect(bytes.readUInt32LE(40)).toBe(1600);
    expect(bytes.length).toBe(44 + 1600);
    expect([...bytes.subarray(44)].every((b) => b === 128)).toBe(true);
  });
  it("sets the session at load, before any tap, on iOS only", () => {
    expect(rig({ ios: true, session: true }).nav.audioSession!.type).toBe("playback");
    expect(rig({ ios: false, session: true }).nav.audioSession!.type).toBe("auto");
  });
});

describe("the first tap", () => {
  it("creates and resumes the context synchronously, inside the tap", () => {
    const r = rig({ ios: true, session: true });
    r.unlock.onGesture();
    // no await between the tap and these checks: it all happened in the handler
    expect(r.wake).toHaveBeenCalledTimes(1);
    expect(r.ctx().resumes).toBeGreaterThanOrEqual(1);
  });
  it("wakes once; later taps only resume a context that is not running", () => {
    const r = rig({ ios: false });
    r.unlock.onGesture();
    const after = r.ctx().resumes;
    r.ctx().state = "running";
    r.unlock.onGesture();
    expect(r.wake).toHaveBeenCalledTimes(1);
    expect(r.ctx().resumes).toBe(after);
    r.ctx().state = "interrupted";           // a phone call, Siri
    r.unlock.onGesture();
    expect(r.ctx().resumes).toBe(after + 1);
  });
  it("plays the silent element in the same tap when there is no audio session", () => {
    const r = rig({ ios: true, session: false });
    r.unlock.onGesture();
    expect(r.doc.audio).toHaveLength(1);
    expect(r.doc.audio[0].plays).toBe(1);
    expect(r.doc.audio[0].loop).toBe(true);
    expect(r.doc.audio[0].attrs["playsinline"]).toBe("");
  });
  it("needs no silent element where the audio session works, nor off iOS", () => {
    const withSession = rig({ ios: true, session: true });
    withSession.unlock.onGesture();
    expect(withSession.doc.audio).toHaveLength(0);
    const desktop = rig({ ios: false });
    desktop.unlock.onGesture();
    expect(desktop.doc.audio).toHaveLength(0);
  });
});

describe("coming back after a tab switch or a call", () => {
  it("resumes a suspended context when the tab is visible again", () => {
    const r = rig({ ios: true, session: true });
    r.unlock.onGesture();
    r.ctx().state = "interrupted";
    const before = r.ctx().resumes;
    r.unlock.onVisible();
    expect(r.ctx().resumes).toBe(before + 1);
  });
  it("pauses the silent element while hidden and replays it on the next tap", () => {
    const r = rig({ ios: true, session: false });
    r.unlock.onGesture();
    r.unlock.onHidden();
    expect(r.doc.audio[0].paused).toBe(true);
    r.unlock.onGesture();
    expect(r.doc.audio[0].plays).toBe(2);
  });
});

describe("the hint", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("rules: iOS only, and only when sound did not start", () => {
    expect(needsHint({ ios: false, state: "suspended", session: false, keeper: false })).toBe(false);
    expect(needsHint({ ios: true, state: null, session: false, keeper: null })).toBe(false);
    expect(needsHint({ ios: true, state: "running", session: true, keeper: null })).toBe(false);
    expect(needsHint({ ios: true, state: "running", session: false, keeper: true })).toBe(false);
    expect(needsHint({ ios: true, state: "suspended", session: true, keeper: null })).toBe(true);
    expect(needsHint({ ios: true, state: "interrupted", session: true, keeper: null })).toBe(true);
    expect(needsHint({ ios: true, state: "running", session: false, keeper: false })).toBe(true);
  });

  it("shows on an iPad whose context is still not running after a tap, then clears", async () => {
    const r = rig({ ios: true, session: true });
    r.unlock.onGesture();
    expect(r.doc.hint).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    const hint = r.doc.hint!;
    expect(hint.dataset.show).toBe("1");
    expect(hint.children[0].textContent).toBe(HINT_TEXT);
    expect(hint.attrs.role).toBe("status");
    r.ctx().set("running");
    expect(hint.dataset.show).toBe("0");
  });

  it("stays away when the context runs", async () => {
    const r = rig({ ios: true, session: true });
    r.unlock.onGesture();
    r.ctx().state = "running";
    await vi.advanceTimersByTimeAsync(1000);
    expect(r.doc.hint).toBeNull();
  });

  it("never shows on a desktop or Android, even if audio is blocked", async () => {
    const r = rig({ ios: false });
    r.unlock.onGesture();
    await vi.advanceTimersByTimeAsync(1000);
    expect(r.doc.hint).toBeNull();
  });

  it("shows when neither the audio session nor the silent element worked", async () => {
    const r = rig({ ios: true, session: false, audioPlay: "reject" });
    r.unlock.onGesture();
    r.ctx().state = "running";
    await vi.advanceTimersByTimeAsync(1000);
    expect(r.doc.hint?.dataset.show).toBe("1");
  });

  it("can be dismissed, and then stays dismissed", async () => {
    const r = rig({ ios: true, session: true });
    r.unlock.onGesture();
    await vi.advanceTimersByTimeAsync(1000);
    const close = r.doc.hint!.children[1];
    expect(close.attrs["aria-label"]).toBe("Dismiss");
    close.listeners.click();
    expect(r.doc.hint!.dataset.show).toBe("0");
    r.unlock.onGesture();
    await vi.advanceTimersByTimeAsync(1000);
    expect(r.doc.hint!.dataset.show).toBe("0");
  });
});

/* ── the engine's side of it ───────────────────────────────────────────── */

class Param {
  value = 1;
  cancelScheduledValues() {}
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
}
class Node_ { connect() { return this; } disconnect() {} }
class Source extends Node_ {
  buffer: unknown = null; playbackRate = new Param(); frequency = new Param(); type = "sine";
  onended: (() => void) | null = null;
  start() {} stop() {}
}
class Gain extends Node_ { gain = new Param(); }

class SuspendedCtx {
  currentTime = 0;
  state = "suspended";
  destination = new Node_();
  resumeCalls = 0;
  decodes = 0;
  createGain() { return new Gain(); }
  createBufferSource() { return new Source(); }
  createOscillator() { return new Source(); }
  resume() { this.resumeCalls++; this.state = "running"; return Promise.resolve(); }
  decodeAudioData(_: ArrayBuffer, ok?: (b: unknown) => void, _bad?: (e: unknown) => void): Promise<unknown> | undefined {
    this.decodes++; ok?.({}); return Promise.resolve({});
  }
}

describe("engine on WebKit", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1),
    })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("calls resume() before the first await of a preview, so it counts as the tap", () => {
    vi.stubGlobal("window", { AudioContext: SuspendedCtx });
    const engine = new AudioEngine();
    void engine.preview([67]);
    expect((engine.context as unknown as SuspendedCtx).resumeCalls).toBe(1);
  });

  it("warm() — the first tap anywhere — creates, resumes and starts loading the piano", async () => {
    vi.stubGlobal("window", { AudioContext: SuspendedCtx });
    const engine = new AudioEngine();
    engine.warm();
    const ctx = engine.context as unknown as SuspendedCtx;
    expect(ctx.resumeCalls).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(engine.totalSamples);
    await engine.waitForSampleLoading();
    expect(engine.loadedSamples).toBe(engine.totalSamples);
  });

  it("never hangs Play when iOS leaves resume() pending: it reports blocked", async () => {
    class Stuck extends SuspendedCtx { resume() { this.resumeCalls++; return new Promise<void>(() => {}); } }
    vi.stubGlobal("window", { AudioContext: Stuck });
    vi.useFakeTimers();
    const engine = new AudioEngine();
    const started = engine.preview([67]);
    const seen = expect(started).rejects.toThrow("Audio is blocked by the browser");
    await vi.advanceTimersByTimeAsync(2000);
    await seen;
  });

  it("resumes an interrupted context on the next play", async () => {
    vi.stubGlobal("window", { AudioContext: SuspendedCtx });
    const engine = new AudioEngine();
    await engine.preview([67]);
    const ctx = engine.context as unknown as SuspendedCtx;
    ctx.state = "interrupted";
    await expect(engine.preview([67])).resolves.toBe(true);
    expect(ctx.resumeCalls).toBe(2);
    expect(ctx.state).toBe("running");
  });

  it("decodes on older Safari, where decodeAudioData only takes callbacks", async () => {
    class OldSafari extends SuspendedCtx {
      decodeAudioData(_: ArrayBuffer, ok?: (b: unknown) => void): Promise<unknown> | undefined {
        this.decodes++;
        setTimeout(() => ok?.({}), 0);
        return undefined;
      }
    }
    vi.stubGlobal("window", { AudioContext: OldSafari });
    const engine = new AudioEngine();
    await engine.init();
    await engine.waitForSampleLoading();
    expect(engine.loadedSamples).toBe(engine.totalSamples);
    expect(engine.sampleFailures).toBe(0);
  });

  it("a decode failure reported only through the error callback falls back to the synth", async () => {
    class BadDecode extends SuspendedCtx {
      decodeAudioData(_: ArrayBuffer, _ok?: unknown, bad?: (e: unknown) => void): Promise<unknown> | undefined {
        setTimeout(() => bad?.(new Error("EncodingError")), 0);
        return undefined;
      }
    }
    vi.stubGlobal("window", { AudioContext: BadDecode });
    const engine = new AudioEngine();
    await engine.init();
    await engine.waitForSampleLoading();
    expect(engine.loadedSamples).toBe(0);
    expect(engine.sampleFailures).toBe(engine.totalSamples);
    await expect(engine.preview([67, 71, 74])).resolves.toBe(true);
    expect(engine.fallbackNoteCount).toBe(3);
  });
});
