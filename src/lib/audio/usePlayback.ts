"use client";

/**
 * The hook every screen that makes sustained sound MUST use.
 *
 * It is deliberately the only convenient way to start playback, so that the
 * automatic endings in session.ts cannot be skipped by accident. A screen that
 * calls the engine directly will be caught by tests/playback-contract.test.ts.
 *
 * What you get for free:
 *   · whatever else was playing is stopped before you start
 *   · unmounting this component stops it
 *   · navigating away stops it
 *   · hiding the tab or closing it stops it
 *   · a `guard()` that refuses work belonging to a run the user already stopped
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getSession, installGlobalStops, PlaybackKind } from "./session";

export interface PlaybackHandle {
  playing: boolean;
  /** Start. `run` receives a guard; call it before touching UI or scheduling. */
  begin: (run: (guard: () => boolean) => Promise<boolean> | boolean) => Promise<void>;
  end: () => void;
  toggle: (run: (guard: () => boolean) => Promise<boolean> | boolean) => void;
  /** True while this owner is the one making sound. */
  isActive: () => boolean;
}

export function usePlayback(kind: PlaybackKind, onStop: () => void): PlaybackHandle {
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const epoch = useRef(-1);
  const stopRef = useRef(onStop);
  stopRef.current = onStop;

  useEffect(() => {
    installGlobalStops();
    const unregister = getSession().register(id, kind, () => {
      epoch.current = -1;
      setPlaying(false);
      stopRef.current();
    });
    return unregister;
  }, [id, kind]);

  const end = useCallback(() => {
    getSession().stopAll("user stopped");
  }, []);

  const begin = useCallback(
    async (run: (guard: () => boolean) => Promise<boolean> | boolean) => {
      const s = getSession();
      const mine = s.claim(id);
      epoch.current = mine;
      const guard = () => s.valid(mine) && epoch.current === mine;
      setPlaying(true);
      let ok = false;
      try {
        ok = await run(guard);
      } catch {
        ok = false;
      }
      if (!ok || !guard()) {
        // either it failed, or something else claimed playback while we awaited
        if (s.valid(mine)) s.stopAll("start failed");
        setPlaying(false);
      }
    },
    [id]
  );

  const toggle = useCallback(
    (run: (guard: () => boolean) => Promise<boolean> | boolean) => {
      if (playing) end();
      else void begin(run);
    },
    [playing, begin, end]
  );

  const isActive = useCallback(() => getSession().valid(epoch.current), []);

  return { playing, begin, end, toggle, isActive };
}
