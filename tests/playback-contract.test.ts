/**
 * THE PLAYBACK CONTRACT.
 *
 * Every other test in this repo checks code that exists. This one checks code
 * that does not exist yet — it reads the source tree and fails when a NEW screen
 * starts sustained audio without going through the lifecycle that stops it.
 *
 * That is the point. "Audio that will not stop" has been a bug here twice, and
 * both times the cause was a new surface forgetting one of the ways playback has
 * to end. You cannot write a test for a screen nobody has written yet, but you
 * can write a test that refuses to let it be written wrongly.
 *
 * If this fails on a file you just added: use `usePlayback()` from
 * src/lib/audio/usePlayback.ts rather than calling the engine directly.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Comments explain the rules; only real code can break them. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const files = walk(SRC).map((path) => {
  const text = readFileSync(path, "utf8");
  return { path, rel: path.slice(SRC.length + 1), text, code: stripComments(text) };
});

/** Files allowed to talk to the engine directly — the plumbing itself. */
const PLUMBING = [
  "lib/audio/engine.ts",
  "lib/audio/session.ts",
  "lib/audio/usePlayback.ts",
  "lib/useDrill.ts",           // the shared drill hook, itself lifecycle-managed
];

/** Sustained playback — the kind that keeps going until something stops it. */
const SUSTAINED = /\.\s*start\s*\(|\.\s*startVamp\s*\(/;

describe("playback contract", () => {
  it("sustained audio is only ever started inside a managed begin()", () => {
    /* The real invariant is not "never call the engine" — it is "never call it
       outside the lifecycle". A file may start the engine directly as long as it
       does so inside usePlayback's begin(), which is what installs the stops. */
    const offenders = files
      .filter((f) => !PLUMBING.includes(f.rel))
      .filter((f) => SUSTAINED.test(f.code))
      .filter((f) => !(f.code.includes("usePlayback(") && /\.begin\s*\(/.test(f.code)))
      .map((f) => f.rel);
    expect(
      offenders,
      `These files start sustained audio outside a managed lifecycle. Wrap the ` +
      `call in usePlayback().begin() so unmount, route change, tab hide and ` +
      `unload all stop it automatically.`
    ).toEqual([]);
  });

  it("every managed start checks its guard before painting or continuing", () => {
    /* begin() hands you a guard. Ignoring it is how a stopped run keeps
       repainting — or worse, keeps scheduling — because the async work that
       started before the stop finishes after it. */
    const users = files.filter((f) => /\.begin\s*\(/.test(f.code) && f.rel !== "lib/audio/usePlayback.ts");
    expect(users.length, "expected to find managed playback callers").toBeGreaterThan(0);
    for (const f of users)
      expect(/guard\s*\(\s*\)/.test(f.code), `${f.rel} ignores the guard from begin()`).toBe(true);
  });

  it("every screen that starts sustained audio also stops it on unmount", () => {
    const screens = files.filter(
      (f) => f.rel.startsWith("app/") && /startVamp\(|useDrill\(|usePlayback\(/.test(f.code)
    );
    expect(screens.length, "expected to find playback screens").toBeGreaterThan(0);
    for (const f of screens) {
      const managed =
        f.code.includes("usePlayback(") ||   // the hook handles it
        f.code.includes("useDrill(");        // which itself uses the hook
      expect(managed, `${f.rel} starts audio without a managed lifecycle`).toBe(true);
    }
  });

  it("nothing schedules audio from a bare setTimeout or setInterval", () => {
    // The scheduler must own timing. A stray timer is exactly how a stopped run
    // keeps making sound — it survives the stop because nothing cancels it.
    const offenders = files
      .filter((f) => !PLUMBING.includes(f.rel))
      .filter((f) =>
        /set(Timeout|Interval)\([^)]*\b(note|preview|previewAudio|start|startVamp)\b/.test(f.text)
      )
      .map((f) => f.rel);
    expect(
      offenders,
      "Schedule against AudioContext.currentTime, not a JS timer."
    ).toEqual([]);
  });

  it("the global stop handlers cover every way a page can end", () => {
    const s = files.find((f) => f.rel === "lib/audio/session.ts")!.text;
    for (const hook of ["pagehide", "beforeunload", "visibilitychange", "popstate",
                        "pushState", "replaceState"])
      expect(s, `session.ts must handle ${hook}`).toContain(hook);
  });

  it("stopAll reaches BOTH schedulers, so neither can outlive the other", () => {
    const s = files.find((f) => f.rel === "lib/audio/session.ts")!.text;
    const stopAll = s.slice(s.indexOf("stopAll("));
    expect(stopAll).toContain("stopVamp");
    expect(stopAll).toContain("a.stop(");
  });

  it("the engine still uses a lookahead scheduler, not requestAnimationFrame", () => {
    // rAF is throttled when the tab is backgrounded. That throttling is what let
    // a 48-note drill run 457 notes past its end. Audio timing must never depend
    // on it again; rAF is for painting only.
    const e = files.find((f) => f.rel === "lib/audio/engine.ts")!.code;
    expect(e).toContain("setInterval");
    expect(e, "engine.ts must not CALL rAF; the comment explaining why is fine")
      .not.toMatch(/requestAnimationFrame\s*\(/);
  });
});
