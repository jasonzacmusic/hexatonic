/**
 * The session's stop semantics, exercised rather than inspected.
 * The contract test checks the SHAPE of the code; this checks its BEHAVIOUR.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/lib/audio/engine", () => {
  const calls: string[] = [];
  return {
    __calls: calls,
    getAudio: () => ({
      stop: (silent?: boolean) => calls.push(`stop(${!!silent})`),
      stopVamp: (silent?: boolean) => calls.push(`stopVamp(${!!silent})`),
    }),
  };
});

import { getSession } from "../src/lib/audio/session";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __calls } = await import("../src/lib/audio/engine") as any;

const s = getSession();
beforeEach(() => { s.stopAll("reset"); __calls.length = 0; });

describe("one owner at a time", () => {
  it("starting a second player stops the first, unasked", () => {
    const stopA = vi.fn(), stopB = vi.fn();
    s.register("a", "drill", stopA);
    s.register("b", "vamp", stopB);
    s.claim("a");
    expect(stopA).not.toHaveBeenCalled();
    s.claim("b");
    expect(stopA).toHaveBeenCalledTimes(1);   // A was stopped for us
    expect(stopB).not.toHaveBeenCalled();
  });

  it("unmounting the active owner stops it", () => {
    const stop = vi.fn();
    const unregister = s.register("a", "drill", stop);
    s.claim("a");
    unregister();
    expect(stop).toHaveBeenCalled();
    expect(s.active).toBe(false);
  });

  it("unmounting an inactive owner stops nothing", () => {
    const stopA = vi.fn(), stopB = vi.fn();
    const unA = s.register("a", "drill", stopA);
    s.register("b", "vamp", stopB);
    s.claim("b");
    unA();
    expect(stopA).not.toHaveBeenCalled();
    expect(stopB).not.toHaveBeenCalled();
  });
});

describe("epochs refuse stale work", () => {
  it("an epoch is invalid the moment anything stops", () => {
    s.register("a", "drill", () => {});
    const e = s.claim("a");
    expect(s.valid(e)).toBe(true);
    s.stopAll("user");
    expect(s.valid(e)).toBe(false);
  });

  it("an epoch is invalid once someone else claims playback", () => {
    s.register("a", "drill", () => {});
    s.register("b", "vamp", () => {});
    const e = s.claim("a");
    s.claim("b");
    expect(s.valid(e), "A's epoch must die when B claims").toBe(false);
  });

  it("restarting the same owner invalidates the previous run", () => {
    s.register("a", "drill", () => {});
    const first = s.claim("a");
    const second = s.claim("a");
    expect(first).not.toBe(second);
    expect(s.valid(first)).toBe(false);
    expect(s.valid(second)).toBe(true);
  });

  it("epochs never repeat, so a late callback can never alias a live run", () => {
    s.register("a", "drill", () => {});
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      seen.add(s.claim("a"));
      s.stopAll("cycle");
    }
    expect(seen.size).toBe(200);
  });
});

describe("stopAll is total", () => {
  it("reaches both schedulers every time", () => {
    s.register("a", "drill", () => {});
    s.claim("a");
    s.stopAll("test");
    expect(__calls).toContain("stopVamp(true)");
    expect(__calls).toContain("stop(true)");
  });

  it("is safe to call when nothing is playing, and repeatedly", () => {
    expect(() => { s.stopAll(); s.stopAll(); s.stopAll(); }).not.toThrow();
    expect(s.active).toBe(false);
  });

  it("leaves nothing active afterwards", () => {
    s.register("a", "drill", () => {});
    s.claim("a");
    expect(s.active).toBe(true);
    s.stopAll("test");
    expect(s.active).toBe(false);
    expect(s.activeKind).toBeNull();
  });

  it("survives an owner whose stop callback throws", () => {
    s.register("bad", "drill", () => { throw new Error("boom"); });
    s.claim("bad");
    expect(() => s.stopAll("test")).toThrow();  // it propagates…
    expect(s.active, "…but the session is still left stopped").toBe(false);
  });
});

describe("rapid start/stop", () => {
  it("a hundred alternations leave nothing playing", () => {
    const stop = vi.fn();
    s.register("a", "drill", stop);
    for (let i = 0; i < 100; i++) { s.claim("a"); s.stopAll("cycle"); }
    expect(s.active).toBe(false);
    expect(stop).toHaveBeenCalledTimes(100);
  });
});
