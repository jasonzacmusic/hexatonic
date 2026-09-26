"use client";

/**
 * One octave of keys showing two four-note chords that share no note, in two
 * colours: the first chord cream, the second sage. Neither colour is gold or
 * red — gold means "sounding now" and red means "the removed note", so a
 * resting picture wears neither.
 */

import { Note, notePretty, pc } from "@/lib/theory/note";

export const CHORD_A = "#F4EFE4";
export const CHORD_B = "#8FB8A8";

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK: { semi: number; after: number; offset: number }[] = [
  { semi: 1, after: 0, offset: 0.68 }, { semi: 3, after: 1, offset: 0.82 },
  { semi: 6, after: 3, offset: 0.64 }, { semi: 8, after: 4, offset: 0.76 },
  { semi: 10, after: 5, offset: 0.88 },
];

export default function TwoChordKeys({
  a, b, keyWidth = 24, height = 70,
}: { a: Note[]; b: Note[]; keyWidth?: number; height?: number }) {
  const A = new Set(a.map(pc));
  const B = new Set(b.map(pc));
  const W = keyWidth;
  const BW = W * 0.62;
  const BH = height * 0.62;
  const fillW = (p: number) => (A.has(p) ? CHORD_A : B.has(p) ? CHORD_B : "#2A2622");
  const fillB = (p: number) => (A.has(p) ? "#D8D0C1" : B.has(p) ? "#5F8C7C" : "#0E0D0C");
  return (
    <svg width={W * 7} height={height + 2} role="img" style={{ display: "block" }}
         aria-label={`First chord ${a.map(notePretty).join(" ")}; second chord ${b.map(notePretty).join(" ")}`}>
      {WHITE.map((s, i) => (
        <rect key={s} x={i * W + 0.5} y={0.5} width={W - 1} height={height} rx={2.5}
              fill={fillW(s)} stroke="#0B0A09" />
      ))}
      {BLACK.map(({ semi, after, offset }) => (
        <rect key={semi} x={after * W + offset * W} y={0.5} width={BW} height={BH} rx={2}
              fill={fillB(semi)} stroke="#000" />
      ))}
    </svg>
  );
}
