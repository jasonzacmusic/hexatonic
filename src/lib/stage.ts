"use client";

/**
 * Stage mode: `?stage=1` on any page turns it into a clean 1920×1080 frame for
 * filming a lesson. The menu bar, the footer, the Support button and the
 * secondary controls hide; type grows; a 64px safe margin frames everything.
 *
 * A tiny script in the page head sets <html data-stage="1"> before the first
 * paint, so a filmed page never flashes the menu. Everything visual is CSS
 * (globals.css, `html[data-stage]`); anything marked `stage-hide` disappears.
 * Pages that rewrite their own URL keep the flag with `keepStage`.
 */

import { useEffect, useState } from "react";

/** Runs in <head> before paint. Keep it tiny and dependency-free. */
export const STAGE_BOOT =
  "try{if(/[?&]stage=1(&|$)/.test(location.search))document.documentElement.setAttribute('data-stage','1')}catch(e){}";

export function isStage(): boolean {
  try { return document.documentElement.getAttribute("data-stage") === "1"; } catch { return false; }
}

/** True in stage mode, after mount (false during the server render). */
export function useStage(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(isStage()); }, []);
  return on;
}

/** Add stage=1 to a query string when the page is in stage mode. */
export function keepStage(q: URLSearchParams): URLSearchParams {
  if (isStage()) q.set("stage", "1");
  return q;
}
