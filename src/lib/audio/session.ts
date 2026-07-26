"use client";

/**
 * THE PLAYBACK LIFECYCLE GUARANTEE.
 *
 * This file exists because "audio that will not stop" has already been a bug in
 * this app twice, and both times it was introduced by a change somewhere else:
 *
 *   · a requestAnimationFrame loop owned the scheduler, so backgrounding the tab
 *     throttled it and a 48-note drill ran hundreds of notes past its loop point;
 *   · the stop() fade left the master gain at zero, so the next play was silent.
 *
 * The pattern is always the same — a NEW surface is added, and it forgets one of
 * the ways playback has to end. Testing each surface individually does not catch
 * that, because the surface that breaks it is the one nobody wrote a test for.
 *
 * So this is structural rather than a matter of discipline:
 *
 *   1. ONE OWNER. Whatever is playing registers here. Starting anything stops
 *      whatever was playing before, automatically, without the caller asking.
 *   2. EPOCHS. Every start bumps a counter. Anything scheduled under an old
 *      epoch is refused, so a late callback from a stopped run cannot make sound.
 *   3. AUTOMATIC ENDINGS. Route change, unmount, page hide, and page unload all
 *      stop playback without any screen having to remember to.
 *   4. A CONTRACT TEST. `tests/playback-contract.test.ts` reads the source and
 *      fails if a new screen starts audio without using the lifecycle hook. That
 *      is the part that protects future changes rather than present ones.
 */

import { getAudio } from "./engine";

export type PlaybackKind = "drill" | "vamp" | "preview";

interface Owner {
  id: string;
  kind: PlaybackKind;
  stop: () => void;
}

class AudioSession {
  private owners = new Map<string, Owner>();
  private activeId: string | null = null;
  private epochCounter = 0;

  /** Bumped on every start and every stop. Stale work checks against it. */
  get epoch() { return this.epochCounter; }

  /** True while a sustained player (drill or vamp) is running. Previews do not count. */
  get active() { return this.activeId !== null; }
  get activeKind() { return this.activeId ? this.owners.get(this.activeId)?.kind ?? null : null; }

  register(id: string, kind: PlaybackKind, stop: () => void) {
    this.owners.set(id, { id, kind, stop });
    return () => {
      // unmounting an owner that is currently playing must stop it
      if (this.activeId === id) this.stopAll("owner unmounted");
      this.owners.delete(id);
    };
  }

  /** Claim playback. Anything else sounding is stopped first. Returns the epoch
   *  the caller must quote when scheduling, so late work can be refused. */
  claim(id: string): number {
    if (this.activeId && this.activeId !== id) {
      this.owners.get(this.activeId)?.stop();
    }
    this.activeId = id;
    return ++this.epochCounter;
  }

  /** True if this epoch is still the current one. Anything scheduled under an
   *  older epoch belongs to a run the user already stopped. */
  valid(epoch: number) { return epoch === this.epochCounter && this.activeId !== null; }

  release(id: string) {
    if (this.activeId === id) {
      this.activeId = null;
      this.epochCounter++;
    }
  }

  /** The one true stop. Everything routes here. */
  stopAll(_reason = "explicit") {
    const current = this.activeId;
    this.activeId = null;
    this.epochCounter++;
    if (current) this.owners.get(current)?.stop();
    const a = getAudio();
    a.stopVamp(true);
    a.stop(true);
  }
}

let session: AudioSession | null = null;
export const getSession = (): AudioSession => (session ??= new AudioSession());

/* ── the automatic endings ───────────────────────────────────────────────
   Installed once, globally. Nothing has to opt in.                        */

let installed = false;

export function installGlobalStops() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const stop = (reason: string) => () => getSession().stopAll(reason);

  window.addEventListener("pagehide", stop("pagehide"));
  window.addEventListener("beforeunload", stop("unload"));
  document.addEventListener("visibilitychange", () => {
    // Hiding the tab must not leave a loop running against a throttled timer.
    if (document.visibilityState === "hidden") getSession().stopAll("tab hidden");
  });
  // Any in-app navigation. Next's client router replaces history entries, so we
  // watch both the History API and popstate.
  const patch = (name: "pushState" | "replaceState") => {
    const original = history[name];
    history[name] = function (this: History, ...args: any[]) {
      const before = location.pathname;
      const out = original.apply(this, args as any);
      if (location.pathname !== before) getSession().stopAll("route change");
      return out;
    } as typeof history[typeof name];
  };
  patch("pushState");
  patch("replaceState");
  window.addEventListener("popstate", stop("history back"));
}
