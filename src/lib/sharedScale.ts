"use client";

/**
 * The key and scale follow the player from page to page: choose D Dorian
 * (no 6) on Practice, open Harmony or Improvise, and it is still D Dorian.
 *
 * Stored in this browser only (localStorage). If storage is blocked the pages
 * simply open on their own defaults. A link that names a key or scale always
 * wins over what was remembered.
 *
 * Every page speaks the same three fields: key, family id, mode index. A page
 * that cannot show a remembered family keeps its own scale and takes the key.
 */

import { useEffect, useState } from "react";
import { FAMILIES, KEYS } from "./theory/scales";

export interface SharedScale {
  key: string;
  family: string;
  mode: number;
}

const STORE = "hx-scale";

/** A remembered scale, checked against the library; null if none or invalid. */
export function parseShared(raw: string | null): SharedScale | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<SharedScale>;
    if (typeof v.key !== "string" || !KEYS.includes(v.key)) return null;
    const family = typeof v.family === "string" ? v.family : "diatonic";
    const mode = Number.isInteger(v.mode) && (v.mode as number) >= 0 ? (v.mode as number) : 0;
    return { key: v.key, family, mode };
  } catch {
    return null;
  }
}

export function readShared(): SharedScale | null {
  try { return parseShared(window.localStorage.getItem(STORE)); } catch { return null; }
}

export function writeShared(part: Partial<SharedScale>) {
  try {
    const cur = readShared() ?? { key: "G", family: "diatonic", mode: 0 };
    const next = { ...cur, ...part };
    if (!KEYS.includes(next.key)) return;
    window.localStorage.setItem(STORE, JSON.stringify(next));
  } catch {}
}

/** True if `family` + `mode` is a scale the library can build. */
export function isLibraryScale(family: string, mode: number): boolean {
  const f = FAMILIES.find((x) => x.id === family);
  if (!f || f.kind === "custom") return false;
  return f.kind === "rotation" ? mode >= 0 && mode < (f.modes?.length ?? 0) : mode === 0;
}

/**
 * Remember this page's key (and scale, if given) and open on the remembered
 * one. `apply` receives the remembered scale once, on arrival; `skip` returns
 * true when the page's own link already names a key or scale.
 */
export function useSharedScale(
  value: Partial<SharedScale>,
  apply: (s: SharedScale) => void,
  skip?: () => boolean,
) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!skip?.()) {
      const s = readShared();
      if (s) apply(s);
    }
    setReady(true);
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { key, family, mode } = value;
  useEffect(() => {
    if (!ready) return;
    const part: Partial<SharedScale> = {};
    if (key !== undefined) part.key = key;
    if (family !== undefined) { part.family = family; part.mode = mode ?? 0; }
    writeShared(part);
  }, [ready, key, family, mode]);
}
