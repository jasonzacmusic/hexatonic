"use client";

/**
 * A keyboard for a two-triad pair: shape A's notes in blue, shape B's in
 * green, the parent note left out in red, and the chord sounding now in gold.
 * Gold and red keep their one meaning each; the two shape colours are only
 * ever used for "which of the two chords this note belongs to".
 *
 * It spans exactly the keys the ladder and the scale use, plus one white key
 * either side, and sizes its keys to the width it is given, so the note names
 * stay a readable size on a phone instead of shrinking with the drawing.
 */

import { useEffect, useRef, useState } from "react";
import { Note, notePretty, pc } from "@/lib/theory/note";

/** The two shape colours. Neither is gold or red; they differ in hue AND in
 *  lightness on the keys, so they stay apart for colour-blind players too. */
export const SHAPE_TONES = [
  { name: "blue", ink: "#8DBDEB", white: "#A7CBEE", black: "#3F78B2", text: "#0E2238" },
  { name: "green", ink: "#79CFAC", white: "#B5E6D0", black: "#2F8A68", text: "#0C271C" },
] as const;

const WHITE = new Set([0, 2, 4, 5, 7, 9, 11]);
/** Real black-key placement: fraction of a white key from the left edge of the
 *  white key it follows (C♯ sits left of the C–D seam, F♯ left of F–G, …). */
const BLACK_AT: Record<number, number> = { 1: 0.68, 3: 0.82, 6: 0.64, 8: 0.76, 10: 0.88 };
const isWhite = (m: number) => WHITE.has(((m % 12) + 12) % 12);

export default function PairKeyboard({
  shapes, removed, used, active,
}: {
  /** the notes of shape A and shape B */
  shapes: [Note[], Note[]];
  removed: Note | null;
  /** every MIDI note the exercises play — sets the range */
  used: number[];
  /** the keys sounding now */
  active: number[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  let lo = Math.min(...used);
  let hi = Math.max(...used);
  while (!isWhite(lo)) lo--;
  lo--; while (!isWhite(lo)) lo--;
  while (!isWhite(hi)) hi++;
  hi++; while (!isWhite(hi)) hi++;

  const whites: number[] = [];
  const blacks: { m: number; after: number }[] = [];
  for (let m = lo; m <= hi; m++) {
    if (isWhite(m)) whites.push(m);
    else blacks.push({ m, after: whites.length - 1 });
  }

  const W = width ? width / whites.length : 28;
  const H = Math.round(Math.min(150, Math.max(104, W * 3.9)));
  const BW = W * 0.6;
  const BH = H * 0.62;
  const felt = 6;
  /* Names only where a 13px label fits inside the key. */
  const labels = W >= 19;
  const blackLabels = BW >= 21;

  const shapeOf = (m: number): 0 | 1 | null => {
    const p = ((m % 12) + 12) % 12;
    if (shapes[0].some((n) => pc(n) === p)) return 0;
    if (shapes[1].some((n) => pc(n) === p)) return 1;
    return null;
  };
  const nameOf = (m: number) => {
    const p = ((m % 12) + 12) % 12;
    const n = [...shapes[0], ...shapes[1]].find((x) => pc(x) === p);
    return n ? notePretty(n) : null;
  };
  const removedPc = removed ? pc(removed) : -1;
  const isRemoved = (m: number) => ((m % 12) + 12) % 12 === removedPc;
  const on = new Set(active);

  const aria = `Keyboard. ${notePretty(shapes[0][0])} chord in blue: ${shapes[0].map(notePretty).join(" ")}. ` +
    `${notePretty(shapes[1][0])} chord in green: ${shapes[1].map(notePretty).join(" ")}.` +
    (removed ? ` ${notePretty(removed)} left out.` : "");

  return (
    <div ref={host} className="w-full">
      {width > 0 && (
        <svg width={width} height={H + felt + 2} role="img" aria-label={aria} className="block">
          <rect x={0} y={0} width={width} height={felt} rx={1} fill="#5A1519" />
          {whites.map((m, i) => {
            const s = shapeOf(m);
            const lit = on.has(m);
            const fill = lit ? "#C9A227" : s === null ? "#26221F" : SHAPE_TONES[s].white;
            const x = i * W;
            const name = nameOf(m);
            return (
              <g key={m}>
                <rect x={x + 0.5} y={felt} width={W - 1} height={H} rx={3} fill={fill}
                      stroke={isRemoved(m) ? "#E8666C" : "#0B0A09"} strokeWidth={isRemoved(m) ? 2.5 : 1} />
                {isRemoved(m) && !lit && (
                  <g stroke="#E8666C" strokeWidth={2.5} strokeLinecap="round">
                    <line x1={x + W * 0.3} y1={felt + H * 0.66} x2={x + W * 0.7} y2={felt + H * 0.86} />
                    <line x1={x + W * 0.7} y1={felt + H * 0.66} x2={x + W * 0.3} y2={felt + H * 0.86} />
                  </g>
                )}
                {labels && name && (
                  <text x={x + W / 2} y={felt + H - 11} textAnchor="middle" fontSize={13} fontWeight={700}
                        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
                        fill={lit ? "#231B05" : SHAPE_TONES[s!].text}>{name}</text>
                )}
              </g>
            );
          })}
          {blacks.map(({ m, after }) => {
            const s = shapeOf(m);
            const lit = on.has(m);
            const fill = lit ? "#C9A227" : s === null ? "#0F0E0D" : SHAPE_TONES[s].black;
            const x = after * W + (BLACK_AT[((m % 12) + 12) % 12] ?? 0.7) * W;
            const name = nameOf(m);
            return (
              <g key={m}>
                <rect x={x} y={felt} width={BW} height={BH} rx={2.5} fill={fill}
                      stroke={isRemoved(m) ? "#E8666C" : "#000"} strokeWidth={isRemoved(m) ? 2.5 : 1} />
                {isRemoved(m) && !lit && (
                  <line x1={x + BW * 0.22} y1={felt + BH * 0.6} x2={x + BW * 0.78} y2={felt + BH * 0.86}
                        stroke="#E8666C" strokeWidth={2.5} strokeLinecap="round" />
                )}
                {blackLabels && name && (
                  <text x={x + BW / 2} y={felt + BH - 9} textAnchor="middle" fontSize={13} fontWeight={700}
                        fontFamily="var(--font-plex-mono), ui-monospace, monospace"
                        fill={lit ? "#231B05" : "#F4EFE4"}>{name}</text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {!width && <div style={{ height: 118 }} aria-hidden="true" />}
    </div>
  );
}
